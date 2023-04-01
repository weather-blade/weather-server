import express from "express";
const router = express.Router();

import { verifyApiPassword } from "../../middleware/verifyApiPassword";

import readingsRouter from "./readings";
import qualityRouter from "./quality";
import forecastRouter from "./forecast";

router.use("/readings", readingsRouter);
router.use("/quality", verifyApiPassword, qualityRouter);
router.use("/forecast", forecastRouter);

// GET

// POST

// PUT

// DELETE

export default router;
