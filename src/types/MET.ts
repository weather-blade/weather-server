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
		next_12_hours?: {
			summary: {
				symbol_code: string;
			};
		};
	};
	time: Date;
};

export type ISunriseSunset = {
	sunrise: Date;
	sunset: Date;
};
