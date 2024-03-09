import { ReadingsService } from '../services/readings.service.js';
import type { Schema } from 'express-validator';

export class ReadingsValidation {
	public static reading: Schema = {
		temperature_BMP: {
			in: ['body'],
			trim: true,
			isNumeric: true,
			escape: true,
		},
		temperature_DHT: {
			in: ['body'],
			trim: true,
			isNumeric: true,
			escape: true,
		},
		pressure_BMP: {
			in: ['body'],
			trim: true,
			isNumeric: true,
			escape: true,
		},
		humidity_DHT: {
			in: ['body'],
			trim: true,
			isNumeric: true,
			escape: true,
		},
	};

	public static readingId: Schema = {
		id: {
			in: ['params'],
			trim: true,
			isNumeric: true,
			escape: true,
		},
	};

	/**
	 * Checks if reading with given ID exists in database.
	 */
	public static readingIdExists: Schema = {
		id: {
			in: ['params'],
			custom: {
				options: async (inputId) => {
					const reading = await ReadingsService.getById(parseInt(inputId));

					if (reading === null) {
						throw new Error('Reading with that ID does not exist');
					}

					return true;
				},
			},
		},
	};

	public static readingDate: Schema = {
		createdAt: {
			in: ['body'],
			optional: true,
			trim: true,
			isISO8601: {
				errorMessage: 'The datetime string must match ISO 8601 format',
			},
			escape: true,
		},
	};

	public static readingDateRequired: Schema = {
		createdAt: {
			in: ['body'],
			optional: false,
			trim: true,
			isISO8601: {
				errorMessage: 'The datetime string must match ISO 8601 format',
			},
			escape: true,
		},
	};

	public static yearMonth: Schema = {
		year: {
			in: ['query'],
			isInt: {
				options: {
					min: 2000,
					max: 2100,
				},
			},
			trim: true,
			escape: true,
		},
		month: {
			in: ['query'],
			isInt: {
				options: {
					min: 1,
					max: 12,
				},
			},
			trim: true,
			escape: true,
		},
	};
}
