FROM node:26-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:26-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=builder --chown=node:node /app /app
# CLI migration/worker entrypoints use tsx, which is a runtime dependency.
RUN npm prune --omit=dev --no-audit --no-fund
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
