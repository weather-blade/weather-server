import type { ConnectionOptions } from 'bullmq';
import { Queue, Worker } from 'bullmq';
import { PushService } from '../services/push.service.js';
import { ForecastService } from '../services/forecast.service.js';

const QUEUE_NAME = 'notifications';

const connection: ConnectionOptions = {
	host: 'redis',
	port: 6379,
};

const queue = new Queue(QUEUE_NAME, {
	connection,
});

await queue.obliterate();

const worker = new Worker(
	QUEUE_NAME,
	async (job) => {
		const notification = await ForecastService.getNotification();

		await PushService.sendNotification(JSON.stringify(notification));
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
}
