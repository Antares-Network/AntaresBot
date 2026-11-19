# syntax=docker/dockerfile:1

# ---- build: compile TypeScript ----
FROM node:26.13.1-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- prod deps only ----
FROM node:26.13.1-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ---- runtime: no compiler, no dev deps, non-root ----
FROM node:26.13.1-alpine3.24
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=root:root /app/node_modules ./node_modules
COPY --from=build --chown=root:root /app/dist ./dist
COPY --chown=root:root package.json ./
USER node
# Healthy = the bot wrote its heartbeat (gateway READY + DB ping OK) within the last 2 minutes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "const s=require('fs').statSync('/tmp/antaresbot-heartbeat');process.exit(Date.now()-s.mtimeMs<120000?0:1)"
CMD ["node", "--enable-source-maps", "dist/index.js"]
