# Changelog

All notable changes to FreelanceOS are documented in this file.

## Unreleased

### Fixed

- EPIC-108 Stream B CLOSED (`docs/epics/EPIC-108/findings.md`, ER-108-B PASS). FINDING-QA-001 (historical flake, isolated release-gate 3/3), FINDING-INT-002 (sign-out E2E 2/2), FINDING-INT-003 (password-reset E2E 1/1; production Gmail verification recorded separately). No test/app change. P108-05 not required. Does not rewrite §34 / §35.
- EPIC-108 Stream E CLOSED (`docs/epics/EPIC-108/findings.md`, ER-108-E PASS). F-104-007: dashboard workspace resolution outside `try`; `NEXT_REDIRECT` rethrown; real errors still log + ErrorState. `DYNAMIC_SERVER_USAGE` remains a historical EPIC-104 note. Does not rewrite §34 / §35.
- EPIC-108 Stream A CLOSED (`docs/epics/EPIC-108/findings.md`, ER-108-A PASS). FINDING-QA-002 (`getDateRangePeriod` UTC getters), FINDING-INT-001 (`futureDate` UTC midnight fixture), FINDING-108-001 (`isDateInPeriod` UTC calendar comparison). Host and `TZ=America/Los_Angeles` evidence recorded. Does not rewrite §34 / §35.

### Added

- MASTER_PLAN §35 Production Certification GRANTED after D-005. Validated build `2b58af4`. §34 remains READY FOR RELEASE. Historical non-blocking findings remain OPEN.
- MASTER_PLAN §34 Production Validation revalidated on hosted Vercel + Neon + Gmail SMTP (`2b58af4`). Outcome: READY FOR RELEASE. Hosted deploy, production Google, and password-reset completion CLOSED. F-004 CLOSED. Custom domain not purchased. Gmail SMTP is the MVP mailer, not a high-scale transactional standard.
- Production password-reset transport replaced Resend with Gmail SMTP / Nodemailer. Resend removed from the runtime.

- MVP production infrastructure for D-001–D-004: Vercel deployment configuration, Google OAuth kept in the MVP release, then Gmail SMTP password-reset delivery, and E2E isolation (`AUTH_E2E_RUNTIME` on `pnpm test:e2e:start`). Isolated `next start` E2E later 68/68. Historical note: hosted deploy and production credentials were external at D-001–D-004 implementation. §35 not run.

- Authenticated AppShell wordmark `FreelanceOS` is a Next.js link to `/dashboard`. Public landing wordmark remains `/`.
- EPIC-107 Public Landing implementation and E2E complete (P107-01 … P107-03). Documentation synchronized (P107-04). Later: Engineering Review PASS WITH FINDINGS (P107-05); production-like validation PASS WITH FINDINGS (P107-06); epic certification RELEASE BLOCKED.
- Public `/` landing for unauthenticated visitors: header with plain `FreelanceOS` wordmark, Sign Up / Sign In, hero, supporting statement, bordered How it works (Set up / Track / Understand), six MVP capability cards with native `<details>/<summary>` Read more. No logo asset, no site-wide dark mode, no additional hero CTA, no footer. Authenticated `/` never renders the landing.
- Authenticated Dashboard moved to `/dashboard` under the existing `(app)` layout / AppShell. No nested dashboard layout. `(app)/page.tsx` removed.
- Sign-in, sign-up, and Google callback land on `/dashboard` (workspace-gate still sends no-membership users to `/onboarding`). Sign-out lands on `/` (`router.refresh()` then `router.push("/")`). Reset-password success remains `/sign-in`. Unauthenticated `/dashboard` redirects to `/sign-in`.
- P107-03 E2E: targeted 26/26 PASS (landing, auth, onboarding, dashboard, app-shell); broader 40/40 PASS. FINDING-QA-001 was not reproduced; it remains OPEN.

- MVP UX Polish COMPLETE. Read-only Settings surface (account, workspace, contract warning threshold). FreelanceOS branding on authentication layouts. Closed FINDING-UX-001, UX-002, UX-003, UX-005, UX-006, UX-007, UX-008, UX-009. FINDING-UX-004 remains OPEN. FINDING-QA-002 remains OPEN. Next at polish close: Production Validation (`MASTER_PLAN.md` §34), later deferred for EPIC-107.
- MVP UX Gate PASS WITH FINDINGS (`docs/ux/ux-review.md`). Blocking findings: NONE. Production readiness: NO. Findings: FINDING-UX-001 … FINDING-UX-009 recorded at the gate; subsequent UX Polish closed all except FINDING-UX-004. Prior QA findings unchanged.
- MVP QA Gate PASS WITH FINDINGS (`docs/qa/qa-report.md`). Documentation Gate COMPLETE (`MASTER_PLAN.md` §32). Blocking findings: NONE. Production readiness: NO. Next: UX Gate (§33).
- Automated QA evidence: lint 0 errors / 6 pre-existing warnings; typecheck PASS; unit 392/392; integration 224/224 (host TZ); build PASS; E2E 58/58; release-gate 5 pass / 1 flaky failure (FINDING-QA-001); focused release-gate PASS; isolated release-gate 3/3 PASS.
- Findings after QA: FINDING-P04-001 CLOSED; FINDING-P04-002 ACCEPTED / BY DESIGN; FINDING-P04-003 CLOSED; FINDING-INT-001 OPEN / CONFIRMED (TEST DEFECT under America/Los_Angeles); FINDING-INT-002 OPEN / NOT REPRODUCED; FINDING-INT-003 OPEN / NOT REPRODUCED; FINDING-QA-001 OPEN NON-BLOCKING TEST DEFECT / FLAKY; FINDING-QA-002 OPEN NON-BLOCKING APPLICATION DEFECT (`getDateRangePeriod` custom-range timezone shift west of UTC); F-104-007 PRE-EXISTING / NON-BLOCKING.

- MVP Integration COMPLETE / CLOSED — Engineering Review PASS WITH FINDINGS. Release gate PASSED (3/3; 22-step authenticated journey; 22/22 assertions). Blocking findings: NONE. Not production-ready. Next at integration closure: QA — MVP QA Gate (§31).
- Cross-domain integration certified: Authentication → Workspace → Client → Contract → TimeEntry → Analytics → Dashboard → Alerts / Notifications → Reports. TimeEntry mutations revalidate `/` (layout + dashboard), `/reports`, and `/alerts` after persistence and alert evaluation. Unread Alerts navigation badge implemented. Sign-out uses `router.refresh()` then `router.push("/sign-in")` (FINDING-P04-001 CLOSED).
- Findings: FINDING-P04-001 CLOSED; FINDING-P04-002 NON-BLOCKING / ACCEPTED (100% utilization may produce WARNING + EXCEEDED); FINDING-P04-003 NON-BLOCKING / PRE-EXISTING; FINDING-INT-001 NON-BLOCKING / PRE-EXISTING; FINDING-INT-002 NON-BLOCKING / OPEN; FINDING-INT-003 NON-BLOCKING / OPEN. OPEN and PRE-EXISTING test/infrastructure defects deferred to QA / Production Certification.
- Suite totals at closure: 392 unit (PASS); 223 integration passed / 1 pre-existing (FINDING-INT-001); full E2E 54 passed / 4 failed, all classified non-application defects.

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
