import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { ReadingsController } from "../controllers/readings.controller.js";
import { readingsEventsController } from "../controllers/readingsEvents.controller.js";

const router = express.Router();

router.get("/", ReadingsController.getAll);
router.post("/", authenticate, ...ReadingsController.postReading);
router.put("/", authenticate, ...ReadingsController.upsertReading);
router.delete("/", authenticate, ...ReadingsController.deleteReading);

router.get("/events", readingsEventsController); // Server-sent events

router.get("/range", ReadingsController.getTimeRange);
router.get("/month/full", ...ReadingsController.getMonthFull);
router.get("/month/decimated", ...ReadingsController.getMonthDecimated);

router.get("/24h", ReadingsController.getLast24h);

export default router;
