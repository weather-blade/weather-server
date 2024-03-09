import { checkSchema, validationResult } from 'express-validator';
import { prisma } from '../db/prisma.js';
import { ReadingEventsController } from '../controllers/readingsEvents.controller.js';
import { ReadingsValidation } from '../validations/readings.validation.js';
import { redisClient } from '../db/redis.js';
import { UtilFns } from '../utils/functions.js';
import { lttb } from '../utils/lttb.js';
import { AppError } from '../exceptions/AppError.js';
import type { Request, Response, NextFunction } from 'express';

const WEEK_SECONDS = 604800;

export class ReadingsController {
	// GET

	public static getOne = [
		checkSchema(ReadingsValidation.readingId),

		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const id = parseInt(req.params.id);

				const reading = await prisma.readings.findUnique({
					where: {
						id: id,
					},
				});

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

				const readings = await prisma.readings.findMany({
					where: {
						createdAt: {
							gte: startTime,
							lte: endTime,
						},
					},
					orderBy: { createdAt: 'desc' },
				});

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
					throw new AppError(400, 'Bad request (wrong year / month format)', errors);
				}

				const year = parseInt(req.query.year as string);
				const month = parseInt(req.query.month as string);

				const { firstDay, lastDay } = UtilFns.getFirstLastDay(year, month);

				if (isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
					throw new AppError(400, 'Bad request (wrong year / month format)');
				}

				const cacheName = `month-full-${firstDay.getUTCFullYear()}-${firstDay.getUTCMonth()}`;
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

				const readings = await prisma.readings.findMany({
					where: {
						createdAt: {
							gte: firstDay,
							lte: lastDay,
						},
					},
					orderBy: { createdAt: 'desc' },
				});

				res.json(readings);

				redisClient.set(cacheName, JSON.stringify(readings), {
					EX: WEEK_SECONDS, // expire after 7 days
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
					throw new AppError(400, 'Bad request (wrong year / month format)', errors);
				}

				const year = parseInt(req.query.year as string);
				const month = parseInt(req.query.month as string);

				const { firstDay, lastDay } = UtilFns.getFirstLastDay(year, month);

				if (isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
					throw new AppError(400, 'Bad request (wrong year / month format)');
				}

				const cacheName = `month-decimated-${firstDay.getUTCFullYear()}-${firstDay.getUTCMonth()}`;
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

				const readings = await prisma.readings.findMany({
					where: {
						createdAt: {
							gte: firstDay,
							lte: lastDay,
						},
					},
					orderBy: { createdAt: 'desc' },
				});

				// lttb requires arrays of x and y value
				const temperature_BMP_Full = readings.map<[number, number]>((reading) => {
					return [reading.createdAt.getTime(), reading.temperature_BMP];
				});
				const temperature_DHT_Full = readings.map<[number, number]>((reading) => {
					return [reading.createdAt.getTime(), reading.temperature_DHT];
				});
				const humidity_DHT_Full = readings.map<[number, number]>((reading) => {
					return [reading.createdAt.getTime(), reading.humidity_DHT];
				});
				const pressure_BMP_Full = readings.map<[number, number]>((reading) => {
					return [reading.createdAt.getTime(), reading.pressure_BMP];
				});

				// Usually, there is ~8000 readings per month.
				// With that many points, the browser starts to lag when rendering the chart.
				// 1000 readings seems to be a nice compromise between browser lag and data resolution.
				const DONWSAMPLED_COUNT = 1000;
				const temperature_BMP_Trimmed = lttb(temperature_BMP_Full, DONWSAMPLED_COUNT);
				const temperature_DHT_Trimmed = lttb(temperature_DHT_Full, DONWSAMPLED_COUNT);
				const humidity_DHT_Trimmed = lttb(humidity_DHT_Full, DONWSAMPLED_COUNT);
				const pressure_BMP_Trimmed = lttb(pressure_BMP_Full, DONWSAMPLED_COUNT);

				// You can downsample only 1 X and Y value at a time.
				// Lttb will select points from different dates (X) from each dataset.
				// If you save the results into the same time point (X), some values will then be slightly shifted.
				// The alternative is to use separate X axis for each dataset. But then the chart tooltip won't work properly...
				const trimmedReadings = temperature_BMP_Trimmed.map((_, i) => {
					return {
						id: i,
						createdAt: temperature_BMP_Trimmed[i][0],

						temperature_BMP: temperature_BMP_Trimmed[i][1],
						temperature_DHT: temperature_DHT_Trimmed[i][1],
						humidity_DHT: humidity_DHT_Trimmed[i][1],
						pressure_BMP: pressure_BMP_Trimmed[i][1],
					};
				});

				res.json(trimmedReadings);

				redisClient.set(cacheName, JSON.stringify(trimmedReadings), {
					EX: WEEK_SECONDS, // expire after 7 days
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
					res.json(readings);
				} else {
					const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // from 24 hours ago (miliseconds)
					const endTime = new Date(); // up until now

					const readings = await prisma.readings.findMany({
						where: {
							createdAt: {
								gte: startTime,
								lte: endTime,
							},
						},
						orderBy: { createdAt: 'desc' },
					});

					res.json(readings);

					redisClient.set('readings24h', JSON.stringify(readings), {
						EX: 360, // expire after 6 minutes
						NX: true,
					});
				}
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
					throw new AppError(400, 'Bad request', errors);
				}

				const temperature_BMP = parseFloat(req.body.temperature_BMP);
				const temperature_DHT = parseFloat(req.body.temperature_DHT);
				const pressure_BMP = parseFloat(req.body.pressure_BMP);
				const humidity_DHT = parseFloat(req.body.humidity_DHT);

				const createdAt = ReadingsValidation.getDate(req);

				const result = await prisma.readings.create({
					data: {
						createdAt,

						temperature_BMP,
						temperature_DHT,
						pressure_BMP,
						humidity_DHT,
					},
				});

				if (req.headers['short'] === 'true') {
					res.sendStatus(200); // end response only with 200 ok
				} else {
					res.json(result); // end response with the full new reading
				}

				ReadingEventsController.sendReading(result); // push the new reading to all SSE clients

				// invalidate today's cache
				redisClient.del('readings24h');

				// invalidate either given month's cache or current month's cache
				const year = createdAt?.getUTCFullYear() ?? new Date().getUTCFullYear();
				const month = createdAt?.getUTCMonth() ?? new Date().getUTCMonth();

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
					throw new AppError(400, 'Bad request', errors);
				}

				const id = parseInt(req.params.id);
				const temperature_BMP = parseFloat(req.body.temperature_BMP);
				const temperature_DHT = parseFloat(req.body.temperature_DHT);
				const pressure_BMP = parseFloat(req.body.pressure_BMP);
				const humidity_DHT = parseFloat(req.body.humidity_DHT);

				const createdAt = ReadingsValidation.getDate(req);

				const result = await prisma.readings.upsert({
					where: { id: id },
					update: {
						createdAt,

						temperature_BMP,
						temperature_DHT,
						pressure_BMP,
						humidity_DHT,
					},
					create: {
						id,
						createdAt,

						temperature_BMP,
						temperature_DHT,
						pressure_BMP,
						humidity_DHT,
					},
				});

				res.json(result);
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
					throw new AppError(400, 'Bad request', errors);
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
					throw new AppError(404, 'Reading not found', errors);
				}

				const id = parseInt(req.params.id);

				const results = await prisma.readings.delete({
					where: { id: id },
				});

				res.json(results);
			} catch (error) {
				next(error);
			}
		},
	];
}
