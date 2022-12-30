import express from "express";
const router = express.Router();

import readingsRouter from "./readings";
import qualityRouter from "./quality";

router.use("/readings", readingsRouter);
router.use("/quality", qualityRouter);

// GET

// POST

// PUT

// DELETE

export default router;
