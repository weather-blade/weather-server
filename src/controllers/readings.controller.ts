import { body, checkSchema, validationResult } from "express-validator";
import { prisma } from "../db/prisma.js";
import { sendEventsToAll } from "../controllers/readingsEvents.controller.js";
import {
  readingSchema,
  readingIdSchema,
  readingIdExistsSchema,
} from "../validations/readings.validation.js";
import type { Request, Response, NextFunction } from "express";

// GET

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const readings = await prisma.readings.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(readings);
  } catch (error) {
    console.error(error);
    return res.status(500).send("500 Internal Server Error");
  }
}

export async function getTimeRange(req: Request, res: Response, next: NextFunction) {
  try {
    const startTime = new Date(String(req.query.start));
    const endTime = new Date(String(req.query.end));

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).send("400 Bad Request (use ISO 8601 time format)");
    }

    const readings = await prisma.readings.findMany({
      where: {
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(readings);
  } catch (error) {
    console.error(error);
    return res.status(500).send("500 Internal Server Error");
  }
}

// POST

export const postReading = [
  checkSchema(readingSchema),

  body("createdAt", "Date must comply with ISO8601").optional().trim().isISO8601().escape(),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // check for validation errors first
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json(errors); // respond with the validation errors
      }

      // no validation errors. extract and parse values from body of request

      const temperature_BMP = parseFloat(req.body.temperature_BMP);
      const temperature_DHT = parseFloat(req.body.temperature_DHT);
      const pressure_BMP = parseFloat(req.body.pressure_BMP);
      const humidity_DHT = parseFloat(req.body.humidity_DHT);

      let { createdAt } = req.body;
      // if date isn't included in body, set this to undefined.
      // undefined means Prisma will use default value (current time)
      if (createdAt !== undefined) {
        createdAt = new Date(createdAt);

        if (isNaN(createdAt.getTime())) {
          return res.status(400).send("400 Bad Request (use ISO 8601 time format)");
        }
      }

      const result = await prisma.readings.create({
        data: {
          createdAt,

          temperature_BMP,
          temperature_DHT,
          pressure_BMP,
          humidity_DHT,
        },
      });

      if (req.headers["short"] === "true") {
        res.sendStatus(200); // end response only with 200 ok
      } else {
        res.json(result); // end response with the full new reading
      }

      sendEventsToAll(result); // push the new reading to all SSE clients
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  },
];

// PUT

export const upsertReading = [
  checkSchema(readingIdSchema),

  body("createdAt", "Date must comply with ISO8601").trim().isISO8601().escape(),

  checkSchema(readingSchema),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // check for validation errors first
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json(errors); // respond with the validation errors
      }

      // no validation errors. extract and parse values from body of request

      const id = parseInt(req.query.id as string);

      const temperature_BMP = parseFloat(req.body.temperature_BMP);
      const temperature_DHT = parseFloat(req.body.temperature_DHT);
      const pressure_BMP = parseFloat(req.body.pressure_BMP);
      const humidity_DHT = parseFloat(req.body.humidity_DHT);

      const createdAt = new Date(req.body.createdAt);
      if (isNaN(createdAt.getTime())) {
        return res.status(400).send("400 Bad Request (use ISO 8601 time format)");
      }

      const result = await prisma.readings.upsert({
        where: { id: id },
        update: {
          createdAt,

          temperature_BMP,
          temperature_DHT,
          pressure_BMP,
          humidity_DHT,
        },
        create: {
          id,
          createdAt,

          temperature_BMP,
          temperature_DHT,
          pressure_BMP,
          humidity_DHT,
        },
      });

      res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  },
];

// DELETE

export const deleteReading = [
  checkSchema(readingIdSchema),
  checkSchema(readingIdExistsSchema),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // check for validation errors first
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json(errors); // respond with the validation errors
      }

      // no validation errors. extract and parse query params of request
      const id = parseInt(req.query.id as string);

      const results = await prisma.readings.delete({
        where: { id: id },
      });

      res.json(results);
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  },
];
