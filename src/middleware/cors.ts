import type { Request, Response, NextFunction } from 'express';

const ALLOWED_ORIGINS = [
	'https://bladesheng.github.io',
	'https://weather-blade.github.io',
	'https://weather.bladesheng.com',
	'http://localhost:8000',
];

export function cors(req: Request, res: Response, next: NextFunction) {
	const origin = String(req.headers.origin);
	const resOrigin = ALLOWED_ORIGINS.indexOf(origin) >= 0 ? origin : ALLOWED_ORIGINS[0];

	res.header('Access-Control-Allow-Origin', resOrigin);
	res.header('Access-Control-Allow-Headers', 'password, short, Content-Type');
	res.header('Access-Control-Max-Age', '86400'); // skip recurent preflight requests for 24h

	next();
}
