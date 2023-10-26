FROM node:18.17.1-bookworm-slim AS builder
RUN apt-get update && apt-get upgrade -y
RUN npm -g install pnpm@8.7.6

WORKDIR /app

# get dependencies first separately
COPY package.json pnpm-lock.yaml ./
# prisma schema, so that prisma client can be generated
COPY prisma/schema.prisma ./
ENV NODE_ENV production
RUN pnpm install --frozen-lockfile

# the rest of the source code needed for building
COPY . .

RUN pnpm run build


FROM node:18.17.1-bookworm-slim AS deployment
RUN apt-get update && apt-get upgrade -y
RUN npm -g install pnpm@8.7.6
RUN apt-get install openssl -y
WORKDIR /app

# keep only files needed to run the server
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=builder /app/prisma /app/prisma

ENV NODE_ENV production
LABEL fly_launch_runtime="nodejs"

CMD pnpm run start
