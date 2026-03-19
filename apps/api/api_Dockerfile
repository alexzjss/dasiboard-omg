FROM node:20-alpine AS base
RUN npm install -g pnpm@8.15.9

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter @dasiboard/api

# Build
FROM deps AS builder
COPY apps/api ./apps/api
RUN pnpm --filter @dasiboard/api exec prisma generate
RUN pnpm --filter @dasiboard/api build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/index.js"]
