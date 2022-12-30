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

// POST

// PUT

// DELETE
