// controllers/paymentController.js
const Payment = require("../models/Payment");
const WasteRequest = require("../models/WasteRequest");
const SpecialPickup = require("../models/SpecialPickup"); // ✅ add
let stripeClient = null;

const getStripe = () => {
  if (!stripeClient) {
    const Stripe = require("stripe");
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
};

// Controlled logger
const shouldLog = process.env.SHOW_STRIPE_LOGS === "true";
const log = (...args) => { if (shouldLog) console.log(...args); };
const warn = (...args) => { if (shouldLog) console.warn(...args); };

/* ----------------------------- helpers ------------------------------ */

// Find a request by id in either collection
async function getRequestById(id) {
  let doc = await WasteRequest.findById(id);
  if (doc) return { doc, kind: "normal" };

  doc = await SpecialPickup.findById(id);
  if (doc) return { doc, kind: "special" };

  return { doc: null, kind: null };
}

// Mark the corresponding collection row paid
async function markPaid(wasteRequestId, kind) {
  if (!wasteRequestId) return;
  if (kind === "special") {
    await SpecialPickup.updateMany(
      { _id: { $in: [wasteRequestId] } },
      { $set: { status: "payment complete" } }
    );
  } else {
    await WasteRequest.updateMany(
      { _id: { $in: [wasteRequestId] } },
      { $set: { status: "payment complete" } }
    );
  }
}

// one price table that covers normal + special
const pricePerType = {
  Glass: 15, Wood: 10, Hazardous: 60, Paper: 10, Metal: 20, Plastic: 30,
  Organic: 30, Electronics: 50,
  "Plastic - Special Pickup": 60, "Organic - Special Pickup": 60,
  "Metal - Special Pickup": 40, "Paper - Special Pickup": 20,
  "Glass - Special Pickup": 30, "Wood - Special Pickup": 20,
  "Electronics - Special Pickup": 100, "Hazardous - Special Pickup": 120,
};

/* --------------------------- create session -------------------------- */
// Create Stripe Checkout Session for a single request (normal or special)
exports.createCheckoutSession = async (req, res) => {
  const { residentId: residentIdFromBody, wasteRequestId } = req.body;

  try {
    const { doc, kind } = await getRequestById(wasteRequestId);
    if (!doc) return res.status(404).json({ message: "Waste request not found" });

    // Prefer resident stored on the request (satisfies Payment schema required: true)
    const residentId =
      (doc.resident && String(doc.resident)) || residentIdFromBody || null;

    const unitAmount = (pricePerType[doc.wasteType] || 0) * 100; // cents
    const quantity = Number(doc.quantity || 1);
    const currency = process.env.STRIPE_CURRENCY || "usd";

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `${kind === "special" ? "Special pickup" : "Waste collection"} - ${doc.wasteType}`,
            },
            unit_amount: unitAmount,
          },
          quantity,
        },
      ],
      metadata: {
        residentId,          // used in webhook/confirm to create Payment doc
        wasteRequestId,      // record to mark paid
        kind: kind || "normal",
      },
      success_url: `${process.env.CLIENT_URL}/payment?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment?status=cancelled`,
    });

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe session error:", error);
    return res.status(500).json({ message: "Failed to create checkout session" });
  }
};

/* ------------------------------ webhook ------------------------------ */
// Stripe webhook to finalize payment and update DB
exports.webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      req.body, // body is a Buffer from bodyParser.raw
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    log("Received Stripe webhook event:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // checkout.session completed path
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { residentId, wasteRequestId, kind } = session.metadata || {};
    log("checkout.session.completed metadata:", session.metadata);

    // Resolve resident if missing in metadata
    let resolvedResidentId = residentId;
    if (!resolvedResidentId && wasteRequestId) {
      try {
        const found = await getRequestById(wasteRequestId);
        if (found.doc?.resident) resolvedResidentId = String(found.doc.resident);
      } catch (err) {
        console.error("Failed to resolve residentId from request (webhook):", err);
      }
    }

    try {
      const amountTotal = session.amount_total ? session.amount_total / 100 : 0;

      await new Payment({
        resident: resolvedResidentId || residentId, // Payment schema requires this
        amount: amountTotal,
        wasteRequests: wasteRequestId ? [wasteRequestId] : [],
        status: "completed",
      }).save();
      log("Saved new Payment for session:", session.id);

      if (wasteRequestId) {
        await markPaid(wasteRequestId, kind);
        log("Marked paid:", wasteRequestId, kind);
      } else {
        warn("Webhook: no wasteRequestId in metadata; cannot update request status.");
      }
    } catch (err) {
      console.error("DB update after webhook failed:", err);
      // Still acknowledge to Stripe to avoid re-delivery storms
    }
  }

  // payment_intent.succeeded fallback path
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    log("payment_intent.succeeded for:", pi.id);
    try {
      const stripe = getStripe();
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: pi.id,
        limit: 1,
      });

      if (sessions?.data?.length) {
        const session = sessions.data[0];
        const { residentId, wasteRequestId, kind } = session.metadata || {};

        let resolvedResidentId = residentId;
        if (!resolvedResidentId && wasteRequestId) {
          try {
            const found = await getRequestById(wasteRequestId);
            if (found.doc?.resident) resolvedResidentId = String(found.doc.resident);
          } catch (err) {
            console.error("Resolve residentId (PI path) failed:", err);
          }
        }

        const amountTotal = pi.amount_received ? pi.amount_received / 100 : 0;

        await new Payment({
          resident: resolvedResidentId || residentId,
          amount: amountTotal,
          wasteRequests: wasteRequestId ? [wasteRequestId] : [],
          status: "completed",
        }).save();

        if (wasteRequestId) {
          await markPaid(wasteRequestId, kind);
          log("Marked paid via PI:", wasteRequestId, kind);
        }
      } else {
        warn("No checkout.session found for payment_intent", pi.id);
      }
    } catch (err) {
      console.error("Error handling payment_intent.succeeded:", err);
    }
  }

  res.json({ received: true });
};

