# Lawnotation: the Nuxt app (pages + Nitro server) and its migration runner.
#
#   docker build -t lawnotation lawnotation-ui
#   docker run -e DATABASE_URL=... -e NUXT_PUBLIC_BASE_URL=... lawnotation
#   docker run -e DATABASE_URL=... lawnotation node scripts/migrate.mjs
#
# Configuration is read at runtime from NUXT_* variables (see .env.example),
# so one image serves any host.

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
# Test tooling is not needed to build the app.
ENV CYPRESS_INSTALL_BINARY=0 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build \
 && cp -rL node_modules/postgres /tmp/postgres

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
# psql, for loading a legacy Supabase backup (scripts/restore-legacy-backup.sh).
RUN apk add --no-cache postgresql17-client
COPY --from=build /app/.output ./.output
# The migration runner needs only the postgres driver (no dependencies of its own).
COPY --from=build /tmp/postgres ./node_modules/postgres
COPY scripts/migrate.mjs scripts/import-legacy.mjs scripts/restore-legacy-backup.sh ./scripts/
COPY db ./db
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
