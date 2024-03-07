import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { ReadingsController } from '../controllers/readings.controller.js';
import { readingsEventsController } from '../controllers/readingsEvents.controller.js';

const router = express.Router();

router.get('/:id', ...ReadingsController.getOne);
router.post('/', authenticate, ...ReadingsController.postReading);
router.put('/:id', authenticate, ...ReadingsController.upsertReading);
router.delete('/:id', authenticate, ...ReadingsController.deleteReading);

router.get('/events', readingsEventsController); // Server-sent events

router.get('/range', ReadingsController.getTimeRange);
router.get('/month/full', ...ReadingsController.getMonthFull);
router.get('/month/decimated', ...ReadingsController.getMonthDecimated);

router.get('/24h', ReadingsController.getLast24h);

export default router;
