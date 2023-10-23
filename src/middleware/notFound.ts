import type { Request, Response } from 'express';

export function notFound(req: Request, res: Response) {
	res.sendStatus(404);
}
