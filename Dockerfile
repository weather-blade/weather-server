FROM node:18.17.1-bullseye-slim as builder
RUN apt-get update && apt-get upgrade -y

RUN mkdir /app
WORKDIR /app

# get dependencies first separately
COPY package.json package-lock.json ./
# You have to copy schema before you run install for reasons unknown to man. Otherwise running build will fail.
COPY prisma/schema.prisma ./
ENV NODE_ENV production
RUN npm ci

# the rest of the source code needed for building
COPY . .

RUN npm run build


FROM node:18.17.1-bullseye-slim as deployment
RUN apt-get update && apt-get upgrade -y

RUN apt-get install redis-server -y

# keep only files needed to run the server
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json
COPY --from=builder /app/prisma /app/prisma

WORKDIR /app
ENV NODE_ENV production
LABEL fly_launch_runtime="nodejs"

CMD service redis-server start & npm run start
