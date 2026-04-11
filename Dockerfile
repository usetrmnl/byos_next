ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base

LABEL org.opencontainers.image.title="TRMNL BYOS Next.js"
LABEL org.opencontainers.image.description="A Next.js application for BYOS"
LABEL org.opencontainers.image.vendor="rbouteiller"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

# Install dependencies only when needed
FROM base AS deps

ARG BROWSER=false

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --no-optional

# Skip optional deps (puppeteer/puppeteer-core) by default.
# When BROWSER=true, also install puppeteer-core for CDP remote connections.
# puppeteer-core does not download Chromium — that's only the full puppeteer package.
RUN if [ "$BROWSER" = "true" ]; then \
    pnpm add puppeteer-core; \
fi
RUN rm -rf ~/.npm ~/.pnpm-store

# Build the application
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

# Development stage
FROM base AS development

ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Production image, copy all the files and run next
FROM base AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p .next/cache
RUN chown -R nextjs:nodejs .next

USER 1001:1001

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
