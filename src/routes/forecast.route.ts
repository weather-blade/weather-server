import express from "express";
import { ForecastController } from "../controllers/forecast.controller.js";

const router = express.Router();

router.get("/", ForecastController.getForecastSunrise);

export default router;
