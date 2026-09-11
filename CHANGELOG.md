# Changelog

All notable changes to FreelanceOS are documented in this file.

## Unreleased

### Added

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
