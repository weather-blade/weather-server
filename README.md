# weather-server

This repo contains source code for the weather station server backend API.

The API is used mainly for saving new readings generated
by [weather station](https://github.com/weather-blade/weather-station). The readings are stored in
SQLite.

The endpoints for getting the readings are cached with Redis.

There is endpoint for server-sent events for real time updates of the frontend whenever new reading is received.

The API can get forecast from [Met.no API](https://api.met.no/) and serve as proxy between frontend and Met.no API. The forecast will then be cached in memory until next forecast model update.

## How to run this locally

- Clone the repo, then create `.env` file - see [`.env.example`](https://github.com/Bladesheng/weather-station-backend/blob/main/.env.example)

- Get Google service account JSON key and place it in the root of the project

- Install packages:

```sh
pnpm install
```

- Start docker compose:

```sh
pnpm run docker
```

- Run migrations:

```sh
npx prisma migrate dev
```

- Start dev server:

```sh
pnpm run dev
```
