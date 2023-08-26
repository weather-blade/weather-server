import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as readingsController from "../controllers/readings.controller.js";
import { readingsEventsController } from "../controllers/readingsEvents.controller.js";

const router = express.Router();

router.get("/", readingsController.getAll);
router.post("/", authenticate, ...readingsController.postReading);
router.put("/", authenticate, ...readingsController.upsertReading);
router.delete("/", authenticate, ...readingsController.deleteReading);

router.get("/events", readingsEventsController); // Server-sent events

router.get("/range", readingsController.getTimeRange);

router.get("/24h", readingsController.getLast24h);

export default router;
