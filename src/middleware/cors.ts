import type { Request, Response, NextFunction } from "express";

const allowedOrigins = ["https://bladesheng.github.io", "http://localhost:8000"];

export function cors(req: Request, res: Response, next: NextFunction) {
  const origin = String(req.headers.origin);
  const resOrigin = allowedOrigins.indexOf(origin) >= 0 ? origin : allowedOrigins[0];

  res.header("Access-Control-Allow-Origin", resOrigin);
  res.header("Access-Control-Allow-Headers", "password, short");
  res.header("Access-Control-Max-Age", "86400"); // skip recurent preflight requests for 24h

  next();
}
