import { AppError } from '../exceptions/AppError.js';
import { UtilFns } from '../utils/functions.js';
import { METService } from './MET.service.js';
import type { ISunriseSunset, ITimePointForecast } from '../types/MET.js';

export class ForecastService {
	public static async getForecast(): Promise<ITimePointForecast[]> {
		const forecast = await METService.getForecast();

		if (forecast === undefined) {
			throw new AppError(500, 'Internal server error');
		}
		return forecast;
	}

	public static async getSunrise(): Promise<ISunriseSunset> {
		return await METService.getSunrise();
	}

	public static getExpires(): string {
		return METService.forecastExpires.toUTCString();
	}

	public static async getNotification() {
		const forecast = await ForecastService.getForecast();

		// convert date strings to date objects
		for (const timePoint of forecast) {
			timePoint.time = new Date(timePoint.time);
		}

		// keep only today's forecast
		const forecastToday = ForecastService.splitByDays(forecast)[0];

		const precipitationTotal = forecastToday.reduce((acc, timePoint) => {
			return acc + ForecastService.getPrecipitation(timePoint);
		}, 0);

		const tempsToday = forecastToday.map((timePoint) => {
			return timePoint.data.instant.details.air_temperature;
		});
		const tempMax = Math.round(Math.max(...tempsToday));
		const tempMin = Math.round(Math.min(...tempsToday));

		let body = `Teplota: ${tempMax}˚ / ${tempMin}˚\n`;
		if (precipitationTotal > 0) {
			body += `Srážky: ${UtilFns.round(precipitationTotal, 1)} mm`;
		}

		const icon = ForecastService.getIconCode(forecastToday[0]);

		return {
			title: 'Předpověď',
			icon,
			body,
			precipitationTotal,
		};
	}

	/**
	 * Groups forecast by individual days into arrays
	 */
	private static splitByDays(forecast: ITimePointForecast[]) {
		let currentDay = forecast[0].time.getDate();
		const days: ITimePointForecast[][] = [[]];

		for (const timePoint of forecast) {
			if (timePoint.time.getDate() !== currentDay) {
				// create new day sub-array
				days.push([]);
				currentDay = timePoint.time.getDate();
			}

			// add the timepoint to the last sub-array
			days[days.length - 1].push(timePoint);
		}

		return days;
	}

	/**
	 * Returns precipitation of given timePoint (prefers shortest prediction)
	 */
	private static getPrecipitation(timePoint: ITimePointForecast) {
		const precipitation1hr = timePoint.data?.next_1_hours?.details?.precipitation_amount;
		const precipitation6hr = timePoint.data?.next_6_hours?.details?.precipitation_amount;

		// Preferably use the 1 hour data. If not available, use the 6 hour data.
		const precipitation = precipitation1hr ?? precipitation6hr ?? 0;

		return precipitation;
	}

	/**
	 * Returns icon code of given timePoint (prefers longest prediction)
	 */
	private static getIconCode(timePoint: ITimePointForecast) {
		const icon1hr = timePoint.data?.next_1_hours?.summary?.symbol_code;
		const icon6hr = timePoint.data?.next_6_hours?.summary?.symbol_code;
		const icon12hr = timePoint.data?.next_12_hours?.summary?.symbol_code;

		if (icon1hr === undefined && icon6hr === undefined && icon12hr === undefined) {
			console.warn('Missing precipitation icon:', timePoint);
		}

		const iconCode = icon12hr ?? icon6hr ?? icon1hr ?? 'heavysnowshowersandthunder_day';

		return iconCode;
	}
}
