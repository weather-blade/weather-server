export type ITimePointForecast = {
  data: {
    instant: {
      details: {
        air_pressure_at_sea_level: number;
        air_temperature: number;
        cloud_area_fraction: number;
        relative_humidity: number;
        wind_from_direction: number;
        wind_speed: number;
      };
    };
    next_1_hours: {
      details: {
        precipitation_amount: number;
      };
      summary: {
        symbol_code: string;
      };
    };
    next_6_hours: {
      details: {
        precipitation_amount: number;
      };
      summary: {
        symbol_code: string;
      };
    };
  };
  time: Date;
};

export type ITimePointSunrise = {
  date: string | Date;
  sunrise: {
    desc: string;
    time: Date;
  };
  sunset: {
    desc: string;
    time: Date;
  };

  high_moon: object;
  low_moon: object;
  moonphase: object;
  moonposition: object;
  moonrise: object;
  moonset: object;
  moonshadow: object;
  solarmidnight: object;
  solarnoon: object;
};

// module for interfacing with MET API (https://api.met.no/)
export const MET = (() => {
  let timeSeries: ITimePointForecast[] = [];
  let forecastExpires = "";
  let sunrise: ITimePointSunrise[] = [];

  const _latitude = 50.6578;
  const _longitude = 14.9917;
  const _altitude = 320;

  console.log("[server] Well MET");
  // start both update loops on init
  _updateForecast();
  _updateSunrise();

  async function _updateForecast(lastModified = "") {
    try {
      console.log("[server] Updating forecast data...");

      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?&lat=${_latitude}&lon=${_longitude}&altitude=${_altitude}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "github.com/Bladesheng/weather-station-frontend keadr23@gmail.com",
          "If-Modified-Since": lastModified, // as per MET.no ToS, to not repeatedly download the same data
        },
        cache: "default", // return response from cache (if it's not expired)
      });

      // if the status code is 304, don't parse the body (it hasn't changed since lastModified time, so it wasn't included in the response)
      if (response.ok) {
        const responseData = await response.json();

        // remove the last time point because it doesn't have icon
        responseData.properties.timeseries.pop();

        // update the saved forecast
        timeSeries = responseData.properties.timeseries;
      }

      // when to expect next update of the weather model
      let expiresHeader = response.headers.get("expires");
      if (expiresHeader === null) {
        console.warn("Expires header is missing", response.headers);
        expiresHeader = new Date(Date.now() + 40 * 60 * 1000).toISOString(); // to try again in 40 minutes (updates are every ~30 minutes)
      }
      const timeToExpires = new Date(expiresHeader).getTime() - Date.now();
      // when responding to GET requests, set the Expires header to 6 minutes after original request (MET api) expiration time
      forecastExpires = new Date(new Date(expiresHeader).getTime() + 6 * 60 * 1000).toUTCString();

      let lastModifiedHeader = response.headers.get("last-modified");
      if (lastModifiedHeader === null) {
        console.warn("Last-modified header is missing", response.headers);
        lastModifiedHeader = new Date().toISOString(); // just make something up
      }

      // schedule update for 5 minutes after expiration time
      setTimeout(
        () => {
          _updateForecast(lastModifiedHeader as string);
        },
        timeToExpires + 5 * 60 * 1000
      );

      console.log(
        `[server] Forecast data updated (${response.status}). Next update will be in ${Math.floor(
          timeToExpires / 1000 / 60 + 5
        )} minutes.`
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function _updateSunrise() {
    try {
      console.log("[server] Updating sunrise data...");

      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1; // indexed from 0
      const monthPadded = String(month).padStart(2, "0");
      const day = now.getUTCDate();
      const dayPadded = String(day).padStart(2, "0");
      const offset = "+02:00";
      const daysForward = 2;

      const url = `https://api.met.no/weatherapi/sunrise/2.0/.json?lat=${_latitude}&lon=${_longitude}&date=${year}-${monthPadded}-${dayPadded}&offset=${offset}&days=${daysForward}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "default", // return response from cache (if it's not expired)
      });

      if (response.ok) {
        const responseData = await response.json();
        sunrise = responseData.location.time; // update the saved sunrise
      }

      const tommorow2AM = new Date();
      tommorow2AM.setDate(tommorow2AM.getDate() + 1); // tommorow's date
      tommorow2AM.setHours(2, 0, 0, 0); // 2 AM
      // schedule update for 2 AM on the next day
      setTimeout(() => {
        _updateSunrise();
      }, tommorow2AM.getTime() - Date.now());

      console.log(
        `[server] Sunrise data updated (${
          response.status
        }). Next update will be at ${tommorow2AM.toISOString()}`
      );
    } catch (error) {
      console.error(error);
    }
  }

  return {
    get timeSeries() {
      return timeSeries;
    },
    get forecastExpires() {
      return forecastExpires;
    },
    get sunrise() {
      return sunrise;
    },
  };
})();
