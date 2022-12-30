import { Request, Response, NextFunction } from "express";
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
    });
    res.json(readings);
  } catch (error) {
    return next(error);
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
    });

    res.json(readings);
  } catch (error) {
    return next(error);
  }
}

// POST

// PUT

// DELETE
