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
# - Pick up Alpine security fixes released after the base image was built (OpenSSL, zlib, ...).
#   Behind a TLS-inspecting proxy, its root CA comes in as an optional build secret (compose.yml);
#   it is only mounted for this step and never stored in the image.
# - Remove npm, npx, corepack and yarn: the bot and dashboard only ever run `node`, and npm's own
#   bundled dependencies (undici, glob, ip-address, ...) were most of the image's known CVEs.
# - Private, bot-owned directory for the heartbeat file (not the world-writable /tmp).
RUN --mount=type=secret,id=build_extra_ca,required=false \
  ca=/etc/ssl/certs/ca-certificates.crt; \
  if grep -qs "BEGIN CERTIFICATE" /run/secrets/build_extra_ca; then \
    cat "$ca" /run/secrets/build_extra_ca > /tmp/build-ca.pem && ca=/tmp/build-ca.pem; \
  fi; \
  SSL_CERT_FILE="$ca" apk upgrade --no-cache \
  && rm -f /tmp/build-ca.pem \
  && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-* \
  && mkdir -p /run/antaresbot && chown node:node /run/antaresbot && chmod 700 /run/antaresbot
USER node
# Healthy = the bot wrote its heartbeat (gateway READY + DB ping OK) within the last 2 minutes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "const s=require('fs').statSync('/run/antaresbot/heartbeat');process.exit(Date.now()-s.mtimeMs<120000?0:1)"
CMD ["node", "--enable-source-maps", "dist/index.js"]
