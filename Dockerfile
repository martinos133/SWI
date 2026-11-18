# Produkčný image aplikácie. Zostavuje sa skriptom deploy/deploy.sh.

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# `prisma generate` (postinstall) potrebuje adresu databázy, pripájať sa k nej nebude.
ENV DATABASE_URL=file:/tmp/build.db
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx next build && rm -rf .next/cache

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:/data/app.db
# Vývojové závislosti ostávajú: tsx je potrebný na naplnenie ukážkových dát (deploy.sh --seed).
COPY --from=build --chown=node:node /app ./
# Adresár pre SQLite databázu; vlastníkom musí byť používateľ, pod ktorým beží aplikácia.
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# Pri štarte sa aplikujú chýbajúce migrácie (Node 24 spúšťa TypeScript priamo).
CMD ["sh", "-c", "node scripts/apply-migrations.mts && exec node_modules/.bin/next start -p 3000 -H 0.0.0.0"]
