import express from "express";
import { verifyApiPassword } from "../middleware/verifyApiPassword.js";
import * as readingsController from "../controllers/readings.controller.js";
import { readingsEventsController } from "../controllers/readingsEvents.controller.js";

const router = express.Router();

router.get("/", readingsController.getAll);
router.post("/", verifyApiPassword, ...readingsController.postReading);
router.put("/", verifyApiPassword, ...readingsController.updateReading);
router.delete("/", verifyApiPassword, ...readingsController.deleteReading);

router.get("/events", readingsEventsController); // Server-sent events

router.get("/range", readingsController.getTimeRange);

export default router;
