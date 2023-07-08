import type { Schema } from "express-validator";

export const readingSchema: Schema = {
  temperature_BMP: {
    in: ["body"],
    trim: true,
    isNumeric: true,
    escape: true,
  },
  temperature_DHT: {
    in: ["body"],
    trim: true,
    isNumeric: true,
    escape: true,
  },
  pressure_BMP: {
    in: ["body"],
    trim: true,
    isNumeric: true,
    escape: true,
  },
  humidity_DHT: {
    in: ["body"],
    trim: true,
    isNumeric: true,
    escape: true,
  },
};
