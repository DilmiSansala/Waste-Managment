const mongoose = require("mongoose");
const moment = require("moment");
const SpecialPickup = require("../models/SpecialPickup");
const CollectionCenter = require("../models/Center");

const ALLOWED_STATUSES = new Set(["pending", "scheduled", "collected", "canceled"]);
const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

// POST /api/specialPickup
async function createSpecialPickup(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: "Database connection is not established." });
    }

    const { wasteType, quantity, collectionDate, collectionTime, collectionCenter } = req.body;

    if (!wasteType || quantity == null || !collectionDate || !collectionTime) {
      return res.status(400).json({ message: "All fields are required." });
    }

      // Convert local date to UTC
    const localDate = new Date(collectionDate);
    const utcDate = new Date(Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate()
    ));
    const doc = new SpecialPickup({
      resident: req.user.id,
      wasteType,
      quantity: Number(quantity),
      collectionCenter: collectionCenter || undefined,
      collectionDate: utcDate,
      collectionTime,
    });

    await doc.save();
    return res.status(201).json({ message: "Waste request created successfully." });
  } catch (error) {
    console.error("Error creating waste request:", error);
    return res.status(500).json({ message: "Error creating waste request.", error });
  }
}

// GET /api/specialPickup/my
async function getUserSpecialPickups(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: "Database connection is not established." });
    }

    const requests = await SpecialPickup.find({ resident: req.user.id })
      .sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching waste requests:", error);
    return res.status(500).json({ message: "Error fetching waste requests.", error });
  }
}

// GET /api/specialPickup/filter?filter=today|yesterday|week|month|upcoming
async function getRequestsByFilter(req, res) {
  const { filter } = req.query;
  const today = moment().startOf("day");
  const tomorrow = moment(today).add(1, "days");
  const yesterday = moment(today).subtract(1, "days");
  const weekStart = moment(today).startOf("week");
  const monthStart = moment(today).startOf("month");

  let dateFilter;

  switch (filter) {
    case "today":
      dateFilter = { collectionDate: { $gte: today.toDate(), $lt: tomorrow.toDate() } };
      break;
    case "yesterday":
      dateFilter = { collectionDate: { $gte: yesterday.toDate(), $lt: today.toDate() } };
      break;
    case "week":
      dateFilter = { collectionDate: { $gte: weekStart.toDate(), $lt: tomorrow.toDate() } };
      break;
    case "month":
      dateFilter = { collectionDate: { $gte: monthStart.toDate(), $lt: tomorrow.toDate() } };
      break;
    case "upcoming":
      dateFilter = { collectionDate: { $gte: tomorrow.toDate() } };
      break;
    default:
      return res.status(400).json({ message: "Invalid filter" });
  }

  try {
    const requests = await SpecialPickup.find(dateFilter).populate("resident");
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching requests", error });
  }
}

