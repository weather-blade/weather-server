import type { Request, Response, NextFunction } from "express";
import { redisClient } from "../db/redis.js";
import type { ITimePointForecast, ITimePointSunrise } from "../types/MET.js";

export async function getForecastSunrise(req: Request, res: Response, next: NextFunction) {
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
        MET._forecastExpires.getTime() + 5 * 60 * 1000 > Date.now() // and it's not stale (+5 minutes after official expiration)
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
          cache: "default", // return response from cache (if it's not expired)
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
        MET._forecastExpires = new Date(expiresHeader);

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
        const sunriseTimeSeries: ITimePointSunrise[] = JSON.parse(cacheResults);
        return sunriseTimeSeries;
      } else {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() + 1; // indexed from 0
        const monthPadded = String(month).padStart(2, "0");
        const day = now.getUTCDate();
        const dayPadded = String(day).padStart(2, "0");
        const OFFSET = "+02:00";
        const DAYS_FORWARD = 2; // how many days should we fetch

        const url = `https://api.met.no/weatherapi/sunrise/2.0/.json?lat=${MET.LATITUDE}&lon=${MET.LONGITUDE}&date=${year}-${monthPadded}-${dayPadded}&offset=${OFFSET}&days=${DAYS_FORWARD}`;

        const response = await fetch(url, {
          method: "GET",
          cache: "default", // return response from cache (if it's not expired)
        });

        const responseData = await response.json();
        const sunriseTimeSeries: ITimePointSunrise[] = responseData.location.time;

        const next2AM = new Date();
        next2AM.setHours(2, 0, 0, 0); // 2 AM
        // next 2 AM will probably be tommorow
        if (now > next2AM) {
          next2AM.setDate(next2AM.getDate() + 1); // tommorow's date
        }

        redisClient.set("sunrise", JSON.stringify(sunriseTimeSeries), {
          EX: next2AM.getTime() - Date.now(),
        });

        return sunriseTimeSeries;
      }
    } catch (error) {
      console.error(error);
    }
  }
}
