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
				created_at: {
					gte: startTime,
					lte: endTime,
				},
			},
			orderBy: { created_at: 'desc' },
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
		const temperature_bmp_Full = readings.map<[number, number]>((reading) => {
			return [reading.created_at.getTime(), reading.temperature_bmp];
		});
		const temperature_dht_Full = readings.map<[number, number]>((reading) => {
			return [reading.created_at.getTime(), reading.temperature_dht];
		});
		const humidity_dht_Full = readings.map<[number, number]>((reading) => {
			return [reading.created_at.getTime(), reading.humidity_dht];
		});
		const pressure_bmp_Full = readings.map<[number, number]>((reading) => {
			return [reading.created_at.getTime(), reading.pressure_bmp];
		});

		// Usually, there is ~8000 readings per month.
		// With that many points, the browser starts to lag when rendering the chart.
		// 1000 readings seems to be a nice compromise between browser lag and data resolution.
		const DONWSAMPLED_COUNT = 1000;
		const temperature_bmp_Trimmed = lttb(temperature_bmp_Full, DONWSAMPLED_COUNT);
		const temperature_dht_Trimmed = lttb(temperature_dht_Full, DONWSAMPLED_COUNT);
		const humidity_dht_Trimmed = lttb(humidity_dht_Full, DONWSAMPLED_COUNT);
		const pressure_bmp_Trimmed = lttb(pressure_bmp_Full, DONWSAMPLED_COUNT);

		// You can downsample only 1 X and Y value at a time.
		// Lttb will select points from different dates (X) from each dataset.
		// If you save the results into the same time point (X), some values will then be slightly shifted.
		// The alternative is to use separate X axis for each dataset. But then the chart tooltip won't work properly...
		const trimmedReadings = temperature_bmp_Trimmed.map((_, i) => {
			return {
				id: i,
				created_at: temperature_bmp_Trimmed[i][0],

				temperature_bmp: temperature_bmp_Trimmed[i][1],
				temperature_dht: temperature_dht_Trimmed[i][1],
				humidity_dht: humidity_dht_Trimmed[i][1],
				pressure_bmp: pressure_bmp_Trimmed[i][1],
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
				created_at: {
					gte: startTime,
					lte: endTime,
				},
			},
			orderBy: { created_at: 'desc' },
		});

		return readings;
	}

	/**
	 * Saves the reading to database
	 * @param temperature_bmp
	 * @param temperature_dht
	 * @param pressure_bmp
	 * @param humidity_dht
	 * @param created_at optional, if not included, current time will be used
	 */
	public static async createReading(
		temperature_bmp: number,
		temperature_dht: number,
		pressure_bmp: number,
		humidity_dht: number,
		created_at: Date | undefined = undefined
	) {
		const reading = await prisma.readings.create({
			data: {
				temperature_bmp,
				temperature_dht,
				pressure_bmp,
				humidity_dht,
				// Undefined means Prisma will use default value (current time).
				created_at,
			},
		});

		return reading;
	}

	/**
	 * Updates the reading with given ID
	 * If it doesn't exist, creates a new one
	 * @param id
	 * @param temperature_bmp
	 * @param temperature_dht
	 * @param pressure_bmp
	 * @param humidity_dht
	 * @param created_at
	 */
	public static async upsertReading(
		id: number,
		temperature_bmp: number,
		temperature_dht: number,
		pressure_bmp: number,
		humidity_dht: number,
		created_at: Date
	) {
		const reading = await prisma.readings.upsert({
			where: { id: id },
			update: {
				created_at,

				temperature_bmp,
				temperature_dht,
				pressure_bmp,
				humidity_dht,
			},
			create: {
				id,
				created_at,

				temperature_bmp,
				temperature_dht,
				pressure_bmp,
				humidity_dht,
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
