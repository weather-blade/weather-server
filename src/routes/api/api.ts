import express from "express";
const router = express.Router();

import { verifyApiPassword } from "../../middleware/verifyApiPassword";

import readingsRouter from "./readings";
import qualityRouter from "./quality";

router.use("/readings", readingsRouter);
router.use("/quality", verifyApiPassword, qualityRouter);

// GET

// POST

// PUT

// DELETE

export default router;
