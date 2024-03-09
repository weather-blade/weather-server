import { Response } from 'express';
import crypto from 'node:crypto';

export class SSEConnection {
	public id: string;
	public res: Response;
	public isOpen: boolean;
	private static KEEP_ALIVE_MS = 30_000;

	constructor(res: Response) {
		this.id = crypto.randomUUID();
		this.res = res;
		this.isOpen = true;

		setTimeout(this.keepAlive.bind(this), SSEConnection.KEEP_ALIVE_MS);

		this.res.on('close', this.closeConnection.bind(this));
	}

	/**
	 * Keeps sending keep-alive comment messages to prevent timeout
	 */
	private keepAlive() {
		if (!this.isOpen) return;

		try {
			this.res.write(':\n\n');
			this.res.flush();
		} catch (error) {
			console.error(error);
		}

		setTimeout(this.keepAlive.bind(this), SSEConnection.KEEP_ALIVE_MS);
	}

	private closeConnection() {
		this.res.end();
		this.res.socket?.destroy();

		// stop sending keep-alive messages
		this.isOpen = false;
	}
}
