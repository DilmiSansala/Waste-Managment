// tests/paymentController.test.js
const { createCheckoutSession, processPayment, approvePayment } =
  require('../controllers/paymentController');

// --- Explicit model mocks ---
// Payment is a constructor used with `new`
jest.mock('../models/Payment', () => jest.fn());

// Your controller touches BOTH SpecialPickup (for checkout) and WasteRequest (for marking paid)
jest.mock('../models/SpecialPickup', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock('../models/WasteRequest', () => ({
  findById: jest.fn(),
  updateMany: jest.fn(),
}));

const Payment = require('../models/Payment');
const SpecialPickup = require('../models/SpecialPickup');
const WasteRequest = require('../models/WasteRequest');

// --- Stripe mock ---
const mockStripeCreate   = jest.fn();
const mockStripeRetrieve = jest.fn();
const mockStripeWebhooks = { constructEvent: jest.fn() };

jest.mock('stripe', () => {
  return jest.fn(() => ({
    checkout: {
      sessions: {
        create: mockStripeCreate,
        retrieve: mockStripeRetrieve,
        list: jest.fn(),
      },
    },
    webhooks: mockStripeWebhooks,
  }));
});

// --- Env ---
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.CLIENT_URL        = 'http://localhost:3000';
process.env.STRIPE_CURRENCY   = 'usd';
process.env.NODE_ENV          = 'test';

// --- Helpers ---
const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json   = jest.fn(() => res);
  return res;
};

describe('paymentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('returns 200 on success', async () => {
      // Your controller uses SpecialPickup under the hood for getRequestById
      SpecialPickup.findById.mockResolvedValue({
        _id: 'wr1',
        wasteType: 'Plastic',
        quantity: 2,
      });

      const mockSession = { id: 'sess_123', url: 'https://stripe.com/mocksession' };
      mockStripeCreate.mockResolvedValue(mockSession);

      const req = { body: { residentId: 'res1', wasteRequestId: 'wr1' } };
      const res = mockRes();

      await createCheckoutSession(req, res);

      expect(SpecialPickup.findById).toHaveBeenCalledWith('wr1');
      expect(mockStripeCreate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: 'sess_123', url: 'https://stripe.com/mocksession' });
    });

    it('returns 404 when special pickup / request is missing', async () => {
      SpecialPickup.findById.mockResolvedValue(null);

      const req = { body: { residentId: 'res1', wasteRequestId: 'invalid' } };
      const res = mockRes();

      await createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Waste request not found' });
    });

    it('returns 500 when Stripe creation fails', async () => {
      SpecialPickup.findById.mockResolvedValue({ _id: 'wr1', wasteType: 'Plastic', quantity: 1 });
      mockStripeCreate.mockRejectedValue(new Error('Stripe error'));

      const req = { body: { residentId: 'res1', wasteRequestId: 'wr1' } };
      const res = mockRes();

      await createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to create checkout session' });
    });
  });

  describe('processPayment', () => {
    it('returns 201 on success and updates requests', async () => {
      Payment.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true),
      }));
      // Your controller sets { $set: { status: 'payment complete' } }
      WasteRequest.updateMany.mockResolvedValue({ acknowledged: true });

      const req = { body: { residentId: 'r1', amount: 100, wasteRequestIds: ['wr1', 'wr2'] } };
      const res = mockRes();

      await processPayment(req, res);

      expect(Payment).toHaveBeenCalledWith({
        resident: 'r1',
        amount: 100,
        wasteRequests: ['wr1', 'wr2'],
        status: 'completed',
      });
      expect(WasteRequest.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ['wr1', 'wr2'] } },
        { $set: { status: 'payment complete' } }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Payment processed and requests updated successfully.',
      });
    });

    // If you keep no validation in controller, expect 500. If you add validation (see section B),
    // change the expected status to 400 accordingly.
    it('returns 400 when residentId is missing (if validation added)', async () => {
      const req = { body: { amount: 50, wasteRequestIds: ['wr1'] } };
      const res = mockRes();

      await processPayment(req, res);

      // If you don't add validation, swap 400->500 and message accordingly.
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'residentId, amount, and wasteRequestIds are required',
      });
    });

    it('returns 400 when amount is non-positive (if validation added)', async () => {
      const req = { body: { residentId: 'r1', amount: 0, wasteRequestIds: ['wr1'] } };
      const res = mockRes();

      await processPayment(req, res);

      // If you don't add validation, swap 400->500 and message accordingly.
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'residentId, amount, and wasteRequestIds are required',
      });
    });

    it('returns 500 when saving payment fails', async () => {
      Payment.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('DB Error')),
      }));

      const req = { body: { residentId: 'r1', amount: 100, wasteRequestIds: ['wr1'] } };
      const res = mockRes();

      await processPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Payment processing failed',
        error: 'DB Error',
      });
    });
  });

  describe('approvePayment', () => {
    it('returns 200 on approval success', async () => {
      // Mock chainable .lean()
      WasteRequest.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'wr1', resident: 'r1', amount: 50 }),
      });

      Payment.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'p1' }) }));
      WasteRequest.updateMany.mockResolvedValue({ acknowledged: true });

      const req = { body: { wasteRequestId: 'wr1', approverId: 'admin1' } };
      const res = mockRes();

      await approvePayment(req, res);

      expect(WasteRequest.findById).toHaveBeenCalledWith('wr1');
      expect(WasteRequest.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ['wr1'] } },
        { $set: { status: 'payment complete' } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Request marked as paid',
        paymentId: expect.anything(),
      });
    });

    it('returns 404 when waste request is not found', async () => {
      WasteRequest.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const req = { body: { wasteRequestId: 'notfound' } };
      const res = mockRes();

      await approvePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'WasteRequest not found' });
    });

    it('returns 400 when wasteRequestId is missing', async () => {
      const req = { body: {} };
      const res = mockRes();

      await approvePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing wasteRequestId' });
    });
  });
});
