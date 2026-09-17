# Changelog

All notable changes to FreelanceOS are documented in this file.

## Unreleased

### Added

- EPIC-106 Alerts & Notifications COMPLETE / CLOSED — Engineering Review PASS. P106-00 → P106-09 complete. F-106-P07-001 CLOSED (P106-08: resolveIfActive semantic lookup fix). F-106-P04-001 ACCEPTED — MVP. F-106-P05-001 PRE-EXISTING / FLAKY / ACCEPTED. No schema change. Not production-ready.
- `AlertService` at `src/application/alerts/alert-service.ts`: deterministic rule evaluation for `CONTRACT_WARNING` (AR-001) and `CONTRACT_EXCEEDED` (AR-002) per contract per current month period. Delegates all utilization calculations to `AnalyticsService` — no calculation duplication. `CAPACITY_WARNING` / `CAPACITY_EXCEEDED` (AR-003/AR-004) deferred (PD-106-001).
- Alert deduplication: `findAlertByDeduplicationKey` prevents duplicate active alerts for the same condition and period. Re-trigger creates a new alert after resolution.
- Alert resolution: active alerts resolved when condition drops below threshold (`resolvedAt` set).
- Non-blocking alert evaluation trigger in all three TimeEntry Server Actions (`create-time-entry-action.ts`, `update-time-entry-action.ts`, `delete-time-entry-action.ts`) via `trigger-alert-evaluation.ts`. Evaluation failure does not fail the TimeEntry operation (PD-106-003).
- In-app notification center at `/alerts` as a React Server Component: lists workspace-scoped notifications newest first; empty state; unread indicator.
- Mark-as-read Server Action (`mark-notification-read-action.ts`) with server-side ownership check. Reading a notification does not resolve the alert.
- Alert evaluation period uses `Workspace.timezone` (consistent with EPIC-105 reporting semantics). Warning threshold from `WorkspaceSettings.contractWarningPercent` (default 80%, OBD-006 resolved).
- Unit suite: 379 tests (PASS). Integration suite: 219 tests (PASS). P106-05 E2E: 6 tests (PASS). Full E2E: 56 PASS / 1 pre-existing flaky failure (F-106-P05-001: `auth.spec.ts`, not a P106 regression).

- EPIC-105 Reporting engineering-complete (COMPLETE WITH DOCUMENTED ENVIRONMENTAL GATE EXCEPTION). Engineering Review pending (P105-08). No schema change. Not production-ready.
- Reporting surface at `/reports` as a React Server Component; authorization resolved outside any `try` block; period selection URL-driven (today / week / month / year / custom). Three tabular report sections: hours by client, contract report, annual overview. Loading, zero-activity, and error states. Responsive layout. Accessible table semantics, native headings, keyboard-reachable period selector.
- `ReportingService`: thin workspace-scoped orchestration layer that resolves period-kind requests using `Workspace.timezone` and delegates all arithmetic to `AnalyticsService`. No formula is duplicated from the analytics layer.
- Timezone-aware period constructors: `getTodayPeriod`, `getCurrentWeekPeriod`, `getCurrentYearPeriod`, corrected `getCurrentMonthPeriod` (ends today, not end of month). `Workspace.timezone` is the sole period-boundary authority (PD-105-003 / BR-105-014).
- Weekly aggregation: `getWeeklyAnalytics` composed over `getDailyAnalytics`; no new SQL required (F-104-013 resolved).
- Pro-rata contract capacity (BR-105-017): `contractedMinutes` = `monthlyContractedMinutes × (overlapDays / periodDays)`. No rollover or expiry (OBD-012 open).
- Ongoing/unlimited separation (PD-105-004 / F-104-003 resolved): `isOngoing` ≡ `validTo === null`; unlimited ≡ `monthlyContractedMinutes === null`; independent properties.
- Relevance-driven contract list (PD-105-006 / BR-105-018): validity overlap ∪ in-period consumption. Out-of-validity time retained and flagged; zero-consumption valid contracts appear at 0 h / capacity / 0%.
- Service-level workspace membership guard in `AnalyticsService` (SI-105-005 / F-104-014 resolved).
- Shared percentage arithmetic consolidated onto `AnalyticsService` static methods (F-104-002 resolved).
- Reporting integration suite: period resolution, workspace isolation, all four ongoing/unlimited combinations, pro-rata cases, OBD-012 no-rollover assertion, dashboard-agreement test (F-105-P-006), archived-client coverage (F-105-010), zero-activity coverage (F-105-011).
- Performance baseline at EPIC-104 reference volume: 100 clients, 50 contracts, 1000 time entries, 13 months. Monthly report ~27 ms / ≤ 53 DB ops; annual overview ~27 ms / ≤ 636 DB ops; weekly ~3 ms / 5 fixed ops. F-104-P-001 measured; no threshold enforced (PD-105-008 default).
- Reporting E2E suite (`tests/e2e/reports.spec.ts`): 14 tests covering SI-105-006 redirects, navigation, period selection, empty states, tabular rendering, accessibility, responsive layout at 4 viewports, error recovery.
- EPIC-104 Analytics & Dashboard Engineering Review completed (PASS WITH FINDINGS); shared analytics foundation and the authenticated dashboard implemented. No schema change. Findings remain open and non-blocking. Not production-ready.
- Analytics foundation: `AnalyticsService` as the shared workspace-scoped calculation layer, `AnalyticsRepository` for `workspaceId`-scoped aggregation over `TimeEntry`, analytics domain types, and period utilities. No revenue, rate, or commercial amount is calculated.
- Authenticated Dashboard at `/` as a React Server Component, replacing the structural placeholder: monthly summary (total, billable, non-billable hours and billable percentage), client allocation, and contract utilization, with responsive layout and empty and error states. Archived clients are included in analytics and labelled as archived; utilization uses all tracked time; the default period is the current month.
- Analytics workspace isolation and product-decision integration tests, dashboard integration tests, a Playwright dashboard journey, a Playwright dashboard-accessibility spec, and an analytics E2E fixture helper. Suite totals at closure: 216 unit, 148 integration, 37 E2E, reported separately.

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
