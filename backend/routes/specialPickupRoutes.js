const express = require("express");
const router = express.Router();
const specialWasteRequestController = require("../controllers/specialPickupController");

const { protect } = require("../middleware/authMiddleware");

// Protected routes
router.post("/", protect, specialWasteRequestController.createWasteRequest);
router.get("/my", protect, specialWasteRequestController.getUserWasteRequests);

router.get("/requests", specialWasteRequestController.getRequestsByFilter);
router.put("/requests/:id/collected", specialWasteRequestController.markAsCollected);
router.put("/requests/:id/pending", specialWasteRequestController.markAsPending);

router.get("/filter", specialWasteRequestController.getRequestsByFilter);
router.put("/:id/collected", specialWasteRequestController.markAsCollected);
router.put("/:id/pending", specialWasteRequestController.markAsPending);
router.get("/", specialWasteRequestController.getAllRequest);

router.get("/byCenter/:centerId", specialWasteRequestController.getRequestsByCenter);

module.exports = router; // Make sure to export the router
