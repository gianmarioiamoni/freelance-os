# Changelog

All notable changes to FreelanceOS are documented in this file.

## Unreleased

### Added

- EPIC-103 Time Tracking Engineering Review completed; workspace-scoped time tracking (create, daily view, weekly timesheet, edit of duration/description/billable, hard delete) implemented. `workDate`, `clientId`, and `contractId` are immutable after creation. No schema change. Not production-ready.
- Authenticated `/time-tracking` product surface with client-first contract selection restricted by `[validFrom, validTo)` validity, Server Actions, application services, lifecycle and isolation tests, and a Playwright create/edit/delete journey. No billing, rate calculation, or forecasting was introduced.

- EPIC-102 Contracts Engineering Review completed; workspace-scoped contract management (create, list, detail, edit, client history, overlap prevention) implemented. No schema change. Not production-ready.
- Authenticated `/contracts` product surface with Server Actions, application services, isolation tests, and a Playwright create/edit/overlap journey.

- EPIC-101 Clients Engineering Review completed; workspace-scoped client master-data management (create, list ACTIVE, archived view, detail, edit, archive) implemented. No schema change. Not production-ready.
- Authenticated `/clients` product surface with Server Actions, application services, isolation tests, and a Playwright create/edit/archive journey.

- EPIC-006 UI Foundation Engineering Review completed; authenticated AppShell, design-system primitives, page/state boundaries, and accessibility baseline certified. Not production-ready.
- Authenticated application shell displays server-resolved workspace name and session account label. Placeholder destinations remain structural placeholders.
- Foundation UI primitives: Input, Label, Card, Alert, Field, LoadingState, ErrorState, EmptyState, PageHeader, PageContent.
- Playwright authenticated shell journey covering workspace identity, Application nav, skip link, placeholder route, and mobile navigation.

- EPIC-005 Testing & CI Foundation Engineering Review completed; isolated E2E database contract, CI Playwright lock (`pnpm dev`, one worker), and workspace isolation/authorization regression baseline certified. Not production-ready.
- Playwright E2E requires `TEST_DATABASE_URL`, refuses `freelance_os`, and injects the isolated `*_test` database only into the E2E process.
- Isolation/authorization regression baseline locked for member access, non-member denial, identifier substitution, membership fail-closed behavior, and persistence tenant isolation.
- EPIC-004 Workspace Engineering Review completed; workspace foundation certified for later product Epics with documented non-blocking findings.
- Workspace authorization and isolation tests covering member access, non-member denial, identifier substitution, cross-workspace reads, fail-closed multiple memberships, and zero-membership onboarding.
- First-workspace onboarding at `/onboarding` and a workspace-aware authenticated application boundary. Zero memberships require onboarding, one membership enters the application, and more than one membership fails closed.
- First-workspace creation use case: atomically persists Workspace, OWNER membership, and WorkspaceSettings for an authenticated user with no existing membership.
- EPIC-003 Authentication Engineering Review completed; authentication foundation certified for EPIC-004 with documented non-blocking findings.
- Password recovery through Better Auth, using the existing verification table, a non-production email delivery boundary, and `/forgot-password` plus `/reset-password`.
- Google OAuth sign-in through Better Auth, using environment-based credentials and the existing `/api/auth/[...all]` callback route.
- Email/password authentication, Better Auth sessions, and a protected App Router server boundary.
- Better Auth 1.7.4 persistence foundation with Prisma adapter, server-only auth instance, and reviewed migration.

- Application repository bootstrap with Next.js App Router, TypeScript, pnpm, ESLint, and Prettier.
- Application shell with Tailwind CSS, shadcn/ui, and placeholder navigation destinations.
- Developer quality baseline with Vitest, a Playwright application smoke test, and CI quality gates.
- EPIC-001 Engineering Review completed; foundation certified for EPIC-002.
- PostgreSQL and Prisma persistence foundation with a server-only client and initial migration pipeline.
- Core application persistence schema for workspace, client, contract, time entry, settings, alert, and notification models.
- Persistence invariants, workspace-scoped repositories, and a deterministic development seed.
- Persistence integration tests against isolated PostgreSQL and a CI database gate.
- EPIC-002 Engineering Review completed; persistence foundation certified for EPIC-003.

### Fixed

- Time-tracking Server Actions called `redirect()` inside `try`/`catch`, so the Next.js `NEXT_REDIRECT` control-flow error was caught and a successful create, update, or delete reported a false application error and skipped navigation. `redirect()` now runs outside the error handler in all three actions (EPIC-103 F-103-001).
