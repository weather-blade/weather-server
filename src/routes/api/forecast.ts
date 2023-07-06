import express from "express";
const router = express.Router();

import * as forecastController from "../../controllers/api/forecastController.js";

// GET

router.get("/", forecastController.getForecast);

// POST

// PUT

// DELETE

export default router;
