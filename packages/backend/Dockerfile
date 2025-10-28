# Base stage
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# Copy all source files needed for build
FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/prisma ./packages/shared/prisma
COPY packages/shared/lib ./packages/shared/lib
COPY packages/shared/types ./packages/shared/types
COPY packages/backend/src ./packages/backend/src
COPY tsconfig.json ./

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN cd packages/shared && pnpm db:generate

# Build TypeScript
RUN cd packages/backend && pnpm build

# Production stage
FROM node:20-alpine AS production
RUN npm install -g pnpm
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema and migrations for runtime
COPY packages/shared/prisma ./packages/shared/prisma

# Generate Prisma Client in production
RUN cd packages/shared && pnpm db:generate

# Copy built backend files
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Copy shared source files (needed at runtime)
COPY --from=builder /app/packages/shared/lib ./packages/shared/lib
COPY --from=builder /app/packages/shared/types ./packages/shared/types

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "packages/backend/dist/server.js"]

