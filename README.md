# FreelanceOS

FreelanceOS is a web application for freelancer operations management.

## Status

Release 1 — MVP. UX Polish COMPLETE (`docs/ux/ux-review.md` §18). UX Gate PASS WITH FINDINGS. Documentation Gate COMPLETE (`MASTER_PLAN.md` §32). MVP QA Gate PASS WITH FINDINGS (`docs/qa/qa-report.md`). Blocking findings: NONE. Production readiness: RELEASE GRANTED. EPIC-107 Public Landing implementation COMPLETE. MASTER_PLAN §34 — READY FOR RELEASE (`docs/release/production-validation.md`). MASTER_PLAN §35 — GRANTED (`docs/release/production-certification.md`). D-005 PROVIDED. Hosted Vercel, Neon, production Google, and Gmail SMTP password-reset completion are verified. F-004 CLOSED. EPIC-110 CLOSED. R1 FROZEN (`docs/release/r1-freeze.md`) on `c6712224` / deployment `6558481150`. Actionable R1 findings = 0. Accepted R1 limitations remain documented. No next epic approved. Historical §34 / §35 snapshots are unchanged.

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

Set `DATABASE_URL`, `TEST_DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` in `.env`. Optional locally: `AUTH_EMAIL_DELIVERY` (`development` | `test` | `production`). Production password-reset delivery also needs `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD`. Prisma reads `.env` from the project root. Do not commit `.env`. Do not prefix secrets with `NEXT_PUBLIC_`. Variable categories (required production, optional, local/test, E2E-only, never-commit secrets) are listed in `.env.example`.

Email/password registration, sign-in, and sign-out are available at `/sign-up` and `/sign-in`. Unauthenticated `/` is the public landing. Password recovery is available at `/forgot-password` and `/reset-password`. Google sign-in is part of the MVP release. It is available on the sign-in and sign-up pages when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Configure the Google authorized redirect URI as `${BETTER_AUTH_URL}/api/auth/callback/google` (local example: `http://localhost:3000/api/auth/callback/google`). The production callback uses the Vercel origin once `BETTER_AUTH_URL` is set to that origin; this repository does not invent a production hostname. Email/password remains usable when Google credentials are absent. Registration does not create a workspace. Sign-in, sign-up, and Google success land on `/dashboard`, then the existing workspace gate sends users with no membership to `/onboarding`. Sign-out returns to `/`. Password-reset success remains `/sign-in`. Application routes, including `/dashboard`, require a Better Auth server session and exactly one workspace membership. Unauthenticated `/dashboard` redirects to `/sign-in`.

Password-reset email delivery is an application boundary. Set `AUTH_EMAIL_DELIVERY` to `development`, `test`, or `production`. Production mode sends through Gmail SMTP when `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD` are set. If any is missing, the request is acknowledged and mail is not sent. Development mode does not send mail and never logs reset tokens or URLs. Inspect local recovery tokens through the Better Auth `verification` table when needed.

Production deployment target is Vercel (`vercel.json`). Hosted deploy is not performed from this repository without Vercel access, a production database, and production secrets. `pnpm build` / `pnpm start` remains the local production-like runtime. Vercel build runs `prisma generate`, `prisma migrate deploy`, then `pnpm build`.

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

Playwright E2E (`pnpm test:e2e`) uses `TEST_DATABASE_URL` only. It refuses `freelance_os`. Apply `pnpm test:db:migrate` first. The command starts its own `pnpm dev` against the isolated database with `AUTH_EMAIL_DELIVERY=test`. Production-like E2E is `pnpm build` then `pnpm test:e2e:start` (`pnpm start` + `AUTH_E2E_RUNTIME=true`). It does not reuse an existing server and does not change production rate limits.

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
| `pnpm test:e2e`          | Run Playwright E2E against `TEST_DATABASE_URL` (`pnpm dev`) |
| `pnpm test:e2e:start`    | Production-like Playwright E2E (`pnpm start`, after `pnpm build`) |
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
