import { checkSchema, validationResult } from "express-validator";
import { PushValidation } from "../validations/push.validation.js";
import { prisma } from "../db/prisma.js";
import webpush from "web-push";
import type { Request, Response, NextFunction } from "express";

export class PushController {
  /**
   * Retuns the public VAPID key
   */
  public static async getPublicKey(req: Request, res: Response, next: NextFunction) {
    try {
      return res.send(process.env.VAPID_PUBLIC_KEY);
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  }

  /**
   * Saves push subscription to database
   */
  public static subscribe = [
    checkSchema(PushValidation.subscription),

    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          console.error(errors);
          res.status(400).json(errors);
          return;
        }

        const subscription = req.body.subscription;

        const result = await prisma.pushSubscriptions.create({
          data: {
            pushSubscription: subscription,
          },
        });

        res.json(result);
      } catch (error) {
        console.error(error);
        return res.status(500).send("500 Internal Server Error");
      }
    },
  ];

  /**
   * @TODO for testing only
   * Sends push notification to all active subscriptions in database.
   * Removes all inactive subscriptions at the same time.
   */
  public static async sendPush(req: Request, res: Response, next: NextFunction) {
    try {
      webpush.setVapidDetails(
        "mailto:keadr23@gmail.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      const subscriptions = await prisma.pushSubscriptions.findMany();

      const MSG = {
        title: "Test notification",
        body: "a body",
      };

      const requests = subscriptions.map((subscription) => {
        return async () => {
          const pushSubscription =
            subscription.pushSubscription as unknown as webpush.PushSubscription;

          try {
            await webpush.sendNotification(pushSubscription, JSON.stringify(MSG));
          } catch (error) {
            //@ts-ignore
            if (error?.statusCode === 404 || error?.statusCode === 410) {
              try {
                console.log("Deleting expired / invalid subscription", subscription);
                await prisma.pushSubscriptions.delete({
                  where: { id: subscription.id },
                });
              } catch (error) {
                console.error("Error deleting subscription", error);
              }
            } else {
              console.error("Error sending push message", error, subscription);
            }
          }
        };
      });

      await Promise.all(requests.map((fn) => fn()));

      res.sendStatus(200);
    } catch (error) {
      console.error(error);
      return res.status(500).send("500 Internal Server Error");
    }
  }
}
