import express from "express";
const router = express.Router();

import * as readingsController from "../../controllers/api/readingsController";

// GET

router.get("/", readingsController.getAll);
router.get("/range", readingsController.getTimeRange);

// POST

router.post("/", ...readingsController.postReading);

// PUT

router.put("/", ...readingsController.updateReading);

// DELETE

router.delete("/", ...readingsController.deleteReading);

export default router;
