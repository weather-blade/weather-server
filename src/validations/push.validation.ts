import type { Schema } from "express-validator";

export class PushValidation {
  public static subscription: Schema = {
    "subscription.endpoint": {
      in: ["body"],
      isString: {
        errorMessage: "Field 'subscription.endpoint' must be string",
        bail: true,
      },
    },
    "subscription.keys.p256dh": {
      in: ["body"],
      isString: {
        errorMessage: "Field 'subscription.keys.p256dh' must be string",
        bail: true,
      },
    },
    "subscription.keys.auth": {
      in: ["body"],
      isString: {
        errorMessage: "Field 'subscription.keys.auth' must be string",
        bail: true,
      },
    },
  };
}
