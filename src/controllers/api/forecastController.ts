import { Request, Response, NextFunction } from "express";

import { MET } from "../../MET";

// GET

export async function getForecast(req: Request, res: Response, next: NextFunction) {
  try {
    res.set("Expires", MET.forecastExpires);
    res.json({
      forecast: MET.timeSeries,
      sunrise: MET.sunrise,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("500 Internal Server Error");
  }
}
