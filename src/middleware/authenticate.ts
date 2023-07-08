import type { Request, Response, NextFunction } from "express";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const { password } = req.headers;
  const { API_PASSWORD } = process.env;

  switch (password) {
    case API_PASSWORD: {
      // password is ok
      next();
      break;
    }

    case undefined: {
      // no password
      res.status(401).send("401 Unauthorized");
      break;
    }

    default: {
      // wrong password
      res.status(403).send("403 Forbidden");
      break;
    }
  }
}
