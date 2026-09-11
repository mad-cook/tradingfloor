FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 WORKER_PORT=3101 DATA_DIR=/app/data PAPER=1 DATA_MODE=demo
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/scripts/start.mjs ./scripts/start.mjs
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/next.config.ts ./next.config.ts
RUN mkdir -p /app/data && chown -R node:node /app/data
EXPOSE 3100
CMD ["node", "scripts/start.mjs"]
