import { prisma } from '../db/prisma.js';
import type { Schema } from 'express-validator';
import type { Request } from 'express';

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
			in: ['query'],
			trim: true,
			isNumeric: true,
			escape: true,
		},
	};

	public static readingIdExists: Schema = {
		id: {
			in: ['query'],
			custom: {
				options: async (inputId) => {
					// check if there is matching id in database
					try {
						await prisma.readings.findFirstOrThrow({
							where: { id: parseInt(inputId) },
						});
						return true;
					} catch (error) {
						console.error(error);
						throw new Error('Reading with that ID does not exist');
					}
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

	public static getDate(req: Request) {
		const createdAt: 'string' | undefined = req.body.createdAt;
		// If date isn't included in body, it will be undefined.
		// Undefined means Prisma will use default value (current time).
		if (createdAt !== undefined) {
			// If the field passes validator.js validation, this should always return valid date.
			// https://github.com/validatorjs/validator.js/blob/master/src/lib/isISO8601.js
			return new Date(createdAt);
		} else {
			return undefined;
		}
	}

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
