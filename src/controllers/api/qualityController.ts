import { Request, Response, NextFunction } from "express";
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

// PUT

// DELETE
