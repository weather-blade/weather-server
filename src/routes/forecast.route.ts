import express from "express";
import { ForecastController } from "../controllers/forecast.controller.js";
import { PushController } from "../controllers/push.controller.js";

const router = express.Router();

router.get("/", ForecastController.getForecastSunrise);
router.get("/notification", ForecastController.getNotification);

router.get("/push/vapidPublicKey", PushController.getPublicKey);
router.post("/push/subscribe", ...PushController.subscribe);
router.post("/push/trigger", PushController.sendPush);

export default router;
