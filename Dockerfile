# Build context is the repository root: the web app is a pnpm workspace member
# and needs the root lockfile plus packages/tracker to build.
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/docs/package.json apps/docs/
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
