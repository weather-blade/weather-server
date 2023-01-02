import express from "express";
const router = express.Router();

import * as qualityControllers from "../../controllers/api/qualityController";

// GET

router.get("/", qualityControllers.getAll);

// POST

// PUT

// DELETE

export default router;
