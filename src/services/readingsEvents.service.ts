import { Prisma } from '@prisma/client';
import { SSEConnection } from '../controllers/SSEConnection.js';

// all open connections
let connections: SSEConnection[] = [];

export class ReadingsEventsService {
	/**
	 * Saves the connection to list of open connections
	 * @param connection
	 */
	public static saveConnection(connection: SSEConnection) {
		connections.push(connection);

		connection.res.on('close', () => {
			ReadingsEventsService.removeConnection(connection);
		});

		console.log(`[SSE] ${connection.id} Connection opened`);
		console.log(`[SSE] Number of open connections: ${connections.length}`);
	}

	/**
	 * Removes the connection from list of open connections
	 * @param connection
	 */
	public static removeConnection(connection: SSEConnection) {
		connections = connections.filter((c) => c.id !== connection.id);

		console.log(`[SSE] ${connection.id} Connection closed`);
		console.log(`[SSE] Number of open connections: ${connections.length}`);
	}

	/**
	 * Sends reading to all open connections
	 * @param reading
	 */
	public static async sendReadingToAll(reading: Prisma.readingsGetPayload<null>) {
		for (const connection of connections) {
			try {
				connection.res.write(`data: ${JSON.stringify(reading)}\n\n`);
				connection.res.flush();
			} catch (error) {
				console.error(error);
			}
		}
	}
}
