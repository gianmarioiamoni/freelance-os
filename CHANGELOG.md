# Changelog

All notable changes to FreelanceOS are documented in this file.

## Unreleased

### Added

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
