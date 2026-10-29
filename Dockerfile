# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=26
ARG BUN_VERSION=1.4.3

FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG BUN_VERSION

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_HTML_OPEN=never \
    BUN_INSTALL_CACHE_DIR=/root/.bun/install/cache \
    DO_NOT_TRACK=1

# hadolint ignore=DL3008
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates git jq \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g "bun@${BUN_VERSION}" \
 && bun --version

WORKDIR /app

COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
 && chmod +x /usr/local/bin/docker-entrypoint.sh

FROM base AS deps-prep
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

COPY package.json bun.lock ./
RUN jq '{name, packageManager, engines, dependencies, devDependencies, optionalDependencies} | with_entries(select(.value != null))' package.json > package.json.minimal \
 && rm package.json

FROM base AS deps
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

COPY --from=deps-prep /app/package.json.minimal ./package.json
COPY --from=deps-prep /app/bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts \
 && cat bun.lock | sha256sum | cut -d' ' -f1 | tr -d '\n' > node_modules/.install-stamp

RUN bunx playwright install --with-deps chromium \
 && rm -rf /var/lib/apt/lists/*

COPY package.json ./

ENTRYPOINT ["docker-entrypoint.sh"]

FROM deps AS dev
CMD ["bash"]

FROM deps AS ci
COPY . .
RUN bunx wxt prepare
CMD ["bun", "run", "validate"]
