# @x402place/shared

Shared utilities, types, and database client used by both the backend and worker packages.

## Contents

- **Database**: Prisma client and database utilities
- **Redis**: Redis connection and utilities
- **Canvas**: Canvas-related utilities
- **Types**: Shared TypeScript type definitions

## Development

Generate Prisma client:

```bash
pnpm db:generate
```

Run database migrations:

```bash
pnpm db:migrate
```

## Usage

Import from this package in backend or worker:

```typescript
import { db, redis, type Pixel } from '@x402place/shared';
```

## Structure

- `lib/` - Utility functions and clients
  - `db.ts` - Prisma database client
  - `redis.ts` - Redis client
  - `canvas.ts` - Canvas utilities
- `types/` - TypeScript type definitions
  - `pixel.ts` - Pixel-related types
- `prisma/` - Prisma schema and migrations
