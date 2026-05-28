# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS app

# Yarn 3 (Berry) is pinned via the committed release in .yarn/releases and the
# packageManager field; corepack activates it. Enable it as root (it writes a
# shim to /usr/local/bin), then run everything as the unprivileged node user.
RUN corepack enable && mkdir -p /app && chown node:node /app
USER node
WORKDIR /app

# Install dependencies first for better layer caching. PnP needs the committed
# Yarn release and rc file; the lockfile keeps the install reproducible.
COPY --chown=node:node .yarnrc.yml ./
COPY --chown=node:node .yarn ./.yarn
COPY --chown=node:node package.json yarn.lock ./
RUN yarn install --immutable

# Copy the rest of the project and build the production assets (webpack bundles
# plus the GOV.UK Frontend assets/templates copied into the views/public dirs).
COPY --chown=node:node . .
RUN yarn build:prod

EXPOSE 3100

# yarn start runs in production mode (plain HTTP via ts-node). The health route
# is provided by @hmcts/nodejs-healthcheck.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=12 \
  CMD node -e "fetch('http://localhost:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["yarn", "start"]
