const express = require("express");
const router = express.Router();
const sp = require("../controllers/specialPickupController");
const { protect } = require("../middleware/authMiddleware");

// ----- Fixed paths FIRST -----
router.post("/", protect, sp.createSpecialPickup);
router.get("/my", protect, sp.getUserSpecialPickups);

// Optional: list all
router.get("/", sp.getAllRequest);

// ----- Param routes LAST -----
router.get("/byCenter/:centerId", sp.getRequestsByCenter);
router.get("/getByCenter/:centerId", sp.getRequestsByCenter); 
router.put("/:id/collected", sp.markAsCollected);
router.put("/:id/pending", sp.markAsPending);
router.put("/:id", protect, sp.updateSpecialPickup);
router.delete("/:id", protect, sp.deleteSpecialPickup);

module.exports = router;
