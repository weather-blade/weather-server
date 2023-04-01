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

// module for interfacing with MET API (https://api.met.no/)
export const MET = (() => {
  let timeSeries: ITimePointForecast[] = [];
  let forecastExpires = "";

  console.log("[server] Well MET");
  _updateForecast(); // start the update loop on init

  async function _updateForecast(lastModified = "") {
    try {
      console.log("[server] Updating forecast data...");

      const latitude = 50.6578;
      const longitude = 14.9917;
      const altitude = 320;
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?&lat=${latitude}&lon=${longitude}&altitude=${altitude}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "github.com/Bladesheng/weather-station-frontend keadr23@gmail.com",
          "If-Modified-Since": lastModified, // this won't do anything on first function run, only on subsequent runs
        },
        cache: "default", // return response from cache (if it's not expired)
      });

      // if the status code is 304, don't parse the body (because it isn't there)
      if (response.status === 200) {
        const responseData = await response.json();

        // remove the last time point because it doesn't have icon
        responseData.properties.timeseries.pop();

        // update the saved forecast
        timeSeries = responseData.properties.timeseries;
      }

      const expires = response.headers.get("expires");
      if (expires === null) throw "Expires header is missing";
      const timeToExpires = new Date(expires).getTime() - Date.now();

      // Set the Expires header of the GET response to 6 minutes after original request (MET api) expiration time
      forecastExpires = new Date(new Date(expires).getTime() + 6 * 60 * 1000).toUTCString();

      const lastModifiedNew = response.headers.get("last-modified"); // get fresh value of last-modified header
      if (lastModifiedNew === null) throw "Last-modified header is missing";

      // schedule update for 5 minutes after expiration time
      setTimeout(() => {
        _updateForecast(lastModifiedNew);
      }, timeToExpires + 5 * 60 * 1000);

      console.log(
        `[server] Forecast data updated (${response.status}). Next update will be in ${Math.floor(
          timeToExpires / 1000 / 60 + 5
        )} minutes.`
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
  };
})();
