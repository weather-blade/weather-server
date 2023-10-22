import type { Request, Response, NextFunction } from "express";
import { redisClient } from "../db/redis.js";
import { UtilFns } from "../utils/functions.js";
import type { ITimePointForecast, ISunriseSunset } from "../types/MET.js";

export class ForecastController {
  /**
   * Returns full forecast and sunrise data
   */
  public static async getForecastSunrise(req: Request, res: Response, next: NextFunction) {
    try {
      const [forecast, sunrise] = await Promise.all([MET.fetchForecast(), MET.fetchSunrise()]);

      res.set("Expires", MET.forecastExpires.toUTCString());
      res.json({
        forecast: forecast,
        sunrise: sunrise,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  }

  /**
   * Creates notification based on today's forecast
   */
  public static async getNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const forecast = await MET.fetchForecast();
      if (forecast === undefined) {
        throw new Error("Forecast is undefined");
      }

      // convert date strings to date objects
      for (const timePoint of forecast) {
        timePoint.time = new Date(timePoint.time);
      }

      // we care only about today
      const forecastToday = splitByDays(forecast)[0];

      const precipitationTotal = forecastToday.reduce((acc, timePoint) => {
        return acc + getPrecipitation(timePoint);
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

      const icon = getIconCode(forecastToday[0]);

      res.json({
        title: "Předpověď",
        icon,
        body,
        precipitationTotal,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  }
}

/**
 * Class for interfacing with MET API (https://api.met.no/)
 */
class MET {
  private static LATITUDE = 50.6578;
  private static LONGITUDE = 14.9917;
  private static ALTITUDE = 320;

  private static _timeSeries: ITimePointForecast[] = [];
  static get timeSeries() {
    return MET._timeSeries;
  }

  // Don't repeat requests until the time indicated in the Expires response header (MET TOS)
  private static _forecastExpires: Date;
  static get forecastExpires() {
    return MET._forecastExpires;
  }

  // To avoid repeatedly downloading the same data (MET TOS)
  private static _lastModified = "";

  /**
   * Returns either cached forecast or checks if there is newer version available and returns that
   */
  public static async fetchForecast() {
    try {
      if (
        MET._timeSeries.length > 0 && // if we have something in memory
        MET._forecastExpires.getTime() > Date.now() // and it's not stale
      ) {
        return MET._timeSeries;
      } else {
        const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?&lat=${MET.LATITUDE}&lon=${MET.LONGITUDE}&altitude=${MET.ALTITUDE}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "github.com/Bladesheng/weather-station-frontend keadr23@gmail.com",
            "If-Modified-Since": MET._lastModified, // as per MET.no ToS, to not repeatedly download the same data
          },
        });

        if (response.ok) {
          const responseData = await response.json();

          // remove the last time point because it doesn't have icon
          responseData.properties.timeseries.pop();

          // update the in-memory forecast
          MET._timeSeries = responseData.properties.timeseries;
        }
        // if the status code is 304, don't parse the body (it hasn't changed since lastModified, so it wasn't included in the response)

        let expiresHeader = response.headers.get("expires");
        if (expiresHeader === null) {
          // sometimes, this header is missing...
          console.warn("Expires header is missing", response.headers);
          // just expect next update in 40 minutes (updates are published every ~30 minutes)
          expiresHeader = new Date(Date.now() + 40 * 60 * 1000).toISOString();
        }
        // add random delay to the actual expiration timer (MET TOS)
        const randomDelay = UtilFns.randomIntFromInterval(3, 6);
        MET._forecastExpires = new Date(
          new Date(expiresHeader).getTime() + randomDelay * 60 * 1000
        );

        let lastModifiedHeader = response.headers.get("last-modified");
        if (lastModifiedHeader === null) {
          // sometimes, this header is missing...
          console.warn("Last-modified header is missing", response.headers);
          // just make something up
          lastModifiedHeader = new Date().toISOString();
        }
        MET._lastModified = lastModifiedHeader;

        return MET._timeSeries;
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Returns either cached sunrise data or fetches new data if nothing is cached
   */
  public static async fetchSunrise() {
    try {
      const cacheResults = await redisClient.get("sunrise");

      if (cacheResults) {
        const sunriseTimeSeries: ISunriseSunset = JSON.parse(cacheResults);
        return sunriseTimeSeries;
      } else {
        const url = `https://api.met.no/weatherapi/sunrise/3.0/sun?lat=${MET.LATITUDE}&lon=${MET.LONGITUDE}`;

        const response = await fetch(url);
        const responseData = await response.json();
        const sunriseSunset: ISunriseSunset = {
          sunrise: responseData.properties.sunrise.time,
          sunset: responseData.properties.sunset.time,
        };

        const next2AM = new Date();
        next2AM.setHours(2, 0, 0, 0); // 2 AM
        // next 2 AM will probably be tommorow
        if (new Date() > next2AM) {
          next2AM.setDate(next2AM.getDate() + 1); // tommorow's date
        }

        redisClient.set("sunrise", JSON.stringify(sunriseSunset), {
          EX: next2AM.getTime() - Date.now(),
        });

        return sunriseSunset;
      }
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Groups forecast by individual days into arrays
 */
function splitByDays(forecast: ITimePointForecast[]) {
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
 * @returns precipitation of given timePoint (prefers shortest prediction)
 */
function getPrecipitation(timePoint: ITimePointForecast) {
  const precipitation1hr = timePoint.data?.next_1_hours?.details?.precipitation_amount;
  const precipitation6hr = timePoint.data?.next_6_hours?.details?.precipitation_amount;

  // Preferably use the 1 hour data. If not available, use the 6 hour data.
  const precipitation = precipitation1hr ?? precipitation6hr ?? 0;

  return precipitation;
}

/**
 * @returns icon code of given timePoint (prefers longest prediction)
 */
function getIconCode(timePoint: ITimePointForecast) {
  const icon1hr = timePoint.data?.next_1_hours?.summary?.symbol_code;
  const icon6hr = timePoint.data?.next_6_hours?.summary?.symbol_code;
  const icon12hr = timePoint.data?.next_12_hours?.summary?.symbol_code;

  if (icon1hr === undefined && icon6hr === undefined && icon12hr === undefined) {
    console.warn("Missing precipitation icon:", timePoint);
  }

  const iconCode = icon12hr ?? icon6hr ?? icon1hr ?? "heavysnowshowersandthunder_day";

  return iconCode;
}
