import express from "express";
const router = express.Router();

import { verifyApiPassword } from "../../middleware/verifyApiPassword.js";

import readingsRouter from "./readings.js";
import qualityRouter from "./quality.js";
import forecastRouter from "./forecast.js";

router.use("/readings", readingsRouter);
router.use("/quality", verifyApiPassword, qualityRouter);
router.use("/forecast", forecastRouter);

// GET

// POST

// PUT

// DELETE

export default router;
