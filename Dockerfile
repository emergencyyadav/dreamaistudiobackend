# Multi-stage Dockerfile for Luvora Full-Stack Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend dependencies and build
COPY my-app/package*.json ./my-app/
RUN cd my-app && npm ci

# Copy all source files
COPY . .

# Build frontend asset bundle
RUN npm run frontend:build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy root package files & install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy application files & compiled frontend
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/db.mjs ./db.mjs
COPY --from=builder /app/generate_xpub.mjs ./generate_xpub.mjs
COPY --from=builder /app/my-app/dist ./my-app/dist

EXPOSE 5000

CMD ["node", "server.mjs"]
