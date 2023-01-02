import { Request, Response, NextFunction } from "express";
import { body, query, checkSchema, Schema, validationResult } from "express-validator";
import { prisma } from "../../db";

// GET

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const readings = await prisma.quality.findMany({});
    res.json(readings);
  } catch (error) {
    console.error(error);
    return res.status(500).send("500 Internal Server Error");
  }
}

// POST

const statusSchema: Schema = {
  status: {
    trim: true,
    escape: true,
    isLength: {
      errorMessage: "Status must not be empty",
      options: { min: 1 },
    },
    custom: {
      options: async (inputValue) => {
        // custom validator to prevent duplicates
        const quality = await prisma.quality.findUnique({
          where: { status: inputValue },
        });

        if (quality !== null) {
          throw new Error("Status already exists");
        }

        return true; // no duplicates were found. continue
      },
    },
  },
};

const idSchema: Schema = {
  id: {
    trim: true,
    escape: true,
    isNumeric: true,
    errorMessage: "ID must be number",
    custom: {
      options: async (inputValue) => {
        // custom validator for checking if there is matching id in database
        await prisma.quality.findFirstOrThrow({
          where: { id: parseInt(inputValue) },
        });

        return true; // reading with matching id was found. continue
      },
    },
  },
};

export const postQuality = [
  // validate and sanitize inputs first
  checkSchema(statusSchema),

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

      const result = await prisma.quality.create({
        data: { status },
      });

      res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  },
];

// PUT

export const updateQuality = [
  // validate and sanitize inputs first
  checkSchema(idSchema),
  checkSchema(statusSchema),

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

      const result = await prisma.quality.update({
        where: { id: id },
        data: { status },
      });

      res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  },
];

// DELETE
