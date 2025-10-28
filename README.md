# x402place

A monorepo project for x402place, structured with multiple packages for better code organization and separation of concerns.

## Project Structure

This is a monorepo managed with pnpm workspaces and Turbo. The project is organized into the following packages:

```
packages/
├── app/        # Next.js frontend application
├── backend/    # Backend API server
├── shared/     # Shared code, types, and utilities used by both backend and worker
└── worker/     # Background worker for recurring jobs
```

### Package Details

- **`packages/app`**: Next.js 16 application with React 19, Tailwind CSS 4
- **`packages/backend`**: Backend server (setup in progress)
- **`packages/shared`**: Shared utilities, types, Prisma client, and Redis configuration
- **`packages/worker`**: Background job processor (setup for later)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (install with `npm install -g pnpm`)
- Docker (for PostgreSQL)

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Start PostgreSQL:

```bash
docker-compose up -d
```

3. Set up the database:

```bash
cd packages/shared
pnpm db:migrate
pnpm db:generate
```

### Development

Run all packages in development mode:

```bash
pnpm dev
```

Or run individual packages:

```bash
# Frontend only
pnpm app:dev

# Backend only
pnpm backend:dev

# Worker
pnpm worker:start
```

### Database

PostgreSQL is configured via Docker Compose on port 5471. Connection details:

- Host: localhost:5471
- Database: x402place
- User: postgres
- Password: postgres

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Node.js, TypeScript
- **Database**: PostgreSQL, Prisma ORM
- **Cache**: Redis
- **Monorepo**: pnpm workspaces, Turbo

## Scripts

- `pnpm dev` - Start all packages in development mode
- `pnpm build` - Build all packages
- `pnpm app:dev` - Start only the Next.js app
- `pnpm backend:dev` - Start only the backend server
- `pnpm worker:start` - Start the worker process
