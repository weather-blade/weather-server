import { Request, Response, NextFunction } from 'express';
import { ReadingsEventsService } from '../services/readingsEvents.service.js';
import { SSEConnection } from '../controllers/SSEConnection.js';

/**
 * Server-sent events
 */
export class ReadingEventsController {
	/**
	 * Opens a new SSE connection and keeps it open
	 */
	public static openConnection = [
		(req: Request, res: Response, next: NextFunction) => {
			const headers = {
				'Content-Type': 'text/event-stream',
				Connection: 'keep-alive',
				'Cache-Control': 'no-cache',
			};
			res.writeHead(200, headers);

			const connection = new SSEConnection(res);

			ReadingsEventsService.saveConnection(connection);
		},
	];
}
