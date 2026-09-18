# FreelanceOS

FreelanceOS is a web application for freelancer operations management.

## Status

Release 1 — MVP in progress. UX Polish COMPLETE (`docs/ux/ux-review.md` §18). UX Gate PASS WITH FINDINGS. Documentation Gate COMPLETE (`MASTER_PLAN.md` §32). MVP QA Gate PASS WITH FINDINGS (`docs/qa/qa-report.md`). Blocking findings: NONE. Production readiness: NO. EPIC-107 Public Landing implementation COMPLETE. Engineering Review PASS WITH FINDINGS (`docs/epics/EPIC-107/engineering-review.md`). Epic production-like validation PASS WITH FINDINGS (`docs/epics/EPIC-107/production-validation.md`). Epic certification RELEASE BLOCKED (`docs/epics/EPIC-107/certification.md`). MASTER_PLAN §34 executed on `a0ad65f` — RELEASE BLOCKED (`docs/release/production-validation.md`). Next: §35 Production Certification. Product Owner approval: NOT PROVIDED. Closed in UX Polish: FINDING-UX-001, UX-002, UX-003, UX-005, UX-006, UX-007, UX-008, UX-009. Remaining open/non-blocking: FINDING-UX-004; FINDING-QA-002 (APPLICATION DEFECT — custom-range timezone shift west of UTC); FINDING-QA-001 (TEST DEFECT / FLAKY); FINDING-INT-001 OPEN / CONFIRMED; FINDING-INT-002 OPEN / NOT REPRODUCED; FINDING-INT-003 OPEN / NOT REPRODUCED; F-104-007 PRE-EXISTING. MVP Integration COMPLETE / CLOSED — Engineering Review PASS WITH FINDINGS. EPIC-106 Alerts & Notifications COMPLETE — Engineering Review PASS. In-app notification center (`/alerts`), unread Alerts nav badge, `CONTRACT_WARNING` and `CONTRACT_EXCEEDED` alert evaluation with deduplication, resolution, and re-trigger. Capacity alerts deferred (PD-106-001). EPIC-105 complete: workspace-scoped reporting surface (`/reports`) with timezone-aware period boundaries, weekly aggregation, and pro-rata contract capacity. EPIC-104 complete: shared analytics foundation and authenticated Dashboard at `/dashboard`. EPIC-103 time tracking, EPIC-102 contract management, and EPIC-101 client master-data management are implemented. Authentication remains Better Auth. Public `/` is the unauthenticated landing (Sign Up / Sign In). Authenticated `/` never renders the landing and resolves to `/dashboard`, `/onboarding`, or `/workspace-unavailable`. No billing, rate calculation, or revenue estimation is implemented. Role permissions (OBD-009) and production password-reset email are not decided. This is not production readiness.

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

Email/password registration, sign-in, and sign-out are available at `/sign-up` and `/sign-in`. Unauthenticated `/` is the public landing. Password recovery is available at `/forgot-password` and `/reset-password`. Google sign-in is available on the sign-in and sign-up pages when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Configure the Google authorized redirect URI as `${BETTER_AUTH_URL}/api/auth/callback/google` (local example: `http://localhost:3000/api/auth/callback/google`). Email/password remains usable when Google credentials are absent. Registration does not create a workspace. Sign-in, sign-up, and Google success land on `/dashboard`, then the existing workspace gate sends users with no membership to `/onboarding`. Sign-out returns to `/`. Password-reset success remains `/sign-in`. Application routes, including `/dashboard`, require a Better Auth server session and exactly one workspace membership. Unauthenticated `/dashboard` redirects to `/sign-in`.

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

The GitHub Actions quality workflow starts PostgreSQL 17, validates and generates the Prisma client, applies migrations, then runs lint, typecheck, unit tests, integration tests, build, and deterministic Playwright E2E (including landing, auth, onboarding, authenticated-shell, client, contract, time-tracking, dashboard, and dashboard-accessibility). CI uses `pnpm dev` with one Playwright worker. It does not require Google credentials or a production mailer.

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
