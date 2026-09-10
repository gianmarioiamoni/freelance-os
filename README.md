# FreelanceOS

FreelanceOS is a web application for freelancer operations management.

## Status

Release 0 — Foundation. EPIC-002 Phase 3 (Constraints, Repositories & Seed) is complete.

Planning and architecture documents are the source of truth. See [`MASTER_PLAN.md`](./MASTER_PLAN.md).

## Prerequisites

- Node.js 20 or later
- [pnpm](https://pnpm.io) 10 or later
- PostgreSQL 17 (local development database)

The documented local database is Homebrew `postgresql@17`. Any local PostgreSQL 16+ instance can be used if `DATABASE_URL` points at a dedicated `freelance_os` database.

## Installation

```bash
pnpm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env`. Prisma reads this file from the project root. Do not commit `.env`. Do not prefix the variable with `NEXT_PUBLIC_`.

Start PostgreSQL, create the database if needed, then apply committed migrations:

```bash
brew services start postgresql@17
createdb freelance_os
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

`pnpm install` also runs `prisma generate`. The Prisma schema now includes the application-owned persistence models.

## Commands

| Command                  | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `pnpm dev`               | Start the development server                                     |
| `pnpm build`             | Create a production build                                        |
| `pnpm start`             | Start the production server                                      |
| `pnpm lint`              | Run ESLint                                                       |
| `pnpm typecheck`         | Run TypeScript type checking                                     |
| `pnpm test`              | Run unit tests                                                   |
| `pnpm test:watch`        | Run unit tests in watch mode                                     |
| `pnpm test:e2e`          | Run the application smoke test                                   |
| `pnpm format`            | Format project files with Prettier                               |
| `pnpm db:generate`       | Generate the Prisma Client                                       |
| `pnpm db:migrate`        | Create and apply a development migration (`prisma migrate dev`)  |
| `pnpm db:migrate:deploy` | Apply committed migrations (`prisma migrate deploy`)             |
| `pnpm db:reset`          | Reset the local database and replay migrations. Development only |
| `pnpm db:seed`           | Apply the deterministic development seed                         |

## Repository structure

```text
freelance-os/
├── README.md
├── MASTER_PLAN.md
├── CHANGELOG.md
├── docs/
├── src/
│   ├── app/
│   ├── features/
│   ├── components/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── lib/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── public/
```

Canonical technical documentation lives under `docs/`.