// PATCH /api/specialPickup/:id/collected
async function markAsCollected(req, res) {
  const { id } = req.params;
  try {
    const request = await SpecialPickup.findById(id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    request.status = "collected";
    await request.save();
    return res.status(200).json({ message: "Request marked as collected" });
  } catch (error) {
    return res.status(500).json({ message: "Error updating request status", error });
  }
}

// PATCH /api/specialPickup/:id/pending
async function markAsPending(req, res) {
  const { id } = req.params;
  try {
    const request = await SpecialPickup.findById(id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    request.status = "pending";
    await request.save();
    return res.status(200).json({ message: "Request marked as pending" });
  } catch (error) {
    return res.status(500).json({ message: "Error updating request status", error });
  }
}

// GET /api/specialPickup/all
async function getAllRequest(req, res) {
  try {
    const requests = await SpecialPickup.find();
    return res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching waste requests:", error);
    return res.status(500).json({ message: "Error fetching waste requests.", error });
  }
}

// GET /api/specialPickup/center/:centerId?on=YYYY-MM-DD&from=YYYY-MM-DD&to=YYYY-MM-DD&status=pending
async function getRequestsByCenter(req, res) {
  const { centerId } = req.params;
  const { on, from, to, status } = req.query;

  try {
    if (!centerId) {
      return res.status(400).json({ message: "Center ID is required." });
    }

    // Support string or ObjectId equality for collectionCenter
    const orList = [{ collectionCenter: centerId }];
    if (mongoose.isValidObjectId(centerId)) {
      orList.push({ collectionCenter: new mongoose.Types.ObjectId(centerId) });
    }

    const filter = { $or: orList };

    // Optional status filter
    if (typeof status === "string" && ALLOWED_STATUSES.has(status)) {
      filter.status = status;
    }

    // Date range helpers (UTC day windows)
    const addOneDayUTC = (d) => {
      const nd = new Date(d);
      nd.setUTCDate(nd.getUTCDate() + 1);
      return nd;
    };

    if (on) {
      const start = new Date(`${on}T00:00:00.000Z`);
      if (!isValidDate(start)) {
        return res.status(400).json({ message: "Invalid 'on' date. Use YYYY-MM-DD." });
      }
      filter.collectionDate = { $gte: start, $lt: addOneDayUTC(start) };
    } else if (from || to) {
      const range = {};
      if (from) {
        const s = new Date(`${from}T00:00:00.000Z`);
        if (!isValidDate(s)) return res.status(400).json({ message: "Invalid 'from' date. Use YYYY-MM-DD." });
        range.$gte = s;
      }
      if (to) {
        const e = new Date(`${to}T00:00:00.000Z`);
        if (!isValidDate(e)) return res.status(400).json({ message: "Invalid 'to' date. Use YYYY-MM-DD." });
        range.$lt = addOneDayUTC(e); // inclusive 'to' day
      }
      if (Object.keys(range).length) filter.collectionDate = range;
    }

    const requests = await SpecialPickup.find(filter).populate("resident");
    return res.status(200).json(Array.isArray(requests) ? requests : []);
  } catch (error) {
    console.error("Error fetching requests by center:", error);
    return res.status(500).json({ message: "Error fetching requests by center." });
  }
}

// DELETE /api/specialPickup/:id
async function deleteSpecialPickup(req, res) {
  try {
    const { id } = req.params;
    const doc = await SpecialPickup.findOneAndDelete({ _id: id, resident: req.user.id });
    if (!doc) return res.status(404).json({ message: "Special pickup request not found." });
    return res.status(200).json({ message: "Special pickup deleted successfully." });
  } catch (err) {
    console.error("Error deleting special pickup:", err);
    return res.status(500).json({ message: "Error deleting special pickup.", error: err });
  }
}

// PUT /api/specialPickup/:id
async function updateSpecialPickup(req, res) {
  try {
    const { id } = req.params;
    const { wasteType, quantity, collectionDate, collectionTime, status, collectionCenter } = req.body;

    const update = {};
    if (typeof wasteType !== "undefined") update.wasteType = wasteType;

    if (typeof quantity !== "undefined") {
      const qn = Number(quantity);
      if (!Number.isFinite(qn) || qn < 0) {
        return res.status(400).json({ message: "quantity must be a non-negative number" });
      }
      update.quantity = qn;
    }

    if (typeof collectionDate !== "undefined") update.collectionDate = collectionDate;
    if (typeof collectionTime !== "undefined") update.collectionTime = collectionTime;

    if (typeof status !== "undefined") {
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({ message: "Invalid status value." });
      }
      update.status = status;
    }

    if (typeof collectionCenter !== "undefined" && collectionCenter !== null && collectionCenter !== "") {
      if (!mongoose.isValidObjectId(collectionCenter)) {
        return res.status(400).json({ message: "Invalid collection center id." });
      }
      const validCenter = await CollectionCenter.findById(collectionCenter);
      if (!validCenter) {
        return res.status(400).json({ message: "Invalid collection center selected." });
      }
      update.collectionCenter = collectionCenter;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields provided to update." });
    }

    const updated = await SpecialPickup.findOneAndUpdate(
      { _id: id, resident: req.user.id }, // ownership
      update,
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Special pickup request not found." });
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating special pickup:", err);
    return res.status(500).json({ message: "Error updating special pickup.", error: err });
  }
}

module.exports = {
  createSpecialPickup,
  getUserSpecialPickups,
  getRequestsByFilter,
  markAsCollected,
  markAsPending,
  getAllRequest,
  getRequestsByCenter,
  deleteSpecialPickup,
  updateSpecialPickup,
};
