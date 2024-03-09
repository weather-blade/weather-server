import type { Response, Request, NextFunction } from 'express';
import { AppError } from './AppError.js';

type ErrorResponse = {
	statusCode: number;
	message: string;
	errors?: object;
};

export class ErrorHandler {
	public static handleError(
		err: AppError | Error,
		req: Request,
		res: Response,
		next: NextFunction
	) {
		console.log('Error', err);

		if (err instanceof AppError) {
			ErrorHandler.handleKnownError(err, req, res);
		} else {
			ErrorHandler.handleUnknownError(err, req, res);
		}
	}

	private static handleKnownError(err: AppError, req: Request, res: Response) {
		const { statusCode, message } = err;

		const response: ErrorResponse = {
			statusCode,
			message,
		};

		if (err.errors) {
			response.errors = err.errors;
		}

		return res.status(statusCode).json(response);
	}

	private static handleUnknownError(err: Error, req: Request, res: Response) {
		res.status(500).json({
			statusCode: 500,
			message: 'Internal server error',
		});
	}
}
