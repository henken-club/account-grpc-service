# Nodejs for Prisma
FROM node:16.4.2-slim AS node-for-prisma

RUN apt-get update && apt-get install -y --no-install-recommends \
  libssl-dev=1.1.1d-0+deb10u6 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# whole dependencies
FROM node-for-prisma AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY schema.prisma ./
RUN npm run prisma:generate

# production only dependencies
FROM deps AS deps-production
WORKDIR /app

RUN npm prune --production

# builder
FROM deps AS builder
WORKDIR /app

COPY scripts/protogen ./scripts/protogen
COPY proto ./proto
RUN npm run protogen

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# runner
FROM node-for-prisma AS runner
WORKDIR /app

ENV PORT 5000
ENV NODE_ENV production

COPY --from=deps-production /app/package.json ./package.json
COPY --from=deps-production /app/node_modules ./node_modules
COPY --from=builder /app/proto ./proto
COPY --from=builder /app/dist ./dist

EXPOSE $PORT

CMD ["node", "dist/main.js"]
