import { prisma } from "../db/prisma.js";
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

export const readingIdSchema: Schema = {
  id: {
    in: ["query"],
    trim: true,
    isNumeric: true,
    escape: true,
  },
};

export const readingIdExistsSchema: Schema = {
  id: {
    in: ["query"],
    custom: {
      options: async (inputId) => {
        // check if there is matching id in database
        try {
          await prisma.readings.findFirstOrThrow({
            where: { id: parseInt(inputId) },
          });
          return true;
        } catch (error) {
          console.error(error);
          throw new Error("Reading with that ID does not exist");
        }
      },
    },
  },
};