/* ------------------------------ confirm ------------------------------ */
// Confirm checkout session without webhook
exports.confirmCheckoutSession = async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ message: "Missing sessionId" });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    log("Confirm session:", session.id, "metadata:", session.metadata);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
    const wasteRequestId = session.metadata?.wasteRequestId;
    const kind = session.metadata?.kind;

    let resolvedResidentId = session.metadata?.residentId;
    if (!resolvedResidentId && wasteRequestId) {
      try {
        const found = await getRequestById(wasteRequestId);
        if (found.doc?.resident) resolvedResidentId = String(found.doc.resident);
      } catch (err) {
        console.error("Resolve residentId (confirm) failed:", err);
      }
    }

    if (wasteRequestId) {
      await new Payment({
        resident: resolvedResidentId || null,
        amount: amountTotal,
        wasteRequests: [wasteRequestId],
        status: "completed",
      }).save();
      log("Payment saved via confirm for:", wasteRequestId);

      await markPaid(wasteRequestId, kind);
      log("Request updated to payment complete:", wasteRequestId, kind);
    } else {
      warn("Confirm: no wasteRequestId in session metadata; unable to link payment");
    }

    return res.status(200).json({ message: "Payment confirmed", session });
  } catch (error) {
    console.error("Confirm session failed:", error);
    return res.status(500).json({ message: "Failed to confirm session" });
  }
};

/* ----------------------- legacy/manual endpoints --------------------- */
// (Kept identical to avoid breaking existing flows)
// NOTE: this one only updates WasteRequest like before.
exports.processPayment = async (req, res) => {
  const { residentId, amount, wasteRequestIds } = req.body;
  try {
    const newPayment = new Payment({
      resident: residentId,
      amount,
      wasteRequests: wasteRequestIds,
      status: "completed",
    });
    await newPayment.save();
    await WasteRequest.updateMany(
      { _id: { $in: wasteRequestIds } },
      { $set: { status: "payment complete" } }
    );
    res
      .status(201)
      .json({ message: "Payment processed and requests updated successfully." });
  } catch (error) {
    console.error("Payment processing error:", error);
    res
      .status(500)
      .json({ message: "Payment processing failed", error: error.message });
  }
};

// Manual approve → try normal first, then special
exports.approvePayment = async (req, res) => {
  const { wasteRequestId, approverId } = req.body;
  if (!wasteRequestId) {
    return res.status(400).json({ message: "Missing wasteRequestId" });
  }
  try {
    let wr = await WasteRequest.findById(wasteRequestId).lean();
    let kind = "normal";

    if (!wr) {
      wr = await SpecialPickup.findById(wasteRequestId).lean();
      kind = wr ? "special" : null;
    }
    if (!wr) return res.status(404).json({ message: "Request not found" });

    const amount = wr.amount || 0;

    const newPayment = new Payment({
      resident: wr.resident || null,
      amount,
      wasteRequests: [wasteRequestId],
      status: "completed",
    });
    await newPayment.save();

    await markPaid(wasteRequestId, kind || "normal");

    log(`Approved payment for ${wasteRequestId} by ${approverId || "system"}`);
    return res
      .status(200)
      .json({ message: "Request marked as paid", paymentId: newPayment._id });
  } catch (err) {
    console.error("approvePayment error:", err);
    return res.status(500).json({ message: "Failed to approve payment" });
  }
};
