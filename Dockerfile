# ==========================================
# Multi-Stage Production Dockerfile for HIMS Backend
# ==========================================

# 1. Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# 2. Production Dependencies Stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 3. Final Production Runtime Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root system user for security
RUN addgroup -S himsgroup && adduser -S himsuser -G himsgroup

# Copy compiled code and production modules
COPY --from=deps --chown=himsuser:himsgroup /app/node_modules ./node_modules
COPY --from=builder --chown=himsuser:himsgroup /app/dist ./dist
COPY --chown=himsuser:himsgroup package.json ./

USER himsuser

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
