const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicleController");

// ---- Specific routes FIRST ----

// Create a new vehicle
router.post("/", vehicleController.createVehicle);

// Get all vehicles
router.get("/", vehicleController.getAllVehicles);

// NEW: Get vehicles by center (matches your frontend call)
router.get("/center/:centerId", vehicleController.getVehiclesByCenter);

// Legacy alias (if anything still calls this)
router.get("/getVehicles/:centerId", vehicleController.getVehiclesByCenter);

// ---- Param route LAST ----

// Get a vehicle by ID
router.get("/:id", vehicleController.getVehicleById);

// Update a vehicle by ID
router.put("/:id", vehicleController.updateVehicle);

// Delete a vehicle by ID
router.delete("/:id", vehicleController.deleteVehicle);

module.exports = router;
