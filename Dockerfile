FROM oven/bun:1.3.11 AS builder
WORKDIR /app

# Install dependencies
COPY package.json bun.lock .npmrc ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/game/package.json ./packages/game/
COPY packages/utils/package.json ./packages/utils/
COPY packages/db/package.json ./packages/db/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build --filter=server

# Runtime
FROM node:22-slim AS runner
WORKDIR /app
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/index.js"]
