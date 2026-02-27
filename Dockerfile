# ---- Stage 1: build ----
FROM node:22-slim AS build
WORKDIR /app

# Copy all workspace package.json + lock + turbo config
COPY package.json package-lock.json turbo.json ./
COPY apps/worker/package.json apps/worker/
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/embed/package.json packages/embed/
COPY packages/gallery/package.json packages/gallery/
COPY packages/shared/package.json packages/shared/

RUN npm ci

# Copy full source
COPY . .

# Build dashboard (includes shared + gallery deps via turbo)
RUN npx turbo run build --filter=@hexi/dashboard

# Build worker API with tsup
RUN cd apps/worker && npx tsup src/server.ts --format esm --target node20 \
    --external better-sqlite3 --external sharp --external nodemailer

# ---- Stage 2: production deps ----
FROM node:22-slim AS deps
WORKDIR /app

COPY apps/worker/package.json ./
# Install only production deps (native modules: better-sqlite3, sharp, nodemailer)
RUN npm install --omit=dev

# ---- Stage 3: runtime ----
FROM node:22-slim
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy production node_modules (native bindings match runtime)
COPY --from=deps /app/node_modules ./node_modules

# Copy built worker
COPY --from=build /app/apps/worker/dist ./dist

# Copy built dashboard → ./public (server.ts serves from here)
COPY --from=build /app/apps/dashboard/dist ./public

# Copy migrations for manual DB init
COPY --from=build /app/apps/worker/migrations ./migrations

EXPOSE 4100

CMD ["node", "dist/server.js"]
