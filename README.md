# FreelanceOS

FreelanceOS is a web application for freelancer operations management.

## Status

Release 1 — MVP in progress. EPIC-103 complete: workspace-scoped time tracking (create, daily view, weekly timesheet, edit of duration/description/billable, hard delete) with `workDate`, client, and contract immutable after creation. EPIC-102 contract management and EPIC-101 client master-data management remain. EPIC-006 authenticated UI foundation and EPIC-005 isolated E2E / CI contract remain. Authentication remains Better Auth. No billing, rate calculation, analytics, dashboard, or reporting is implemented. Role permissions (OBD-009) and production password-reset email are not decided. This is not production readiness.

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

Set `DATABASE_URL`, `TEST_DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` in `.env`. Optional: `AUTH_EMAIL_DELIVERY` (`development` | `test` | `production`). Prisma reads `.env` from the project root. Do not commit `.env`. Do not prefix secrets with `NEXT_PUBLIC_`.

Email/password registration, sign-in, and sign-out are available at `/sign-up` and `/sign-in`. Password recovery is available at `/forgot-password` and `/reset-password`. Google sign-in is available on the sign-in and sign-up pages when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Configure the Google authorized redirect URI as `${BETTER_AUTH_URL}/api/auth/callback/google` (local example: `http://localhost:3000/api/auth/callback/google`). Email/password remains usable when Google credentials are absent. Registration does not create a workspace. Authenticated users with no membership are sent to `/onboarding` to create their first workspace. Application routes require a Better Auth server session and exactly one workspace membership.

Password-reset email delivery is an application boundary, not a production mailer. Set `AUTH_EMAIL_DELIVERY` to `development`, `test`, or `production`. No production email provider is selected yet; production mode acknowledges the request and does not send mail. Development mode also does not send mail and never logs reset tokens or URLs. Inspect local recovery tokens through the Better Auth `verification` table when needed.

`DATABASE_URL` is the development database (`freelance_os`). `TEST_DATABASE_URL` must be a separate disposable database whose name ends in `_test` (documented default: `freelanceos_test`). Integration tests and Playwright E2E refuse the development database.

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

Playwright E2E (`pnpm test:e2e`) uses `TEST_DATABASE_URL` only. It refuses `freelance_os`. Apply `pnpm test:db:migrate` first. The command starts its own `pnpm dev` against the isolated database and does not use the development `DATABASE_URL`.

The GitHub Actions quality workflow starts PostgreSQL 17, validates and generates the Prisma client, applies migrations, then runs lint, typecheck, unit tests, integration tests, build, and deterministic Playwright auth, onboarding, authenticated-shell, client, contract, and time-tracking E2E. CI uses `pnpm dev` with one Playwright worker. It does not require Google credentials or a production mailer.

`pnpm install` also runs `prisma generate`. The Prisma schema includes the application-owned persistence models and Better Auth 1.7.4 tables.

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
| `pnpm test:e2e`          | Run Playwright E2E against `TEST_DATABASE_URL`                   |
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
