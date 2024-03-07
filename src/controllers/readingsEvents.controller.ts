import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

let clients: { id: number; res: Response }[] = []; // all open connections

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

			const clientId = Date.now();
			const newClient = {
				id: clientId,
				res, // save the session response object
			};
			clients.push(newClient);
			console.log(`[SSE] ${clientId} Connection opened`);
			console.log(`[SSE] Number of connected clients: ${clients.length}`);

			const keepAliveMS = 30_000;
			let connectionOpen = true;
			/**
			 * Sends keep-alive comment message to prevent timeout
			 */
			function keepAlive() {
				if (!connectionOpen) return;

				try {
					res.write(':\n\n');
					res.flush();
				} catch (error) {
					console.error(error);
				}

				setTimeout(keepAlive, keepAliveMS);
			}
			setTimeout(keepAlive, keepAliveMS);

			// remove client on connection close
			res.on('close', () => {
				clients = clients.filter((client) => client.id !== clientId);
				res.end();
				res.socket?.destroy();
				// stop sending keep-alive messages
				connectionOpen = false;

				console.log(`[SSE] ${clientId} Connection closed`);
				console.log(`[SSE] Number of connected clients: ${clients.length}`);
			});
		},
	];

	/**
	 * Sends the reading to all connected clients
	 * @param reading
	 */
	public static sendReading(reading: Prisma.ReadingsGetPayload<null>) {
		for (const client of clients) {
			try {
				client.res.write(`data: ${JSON.stringify(reading)}\n\n`);
				client.res.flush();
			} catch (error) {
				console.error(error);
			}
		}
	}
}
