import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import morgan from "morgan";

import apiRouter from "./routes/api/api";

dotenv.config();

const app = express();

app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS handling
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    "https://bladesheng.github.io/weather-station-frontend/",
    "http://localhost:8000",
  ];

  const origin = String(req.headers.origin);
  const resOrigin = allowedOrigins.indexOf(origin) >= 0 ? origin : allowedOrigins[0];

  res.header("Access-Control-Allow-Origin", resOrigin);
  res.header("Access-Control-Allow-Headers", "Content-Type, password, short");
  res.header("Access-Control-Max-Age", "86400"); // skip recurent preflight requests for 24h

  next();
});

app.use("/api", apiRouter);

app.use((req: Request, res: Response) => {
  res.sendStatus(404);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`[server] Server is running at http://localhost:${port}`);
});
