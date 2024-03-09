import type { Request, Response, NextFunction } from 'express';

import { ForecastService } from '../services/forecast.service.js';

export class ForecastController {
	/**
	 * Returns full forecast and sunrise data
	 */
	public static async getForecastSunrise(req: Request, res: Response, next: NextFunction) {
		try {
			const [forecast, sunrise] = await Promise.all([
				ForecastService.getForecast(),
				ForecastService.getSunrise(),
			]);

			res.set('Expires', ForecastService.getExpires());
			res.json({
				forecast: forecast,
				sunrise: sunrise,
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Creates notification based on today's forecast
	 */
	public static async getNotification(req: Request, res: Response, next: NextFunction) {
		try {
			const notification = await ForecastService.getNotification();

			res.json(notification);
		} catch (error) {
			next(error);
		}
	}
}
