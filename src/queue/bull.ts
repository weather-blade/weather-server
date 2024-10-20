import type { ConnectionOptions } from 'bullmq';
import { Queue, Worker } from 'bullmq';
import { PushService } from '../services/push.service.js';
import { ForecastService } from '../services/forecast.service.js';
import { backupDb } from '../scripts/backupDb.js';

const QUEUE_NAME = 'first-queue';

const connection: ConnectionOptions = {
	host: 'localhost',
	port: 6379,
};

const queue = new Queue(QUEUE_NAME, {
	connection,
});

await queue.obliterate();

const worker = new Worker(
	QUEUE_NAME,
	async (job) => {
		switch (job.name) {
			case 'sendNotifications': {
				const notification = await ForecastService.getNotification();
				await PushService.sendNotification(JSON.stringify(notification));
				break;
			}

			case 'backupDb': {
				await backupDb();
				break;
			}
		}
	},
	{ connection }
);

worker.on('completed', (job) => {
	console.log(`[bullmq] ${job.name}-${job.id} has completed `);
});

worker.on('failed', (job, err) => {
	console.error(`[bullmq] ${job?.name}-${job?.id} has failed with ${err.message}`);
});

export async function initQueue() {
	await queue.add(
		'sendNotifications',
		{},
		{
			repeat: {
				// every morning at 04:00
				pattern: '0 4 * * *',
			},
		}
	);

	await queue.add(
		'backupDb',
		{},
		{
			repeat: {
				// every morning at 02:00
				pattern: '0 2 * * *',
			},
		}
	);
}
