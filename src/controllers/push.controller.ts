import { checkSchema, validationResult } from 'express-validator';
import { PushValidation } from '../validations/push.validation.js';
import { AppError } from '../exceptions/AppError.js';
import { PushService } from '../services/push.service.js';
import type { Request, Response, NextFunction } from 'express';

export class PushController {
	public static async getPublicKey(req: Request, res: Response, next: NextFunction) {
		try {
			res.send(PushService.getVapidPublicKey());
		} catch (error) {
			next(error);
		}
	}

	public static subscribe = [
		checkSchema(PushValidation.subscription),

		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const errors = validationResult(req);
				if (!errors.isEmpty()) {
					throw new AppError(400, 'Bad request', errors.array());
				}

				const subscription = req.body.subscription;

				const result = await PushService.saveSubscription(subscription);

				res.json(result);
			} catch (error) {
				next(error);
			}
		},
	];
}
