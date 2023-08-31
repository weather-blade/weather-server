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

export async function getMonth(req: Request, res: Response, next: NextFunction) {
  try {
    const WEEK_SECONDS = 604800;

    const year = Number(req.query.year);
    const month = Number(req.query.month);

    const firstDay = new Date();
    // -1 because months are 0 indexed
    // 1 to get fist day of that month
    firstDay.setUTCFullYear(year, month - 1, 1);

    const lastDay = new Date(firstDay);
    lastDay.setUTCMonth(firstDay.getMonth() + 1); // the next month
    lastDay.setUTCDate(0); // 0 will allways give you last day of the previous month

    if (isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
      return res.status(400).send("400 Bad Request (wrong year / month format)");
    }

    const cacheName = `${firstDay.getUTCFullYear()}-${firstDay.getUTCMonth()}`;
    const cacheResults = await redisClient.get(cacheName);

    if (Date.now() > lastDay.getTime()) {
      // cache in browser for 7 days if the month already passed
      // (because readings from previous months shouldn't change)
      res.set("Cache-Control", `max-age=${WEEK_SECONDS}`);
    }

    if (cacheResults) {
      const readings = JSON.parse(cacheResults);
      res.json(readings);
    } else {
      const readings = await prisma.readings.findMany({
        where: {
          createdAt: {
            gte: firstDay,
            lte: lastDay,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(readings);

      redisClient.set(cacheName, JSON.stringify(readings), {
        EX: WEEK_SECONDS, // expire after 7 days
      });
    }
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

      // invalidate today's cache
      redisClient.del("readings24h");

      // invalidate either given month's cache or current month's cache
      const year = new Date().getUTCFullYear();
      const month = createdAt?.getUTCMonth() ?? new Date().getUTCMonth();
      redisClient.del(`${year}-${month}`);
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
