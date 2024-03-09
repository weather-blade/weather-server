import { redisClient } from '../db/redis.js';
import { UtilFns } from '../utils/functions.js';
import type { ISunriseSunset, ITimePointForecast } from '../types/MET.js';

/**
 * Class for interfacing with MET API (https://api.met.no/)
 */
export class METService {
	public static forecastExpires: Date;

	private static LATITUDE = 50.6578;
	private static LONGITUDE = 14.9917;
	private static ALTITUDE = 320;

	private static timePointForecast: ITimePointForecast[] = [];

	// To avoid repeatedly downloading the same data (MET TOS)
	private static lastModified = '';

	/**
	 * Returns either cached forecast or checks if there is newer version available and returns that
	 */
	public static async getForecast(): Promise<ITimePointForecast[]> {
		if (
			METService.timePointForecast.length > 0 && // if we have forecast in memory
			METService.forecastExpires.getTime() > Date.now() // and it's not stale
		) {
			return METService.timePointForecast;
		}

		const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?&lat=${METService.LATITUDE}&lon=${METService.LONGITUDE}&altitude=${METService.ALTITUDE}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': 'github.com/Bladesheng/weather-station-frontend keadr23@gmail.com',
				'If-Modified-Since': METService.lastModified, // as per MET.no ToS, to not repeatedly download the same data
			},
		});

		// if the status code is 304, don't parse the body (it hasn't changed since lastModified, so it wasn't included in the response)
		if (response.ok) {
			const responseData = await response.json();

			// remove the last time point because it doesn't have icon
			responseData.properties.timeseries.pop();

			// save the forecast to memory
			METService.timePointForecast = responseData.properties.timeseries;
		}

		let expiresHeader = response.headers.get('expires');
		if (expiresHeader === null) {
			// this header is sometimes missing
			console.warn('Expires header is missing', response.headers);

			// assume the update will be in 40 minutes (updates are published every ~30 minutes)
			expiresHeader = new Date(Date.now() + 40 * 60 * 1000).toISOString();
		}
		// don't repeat requests until the time indicated in the Expires response header + random delay (MET TOS)
		const randomDelay = UtilFns.randomIntFromInterval(3, 6);
		METService.forecastExpires = new Date(
			new Date(expiresHeader).getTime() + randomDelay * 60 * 1000
		);

		let lastModifiedHeader = response.headers.get('last-modified');
		if (lastModifiedHeader === null) {
			// this header is sometimes missing
			console.warn('Last-modified header is missing', response.headers);

			// just make something up
			lastModifiedHeader = new Date().toISOString();
		}
		METService.lastModified = lastModifiedHeader;

		return METService.timePointForecast;
	}

	/**
	 * Returns either cached sunrise data or fetches new data if nothing is cached
	 */
	public static async getSunrise(): Promise<ISunriseSunset> {
		const cacheResults = await redisClient.get('sunrise');
		if (cacheResults) {
			const sunriseTimeSeries: ISunriseSunset = JSON.parse(cacheResults);
			return sunriseTimeSeries;
		}

		const url = `https://api.met.no/weatherapi/sunrise/3.0/sun?lat=${METService.LATITUDE}&lon=${METService.LONGITUDE}`;

		const response = await fetch(url);
		const responseData = await response.json();
		const sunriseSunset: ISunriseSunset = {
			sunrise: responseData.properties.sunrise.time,
			sunset: responseData.properties.sunset.time,
		};

		const next2AM = new Date();
		next2AM.setHours(2, 0, 0, 0);
		// next 2 AM will probably be tommorow
		if (new Date() > next2AM) {
			next2AM.setDate(next2AM.getDate() + 1); // tommorow's date
		}

		redisClient.set('sunrise', JSON.stringify(sunriseSunset), {
			EX: next2AM.getTime() - Date.now(),
		});

		return sunriseSunset;
	}
}
