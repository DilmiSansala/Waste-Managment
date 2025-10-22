const {
  createSpecialPickup,
  getRequestsByCenter,
} = require("../controllers/specialPickupController");

const SpecialPickup = require("../models/SpecialPickup");
const CollectionCenter = require("../models/Center");

jest.mock("mongoose", () => {
  const actual = jest.requireActual("mongoose");
  return { ...actual, connection: { readyState: 1 } };
});

jest.mock("../models/SpecialPickup");
jest.mock("../models/Center");

describe("specialPickupController", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a special pickup successfully with valid data", async () => {
    const mockDoc = { save: jest.fn().mockResolvedValue({ _id: "sp1" }) };
    SpecialPickup.mockImplementation(() => mockDoc);

    const req = {
      body: {
        wasteType: "Electronics - Special Pickup",
        quantity: 12,
        collectionDate: "10/25/2025",
        collectionTime: "10:00 – 11:00",
        collectionCenter: "center123",
      },
      user: { id: "resident001" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createSpecialPickup(req, res);

    const ctorArgs = SpecialPickup.mock.calls[0][0];
    expect(ctorArgs).toMatchObject({
      resident: "resident001",
      wasteType: "Electronics - Special Pickup",
      quantity: 12,
      collectionTime: "10:00 – 11:00",
      collectionCenter: "center123",
    });
    expect(ctorArgs.collectionDate).toBeDefined();
    expect(mockDoc.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    // ⬇ matches your controller’s message
    expect(res.json).toHaveBeenCalledWith({
      message: "Waste request created successfully.",
    });
  });

  it("does not fail if center is invalid (no center validation in controller)", async () => {
    const mockDoc = { save: jest.fn().mockResolvedValue({ _id: "spX" }) };
    SpecialPickup.mockImplementation(() => mockDoc);

    const req = {
      body: {
        wasteType: "Plastic - Special Pickup",
        quantity: 5,
        collectionDate: "10/25/2025",
        collectionTime: "08:00 – 09:00",
        collectionCenter: "invalidCenter",
      },
      user: { id: "resident001" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createSpecialPickup(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Waste request created successfully.",
    });
  });

  it("returns 400 when required fields are missing", async () => {
    const req = {
      body: {
        wasteType: "Wood - Special Pickup",
        quantity: 10,
        collectionDate: "", // missing
        collectionTime: "14:00 – 15:00",
        collectionCenter: "center123",
      },
      user: { id: "resident001" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createSpecialPickup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    // ⬇ matches your controller’s message
    expect(res.json).toHaveBeenCalledWith({
      message: "All fields are required.",
    });
  });

  it("returns 500 on server error during creation", async () => {
    const mockDoc = { save: jest.fn().mockRejectedValue(new Error("DB exploded")) };
    SpecialPickup.mockImplementation(() => mockDoc);

    const req = {
      body: {
        wasteType: "Metal - Special Pickup",
        quantity: 7,
        collectionDate: "10/25/2025",
        collectionTime: "11:00 – 12:00",
        collectionCenter: "center123",
      },
      user: { id: "resident001" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createSpecialPickup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    // ⬇ matches your controller’s error message
    expect(res.json).toHaveBeenCalledWith({
      message: "Error creating waste request.",
      error: expect.any(Error),
    });
  });

  it("lists special pickups for a center and date (non-empty)", async () => {
    const req = { params: { centerId: "center123" }, query: { on: "2025-10-25" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    const mockList = [
      {
        _id: "sp1",
        resident: { name: "Dilneth", email: "d@example.com" },
        wasteType: "Plastic - Special Pickup",
        quantity: 6,
        collectionTime: "16:06",
        status: "scheduled",
      },
      {
        _id: "sp2",
        resident: { name: "Kavi", email: "k@example.com" },
        wasteType: "Wood - Special Pickup",
        quantity: 9,
        collectionTime: "13:00",
        status: "scheduled",
      },
    ];

    // ⬇ Make the query a THENABLE like Mongoose does:
    const queryThenable = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockList),
      then: (resolve) => resolve(mockList), // allows: await SpecialPickup.find(...).populate(...)
    };
    SpecialPickup.find.mockReturnValue(queryThenable);

    await getRequestsByCenter(req, res);

    expect(SpecialPickup.find).toHaveBeenCalled(); // don’t assert exact filter shape
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockList);
  });

  it("returns [] when no special pickups exist for center/date", async () => {
    const req = { params: { centerId: "center123" }, query: { on: "2025-10-26" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    const queryThenable = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      then: (resolve) => resolve([]),
    };
    SpecialPickup.find.mockReturnValue(queryThenable);

    await getRequestsByCenter(req, res);

    expect(SpecialPickup.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });
});
