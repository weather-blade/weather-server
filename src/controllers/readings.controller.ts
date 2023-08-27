import { checkSchema, validationResult } from "express-validator";
import { prisma } from "../db/prisma.js";
import { sendEventsToAll } from "../controllers/readingsEvents.controller.js";
import * as readingsValidator from "../validations/readings.validation.js";
import { redisClient } from "../db/redis.js";
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

export async function getLast24h(req: Request, res: Response, next: NextFunction) {
  try {
    const cacheResults = await redisClient.get("readings24h");

    if (cacheResults) {
      const readings = JSON.parse(cacheResults);
      res.json(readings);
    } else {
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // from 24 hours ago (miliseconds)
      const endTime = new Date(); // up until now

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

      redisClient.set("readings24h", JSON.stringify(readings), {
        EX: 360, // expire after 6 minutes
        NX: true,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("500 Internal Server Error");
  }
}

// POST

export const postReading = [
  checkSchema(readingsValidator.reading),
  checkSchema(readingsValidator.readingDate),

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

      const createdAt = readingsValidator.getDate(req);

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

      // invalidate cache
      redisClient.del("readings24h");
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  },
];

// PUT

export const upsertReading = [
  checkSchema(readingsValidator.readingId),
  checkSchema(readingsValidator.readingDateRequired),
  checkSchema(readingsValidator.reading),

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

      const createdAt = readingsValidator.getDate(req);

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
  checkSchema(readingsValidator.readingId),
  checkSchema(readingsValidator.readingIdExists),

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
