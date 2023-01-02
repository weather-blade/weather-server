import express from "express";
const router = express.Router();

import * as qualityControllers from "../../controllers/api/qualityController";

// GET

router.get("/", qualityControllers.getAll);

// POST

router.post("/", ...qualityControllers.postQuality);

// PUT

router.put("/", ...qualityControllers.updateQuality);

// DELETE

router.delete("/", ...qualityControllers.deleteQuality);

export default router;
