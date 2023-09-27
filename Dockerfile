FROM node:18.17.1-bullseye-slim as builder
RUN apt-get update && apt-get upgrade -y
RUN npm -g install pnpm@8.7.6

WORKDIR /app

# get dependencies first separately
COPY package.json pnpm-lock.yaml ./
# You have to copy schema before you run install for reasons unknown to man. Otherwise running build will fail.
COPY prisma/schema.prisma ./
ENV NODE_ENV production
RUN pnpm install --frozen-lockfile

# the rest of the source code needed for building
COPY . .

RUN pnpm run build


FROM node:18.17.1-bullseye-slim as deployment
RUN apt-get update && apt-get upgrade -y
RUN npm -g install pnpm@8.7.6

RUN apt-get install redis-server -y

# keep only files needed to run the server
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=builder /app/prisma /app/prisma

WORKDIR /app
ENV NODE_ENV production
LABEL fly_launch_runtime="nodejs"

CMD service redis-server start & npm run start
