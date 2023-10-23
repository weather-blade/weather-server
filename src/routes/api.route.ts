import express from 'express';
import readingsRouter from '../routes/readings.route.js';
import forecastRouter from '../routes/forecast.route.js';

const router = express.Router();

router.use('/readings', readingsRouter);
router.use('/forecast', forecastRouter);

export default router;
