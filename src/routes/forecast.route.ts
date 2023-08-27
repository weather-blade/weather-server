import express from "express";
import * as forecastController from "../controllers/forecast.controller.js";

const router = express.Router();

router.get("/", forecastController.getForecastSunrise);

export default router;
