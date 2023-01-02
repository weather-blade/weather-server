import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../../db";

// GET

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const statusQuery = req.query.status ? String(req.query.status) : undefined;

    const readings = await prisma.readings.findMany({
      where: {
        quality: {
          status: statusQuery, // does not do anything if it is undefined
        },
      },
      include: { quality: true },
    });
    res.json(readings);
  } catch (error) {
    return res.status(500).send("500 Internal Server Error");
  }
}

export async function getTimeRange(req: Request, res: Response, next: NextFunction) {
  try {
    const startTime = new Date(String(req.query.start));
    const endTime = new Date(String(req.query.end));
    const statusQuery = req.query.status ? String(req.query.status) : undefined;

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).send("400 Bad Request (use ISO 8601 time format)");
    }

    const readings = await prisma.readings.findMany({
      where: {
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
        quality: {
          status: statusQuery, // does not do anything if it is undefined
        },
      },
      include: { quality: true },
    });

    res.json(readings);
  } catch (error) {
    return res.status(500).send("500 Internal Server Error");
  }
}

// POST

export const postReading = [
  // validate and sanitize inputs first
  body("status", "Status must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .custom(async (inputValue) => {
      // custom validator to check against statuses stored in database
      const results = await prisma.quality.findMany({
        select: { status: true },
      });

      // array with all the possible statuses
      const statuses = results.map((result) => result.status);

      if (!statuses.includes(inputValue)) {
        throw new Error(`Status must be equal to one of predefined statuses: [${statuses}]`);
      }

      return true;
    })
    .escape(),

  body("createdAt", "Date must comply with ISO8601").optional().trim().isISO8601().escape(),

  body("temperature_BMP", "Temperature_BMP must be non-empty number.").trim().isNumeric().escape(),
  body("temperature_DHT", "Temperature_DHT must be non-empty number.").trim().isNumeric().escape(),
  body("pressure_BMP", "Pressure_BMP must be non-empty number.").trim().isNumeric().escape(),
  body("humidity_DHT", "Humidity_DHT must be non-empty number.").trim().isNumeric().escape(),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // check for validation errors first
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json(errors); // respond with the validation errors
      }

      // no validation errors. extract and parse values from body of request

      const { status } = req.body;

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
          quality: { connect: { status: status } },

          createdAt,

          temperature_BMP,
          temperature_DHT,
          pressure_BMP,
          humidity_DHT,
        },
      });

      if (req.headers["short"] === "true") {
        return res.sendStatus(200);
      }

      res.json(result);
    } catch (error) {
      return res.status(500).send("500 Internal Server Error");
    }
  },
];

// PUT

// DELETE
