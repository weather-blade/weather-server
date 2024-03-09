import { prisma } from '../db/prisma.js';
import { lttb } from '../utils/lttb.js';

export class ReadingsService {
	public static async getById(id: number) {
		const reading = await prisma.readings.findUnique({
			where: {
				id: id,
			},
		});

		return reading;
	}

	/**
	 * Returns reading from the given time range
	 * @param startTime
	 * @param endTime
	 */
	public static async getTimeRange(startTime: Date, endTime: Date) {
		const readings = await prisma.readings.findMany({
			where: {
				createdAt: {
					gte: startTime,
					lte: endTime,
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return readings;
	}

	/**
	 * Returns reading from the given time range
	 * Readings are decimated using the LTTB algorithm to maximum of 1000 readings
	 * @param startTime
	 * @param endTime
	 */
	public static async getTimeRangeDecimated(startTime: Date, endTime: Date) {
		const readings = await ReadingsService.getTimeRange(startTime, endTime);

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

		return trimmedReadings;
	}

	/**
	 * Returns all readings from the last 24 hours
	 */
	public static async getLast24h() {
		const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const endTime = new Date();

		const readings = await prisma.readings.findMany({
			where: {
				createdAt: {
					gte: startTime,
					lte: endTime,
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return readings;
	}

	/**
	 * Saves the reading to database
	 * @param temperature_BMP
	 * @param temperature_DHT
	 * @param pressure_BMP
	 * @param humidity_DHT
	 * @param createdAt optional, if not included, current time will be used
	 */
	public static async createReading(
		temperature_BMP: number,
		temperature_DHT: number,
		pressure_BMP: number,
		humidity_DHT: number,

		createdAt: Date | undefined = undefined
	) {
		const reading = await prisma.readings.create({
			data: {
				temperature_BMP,
				temperature_DHT,
				pressure_BMP,
				humidity_DHT,

				// Undefined means Prisma will use default value (current time).
				createdAt,
			},
		});

		return reading;
	}

	/**
	 * Updates the reading with given ID
	 * If it doesn't exist, creates a new one
	 * @param id
	 * @param temperature_BMP
	 * @param temperature_DHT
	 * @param pressure_BMP
	 * @param humidity_DHT
	 * @param createdAt
	 */
	public static async upsertReading(
		id: number,
		temperature_BMP: number,
		temperature_DHT: number,
		pressure_BMP: number,
		humidity_DHT: number,
		createdAt: Date
	) {
		const reading = await prisma.readings.upsert({
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

		return reading;
	}

	public static async deleteById(id: number) {
		const result = await prisma.readings.delete({
			where: { id: id },
		});

		return result;
	}
}
