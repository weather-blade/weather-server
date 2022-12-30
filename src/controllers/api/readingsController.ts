import { Request, Response, NextFunction } from "express";
import { prisma } from "../../db";

// GET

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const readings = await prisma.readings.findMany();
    res.json(readings);
  } catch (error) {
    return next(error);
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
    });

    res.json(readings);
  } catch (error) {
    return next(error);
  }
}

// POST

// PUT

// DELETE
