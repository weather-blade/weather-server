import { Request, Response, NextFunction } from "express";
import { body, checkSchema, Schema, validationResult } from "express-validator";
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

const inputSchema: Schema = {
  status: {
    trim: true,
    isLength: {
      errorMessage: "Status must not be empty",
      options: { min: 1 },
    },
    escape: true,
    custom: {
      options: async (inputValue) => {
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
      },
    },
  },

  temperature_BMP: {
    trim: true,
    isNumeric: true,
    escape: true,
  },
  temperature_DHT: {
    trim: true,
    isNumeric: true,
    escape: true,
  },
  pressure_BMP: {
    trim: true,
    isNumeric: true,
    escape: true,
  },
  humidity_DHT: {
    trim: true,
    isNumeric: true,
    escape: true,
  },
};

export const postReading = [
  // validate and sanitize inputs first
  checkSchema(inputSchema),

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

export const updateReading = [
  // validate and sanitize inputs first
  body("id")
    .trim()
    .isNumeric()
    .escape()
    .custom(async (inputValue) => {
      // custom validator for checking if there is matching id in database
      await prisma.readings.findFirstOrThrow({
        where: { id: parseInt(inputValue) },
      });

      return true; // reading with matching id was found. continue
    }),

  body("createdAt", "Date must comply with ISO8601").trim().isISO8601().escape(),

  checkSchema(inputSchema),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // check for validation errors first
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json(errors); // respond with the validation errors
      }

      // no validation errors. extract and parse values from body of request

      const id = parseInt(req.body.id);

      const { status } = req.body;

      const temperature_BMP = parseFloat(req.body.temperature_BMP);
      const temperature_DHT = parseFloat(req.body.temperature_DHT);
      const pressure_BMP = parseFloat(req.body.pressure_BMP);
      const humidity_DHT = parseFloat(req.body.humidity_DHT);

      const createdAt = new Date(req.body.createdAt);
      if (isNaN(createdAt.getTime())) {
        return res.status(400).send("400 Bad Request (use ISO 8601 time format)");
      }

      const result = await prisma.readings.update({
        where: { id: id },
        data: {
          quality: { connect: { status: status } },

          createdAt,

          temperature_BMP,
          temperature_DHT,
          pressure_BMP,
          humidity_DHT,
        },
      });

      res.json(result);
    } catch (error) {
      return res.status(500).send("500 Internal Server Error");
    }
  },
];

// DELETE
