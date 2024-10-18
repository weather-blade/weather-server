import { prisma } from '../db/prisma.js';
import type { PushSubscription } from 'web-push';
import webpush from 'web-push';
import { AppError } from '../exceptions/AppError.js';

export class PushService {
	static {
		webpush.setVapidDetails(
			'mailto:keadr23@gmail.com',
			process.env.VAPID_PUBLIC_KEY,
			process.env.VAPID_PRIVATE_KEY
		);
	}

	public static getVapidPublicKey() {
		return process.env.VAPID_PUBLIC_KEY;
	}

	private static async sendPush(pushSubscription: PushSubscription, payload: string) {
		await webpush.sendNotification(pushSubscription, payload, {
			TTL: 5 * 60 * 60, // 5 hours
		});
	}

	/**
	 * Saves push subscription to database
	 * @param subscription
	 */
	public static async saveSubscription(subscription: PushSubscription) {
		const result = await prisma.push_subscriptions.create({
			data: {
				push_subscription: JSON.stringify(subscription),
			},
		});

		const message = JSON.stringify({
			title: 'Meteostanice',
			body: 'Notifikace byly zapnuty',
		});

		try {
			await PushService.sendPush(subscription, message);
		} catch (error) {
			console.log('Deleting invalid subscription', subscription);

			await prisma.push_subscriptions.delete({
				where: { id: result.id },
			});

			//@ts-ignore
			throw new AppError(400, 'Bad request (invalid subscription)', error.message);
		}

		return result;
	}

	/**
	 * Sends push notification to all active subscriptions in database.
	 * Removes all inactive subscriptions at the same time.
	 */
	public static async sendNotification(payload: string) {
		const subscriptions = await prisma.push_subscriptions.findMany();

		const requests = subscriptions.map((subscription) => {
			return async () => {
				const pushSubscription: PushSubscription = JSON.parse(subscription.push_subscription);

				try {
					await PushService.sendPush(pushSubscription, payload);
				} catch (error) {
					//@ts-ignore
					if (error?.statusCode === 404 || error?.statusCode === 410) {
						try {
							console.log('Deleting expired / invalid subscription', subscription);

							await prisma.push_subscriptions.delete({
								where: { id: subscription.id },
							});
						} catch (error) {
							console.error('Error deleting subscription', error);
						}
					} else {
						console.error('Error sending push message', error, subscription);
					}
				}
			};
		});

		await Promise.allSettled(requests.map((fn) => fn()));
	}
}
