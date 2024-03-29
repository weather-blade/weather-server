# weather-server

This repo contains source code for the weather station server backend API and docker-compose with all the services (docker images) needed to run the server:

- The Node server itself
- Postgres database
- Redis
- [Python script](https://github.com/weather-blade/weather-db-backup) for backing up the database once a day
- [Go script](https://github.com/weather-blade/weather-notifications) for sending out web push notifications once a day

The API is used mainly for saving new readings generated by [weather station](https://github.com/weather-blade/weather-station). The readings are stored in Postgres.

The endpoints for getting the readings are cached with Redis.

There is endpoint for server-sent events for real time updates of the frontend whenever new reading is received.

The API can get forecast from [Met.no API](https://api.met.no/) and serve as proxy between frontend and Met.no API. The forecast will then be cached in memory until next forecast model update.

Github action automatically builds the server image and then upload it to Github container registry on every commit.

The production docker-compose just glues all the images together, so that the only thing running on production is Docker. Everything is hosted on VPS.

## How to run this locally

- Clone the repo, then create `.env` file - see [`.env.example`](https://github.com/Bladesheng/weather-station-backend/blob/main/.env.example)

- Get Google service account JSON key and place it in the same folder as docker-compose - same as [here](https://github.com/weather-blade/weather-db-backup)

- Install packages:

```sh
pnpm install
```

- Run the docker compose:

```sh
pnpm run docker
```

- Connect to the server container:

```sh
docker compose exec server sh
```

- Run this inside the container to push the Prisma schema to the database and seed it:

```sh
pnpm run db:push
pnpm run db:seed
```
