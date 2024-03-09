import { prisma } from '../db/prisma.js';

export class PushService {
	/**
	 * Returns public VAPID key
	 */
	public static getVapidPublicKey() {
		return process.env.VAPID_PUBLIC_KEY;
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

		return result;
	}
}
