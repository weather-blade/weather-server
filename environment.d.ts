declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      DATABASE_URL: string;
      API_PASSWORD: string;
    }
  }
}

export {};
