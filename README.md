# FreelanceOS

FreelanceOS is a web application for freelancer operations management.

## Status

Release 0 — Foundation. EPIC-002 Phase 4 (Integration Testing & CI Database Gate) is complete.

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

Set `DATABASE_URL` and `TEST_DATABASE_URL` in `.env`. Prisma reads `.env` from the project root. Do not commit `.env`. Do not prefix either variable with `NEXT_PUBLIC_`.

`DATABASE_URL` is the development database (`freelance_os`). `TEST_DATABASE_URL` must be a separate disposable database whose name ends in `_test` (documented default: `freelanceos_test`). Integration tests refuse the development database.

Start PostgreSQL, create the databases if needed, then apply committed migrations:

```bash
brew services start postgresql@17
createdb freelance_os
createdb freelanceos_test
pnpm db:migrate:deploy
pnpm db:seed
pnpm test:db:migrate
pnpm dev
```

`pnpm db:migrate:deploy` applies the committed Prisma migration chain to `DATABASE_URL`. `pnpm test:db:migrate` applies the same chain to `TEST_DATABASE_URL`. Do not use `prisma db push` for either database.

Persistence integration tests run against real PostgreSQL:

```bash
pnpm test:integration
```

The GitHub Actions quality workflow starts PostgreSQL 17, sets isolated test credentials, applies migrations, then runs unit and integration tests.

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
| `pnpm test:integration`  | Run persistence integration tests against `TEST_DATABASE_URL`    |
| `pnpm test:db:migrate`   | Apply committed migrations to the isolated test database         |
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
