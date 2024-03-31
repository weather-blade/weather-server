import { prisma } from '../db/prisma.js';
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';

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
		await webpush.sendNotification(pushSubscription, payload);
	}

	/**
	 * Saves push subscription to database
	 * @param subscription
	 */
	public static async saveSubscription(subscription: string) {
		const result = await prisma.pushSubscriptions.create({
			data: {
				pushSubscription: subscription,
			},
		});

		const message = JSON.stringify({
			title: 'Meteostanice',
			body: 'Notifikace byly zapnuty',
		});

		try {
			await PushService.sendPush(subscription as unknown as PushSubscription, message);
		} catch (error) {
			console.log('Deleting invalid subscription', subscription);

			await prisma.pushSubscriptions.delete({
				where: { id: result.id },
			});

			throw error;
		}

		return result;
	}

	/**
	 * Sends push notification to all active subscriptions in database.
	 * Removes all inactive subscriptions at the same time.
	 */
	public static async sendNotification(payload: string) {
		const subscriptions = await prisma.pushSubscriptions.findMany();

		const requests = subscriptions.map((subscription) => {
			return async () => {
				const pushSubscription = subscription.pushSubscription as unknown as PushSubscription;

				try {
					await PushService.sendPush(pushSubscription, payload);
				} catch (error) {
					//@ts-ignore
					if (error?.statusCode === 404 || error?.statusCode === 410) {
						try {
							console.log('Deleting expired / invalid subscription', subscription);

							await prisma.pushSubscriptions.delete({
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
