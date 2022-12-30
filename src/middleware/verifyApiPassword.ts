import { Request, Response, NextFunction } from "express";

export function verifyApiPassword(req: Request, res: Response, next: NextFunction) {
  const { password } = req.headers;
  const { API_PASSWORD } = process.env;

  if (password === API_PASSWORD) {
    // password is ok. continue
    next();
  } else if (password === undefined) {
    // no password
    res.status(401).send("401 Unauthorized");
  } else {
    // wrong password
    res.status(403).send("403 Forbidden");
  }
}
