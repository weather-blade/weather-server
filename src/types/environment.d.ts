declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      DATABASE_URL: string;
      API_PASSWORD: string;

      VAPID_PUBLIC_KEY: string;
      VAPID_PRIVATE_KEY: string;
    }
  }
}

export {};
