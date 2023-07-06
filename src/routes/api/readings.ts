import express from "express";
const router = express.Router();

import { verifyApiPassword } from "../../middleware/verifyApiPassword.js";

import * as readingsController from "../../controllers/api/readingsController.js";
import { eventsHandler } from "../../controllers/api/eventsHandler.js";

// GET

router.get("/", readingsController.getAll);
router.get("/range", readingsController.getTimeRange);

router.get("/events", eventsHandler); // Server-sent events

// POST

router.post("/", verifyApiPassword, ...readingsController.postReading);

// PUT

router.put("/", verifyApiPassword, ...readingsController.updateReading);

// DELETE

router.delete("/", verifyApiPassword, ...readingsController.deleteReading);

export default router;
