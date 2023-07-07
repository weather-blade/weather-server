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
