# syntax=docker/dockerfile:1

# ---------- Build: cài workspace + build launcher ----------
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable

# Copy manifest trước để cache bước cài đặt.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/launcher/package.json apps/launcher/
COPY apps/party-server/package.json apps/party-server/
COPY packages/party/package.json packages/party/
COPY packages/sdk/package.json packages/sdk/
COPY packages/ui/package.json packages/ui/
COPY mini-apps mini-apps
RUN pnpm install --frozen-lockfile

COPY . .

# Server phòng ở domain khác thì truyền: --build-arg VITE_PARTY_URL=wss://phong.example.com/party
ARG VITE_PARTY_URL=""
ENV VITE_PARTY_URL=${VITE_PARTY_URL}
RUN pnpm build

# ---------- Runtime: một process phục vụ web app + WebSocket /party ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0 \
    STATIC_DIR=/app/public

COPY apps/party-server/package.json ./
RUN npm install --omit=dev --no-package-lock --no-audit --no-fund && npm cache clean --force

COPY apps/party-server/server.mjs ./
COPY --from=build /repo/apps/launcher/dist ./public

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8787/healthz || exit 1

CMD ["node", "server.mjs"]
