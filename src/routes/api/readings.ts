import express from "express";
const router = express.Router();

import * as readingsController from "../../controllers/api/readingsController";

// GET

router.get("/", readingsController.getAll);
router.get("/range", readingsController.getTimeRange);

// POST

// PUT

// DELETE

export default router;
