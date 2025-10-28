# Base stage
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# Install dependencies
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
FROM dependencies AS prisma
COPY packages/shared/prisma ./packages/shared/prisma
RUN cd packages/shared && pnpm db:generate

# Build stage
FROM prisma AS build
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared
COPY tsconfig.json ./
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

# Copy built files and prisma
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=prisma /app/packages/shared/node_modules/.prisma ./packages/shared/node_modules/.prisma

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "packages/backend/dist/server.js"]

