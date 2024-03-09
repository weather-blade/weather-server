import { checkSchema, validationResult } from 'express-validator';
import { ReadingsEventsService } from '../services/readingsEvents.service.js';
import { ReadingsValidation } from '../validations/readings.validation.js';
import { redisClient } from '../db/redis.js';
import { UtilFns } from '../utils/functions.js';
import { AppError } from '../exceptions/AppError.js';
import { ReadingsService } from '../services/readings.service.js';
import type { Request, Response, NextFunction } from 'express';

const WEEK_SECONDS = 7 * 24 * 60 * 60;

export class ReadingsController {
	// GET

	public static getOne = [
		checkSchema(ReadingsValidation.readingId),

		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const errors = validationResult(req);
				if (!errors.isEmpty()) {
					throw new AppError(400, 'Bad request', errors.array());
				}

				const id = parseInt(req.params.id);

				const reading = await ReadingsService.getById(id);

				if (reading === null) {
					throw new AppError(404, 'Reading not found');
				}

				res.json(reading);
			} catch (error) {
				next(error);
			}
		},
	];

	public static getTimeRange = [
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const startTime = new Date(String(req.query.start));
				const endTime = new Date(String(req.query.end));

				if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
					throw new AppError(400, 'Bad request (use ISO 8601 time format)');
				}

				const readings = await ReadingsService.getTimeRange(startTime, endTime);

				res.json(readings);
			} catch (error) {
				next(error);
			}
		},
	];

	public static getMonthFull = [
		checkSchema(ReadingsValidation.yearMonth),

		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const errors = validationResult(req);
				if (!errors.isEmpty()) {
					throw new AppError(400, 'Bad request (wrong year / month format)', errors.array());
				}

				const year = parseInt(req.query.year as string);
				const month = parseInt(req.query.month as string);

				const { firstDay, lastDay } = UtilFns.getFirstLastDay(year, month);

				if (isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
					throw new AppError(400, 'Bad request (wrong year / month format)');
				}

				const cacheName = `month-full-${year}-${month}`;
				const cacheResults = await redisClient.get(cacheName);

				if (Date.now() > lastDay.getTime()) {
					// cache in browser for 7 days if the month already passed
					// (because readings from previous months shouldn't change)
					res.set('Cache-Control', `max-age=${WEEK_SECONDS}`);
				}

				if (cacheResults) {
					const readings = JSON.parse(cacheResults);
					return res.json(readings);
				}

				const readings = await ReadingsService.getTimeRange(firstDay, lastDay);

				res.json(readings);

				redisClient.set(cacheName, JSON.stringify(readings), {
					EX: WEEK_SECONDS,
				});
			} catch (error) {
				next(error);
			}
		},
	];

	public static getMonthDecimated = [
		checkSchema(ReadingsValidation.yearMonth),

		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const errors = validationResult(req);
				if (!errors.isEmpty()) {
					throw new AppError(400, 'Bad request (wrong year / month format)', errors.array());
				}

				const year = parseInt(req.query.year as string);
				const month = parseInt(req.query.month as string);

				const { firstDay, lastDay } = UtilFns.getFirstLastDay(year, month);

				if (isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
					throw new AppError(400, 'Bad request (wrong year / month format)');
				}

				const cacheName = `month-decimated-${year}-${month}`;
				const cacheResults = await redisClient.get(cacheName);

				if (Date.now() > lastDay.getTime()) {
					// cache in browser for 7 days if the month already passed
					// (because readings from previous months shouldn't change)
					res.set('Cache-Control', `max-age=${WEEK_SECONDS}`);
				}

				if (cacheResults) {
					const readings = JSON.parse(cacheResults);
					return res.json(readings);
				}

				const readings = await ReadingsService.getTimeRangeDecimated(firstDay, lastDay);

				res.json(readings);

				redisClient.set(cacheName, JSON.stringify(readings), {
					EX: WEEK_SECONDS,
				});
			} catch (error) {
				next(error);
			}
		},
	];

	public static getLast24h = [
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const cacheResults = await redisClient.get('readings24h');

				if (cacheResults) {
					const readings = JSON.parse(cacheResults);
					return res.json(readings);
				}

				const readings = await ReadingsService.getLast24h();

				res.json(readings);

				redisClient.set('readings24h', JSON.stringify(readings), {
					EX: 360,
					NX: true,
				});
			} catch (error) {
				next(error);
			}
		},
	];

	// POST

	public static postReading = [
		checkSchema(ReadingsValidation.reading),
		checkSchema(ReadingsValidation.readingDate),

		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const errors = validationResult(req);

				if (!errors.isEmpty()) {
					throw new AppError(400, 'Bad request', errors.array());
				}

				const temperature_BMP = parseFloat(req.body.temperature_BMP);
				const temperature_DHT = parseFloat(req.body.temperature_DHT);
				const pressure_BMP = parseFloat(req.body.pressure_BMP);
				const humidity_DHT = parseFloat(req.body.humidity_DHT);

				const createdAt = req.body.createdAt ? new Date(req.body.createdAt) : undefined;

				const reading = await ReadingsService.createReading(
					temperature_BMP,
					temperature_DHT,
					pressure_BMP,
					humidity_DHT,
					createdAt
				);

				if (req.headers['short'] === 'true') {
					res.sendStatus(200); // end response only with 200 ok
				} else {
					res.json(reading);
				}

				ReadingsEventsService.sendReadingToAll(reading);

				// invalidate today's cache
				redisClient.del('readings24h');

				// invalidate either given month's cache or current month's cache
				const year = reading.createdAt.getUTCFullYear();
				const month = reading.createdAt.getUTCMonth();
				const cacheNameFull = `month-full-${year}-${month}`;
				const cacheNameDecimated = `month-decimated-${year}-${month}`;
				redisClient.del(cacheNameFull);
				redisClient.del(cacheNameDecimated);
			} catch (error) {
				next(error);
			}
		},
	];

	// PUT

	public static upsertReading = [
		checkSchema(ReadingsValidation.readingId),
		checkSchema(ReadingsValidation.readingDateRequired),
		checkSchema(ReadingsValidation.reading),

		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const errors = validationResult(req);

				if (!errors.isEmpty()) {
					throw new AppError(400, 'Bad request', errors.array());
				}

				const id = parseInt(req.params.id);
				const temperature_BMP = parseFloat(req.body.temperature_BMP);
				const temperature_DHT = parseFloat(req.body.temperature_DHT);
				const pressure_BMP = parseFloat(req.body.pressure_BMP);
				const humidity_DHT = parseFloat(req.body.humidity_DHT);
				const createdAt = new Date(req.body.createdAt);

				const reading = await ReadingsService.upsertReading(
					id,
					temperature_BMP,
					temperature_DHT,
					pressure_BMP,
					humidity_DHT,
					createdAt
				);

				res.json(reading);
			} catch (error) {
				next(error);
			}
		},
	];

	// DELETE

	public static deleteReading = [
		checkSchema(ReadingsValidation.readingId),

		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const errors = validationResult(req);

				if (!errors.isEmpty()) {
					throw new AppError(400, 'Bad request', errors.array());
				}

				next();
			} catch (error) {
				next(error);
			}
		},

		checkSchema(ReadingsValidation.readingIdExists),

		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const errors = validationResult(req);

				if (!errors.isEmpty()) {
					throw new AppError(404, 'Reading not found', errors.array());
				}

				const id = parseInt(req.params.id);

				const deletedReading = await ReadingsService.deleteById(id);

				res.json(deletedReading);
			} catch (error) {
				next(error);
			}
		},
	];
}
