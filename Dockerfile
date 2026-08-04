# Build context is the repository root: the web app is a pnpm workspace member
# and needs the root lockfile plus packages/tracker to build.
#
# Pinned to the patch, not `node:22`, because the tzdata release is a property
# of the Node version: it is compiled in, so this tag fixes `process.versions.tz`
# exactly, where the database's copy comes from its image's OS packages and can
# move under a tag that never changed. See docker-compose.yml.
FROM node:22.23.2-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# The zone database this image is built against, asserted rather than assumed.
#
# The dashboard resolves a window's boundaries in JS and groups the buckets
# inside it in SQL (app/lib/timezone.ts, getWebsiteViewsTimeSeries), so the two
# tzdata releases have to agree about a zone or the two halves of one chart
# disagree by that zone's offset — with nothing on screen to say so, months
# after whichever image moved. Held to the value docker-compose.yml pins the
# Postgres image to; bumping the base image above without bumping both fails
# here, at build, instead of at some transition next November.
ARG AURORA_TZDATA=2026a
RUN node -e 'const want = process.env.AURORA_TZDATA, got = process.versions.tz; if (want !== got) { console.error(`tzdata mismatch: node ${process.version} ships ${got}, this image is pinned to ${want}. Match AURORA_TZDATA here and in docker-compose.yml to a release both images carry.`); process.exit(1); }'

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/tracker/package.json packages/tracker/
RUN pnpm install --frozen-lockfile --filter web... --filter tracker...

FROM deps AS build
COPY . .
RUN pnpm --filter web build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/tracker/package.json packages/tracker/
RUN pnpm install --frozen-lockfile --prod --filter web...

FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/build ./apps/web/build
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY package.json pnpm-workspace.yaml ./

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "./node_modules/@react-router/serve/bin.cjs", "./build/server/index.js"]
