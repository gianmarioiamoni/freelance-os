# FreelanceOS --- Testing Strategy

**Status:** Testing and CI foundation implemented — EPIC-005 complete; UI test baseline added by EPIC-006; client coverage added by EPIC-101; contract coverage added by EPIC-102; time-tracking coverage added by EPIC-103; analytics and dashboard coverage added by EPIC-104; reporting coverage added by EPIC-105; alert evaluation and notification center coverage added by EPIC-106; MVP Integration COMPLETE / CLOSED — release-gate cross-domain journey certified; MVP QA Gate PASS WITH FINDINGS; Documentation Gate COMPLETE; UX Gate PASS WITH FINDINGS; UX Polish COMPLETE (`docs/ux/ux-review.md` §18); EPIC-107 public-root and dashboard-routing E2E added (P107-03: targeted 26/26 PASS, broader 40/40 PASS); P107-05 E2E 66/66 PASS against `pnpm dev`; §34 Playwright against `next start` 43 passed / 23 failed (F-004); production readiness NO\
**Document:** `docs/testing-strategy.md`\
**Scope:** Release 0 Foundation + Release 1 MVP\
**Canonical format:** Markdown

## Implementation status

EPIC-002 is complete. Phase 4 implements persistence integration tests
against a real, isolated PostgreSQL database.

EPIC-003 Phase 2 adds authentication integration tests against the same
isolated PostgreSQL database (`pnpm test:integration`) and a targeted
email/password Playwright journey (`pnpm test:e2e`).

EPIC-003 Phase 3 adds Google OAuth configuration and authorization-URL
tests. Integration tests use placeholder `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET` values so CI never needs real Google
credentials. The full Google consent/callback exchange is not
automated: it requires a real Google account and cannot be safely
run in CI. E2E asserts the Google sign-in control is present and
continues to cover email/password.

EPIC-003 Phase 4 adds password-recovery integration tests against
the same isolated PostgreSQL database. The email boundary uses a
process-local capture store (`AUTH_EMAIL_DELIVERY=test`). Tests
never require a production mailer and must not print reset tokens
or passwords. Targeted Playwright coverage exercises
request → reset → sign-in with the new password. The Playwright
helper reads the Better Auth verification row; it does not enable
a production inbox.

EPIC-003 Phase 5 hardens authentication CI. The quality workflow
validates and generates the Prisma client, applies the committed
migration chain to disposable PostgreSQL 17 (`freelanceos_test`),
then runs lint, typecheck, unit tests, integration tests, build,
and deterministic Playwright auth E2E. CI sets a test auth secret
and `AUTH_EMAIL_DELIVERY=test`. Playwright CI uses `pnpm dev` with
one worker; `next start` enables Better Auth production rate limits
that collide across auth journeys on a shared CI IP. It does not
require Google credentials, a production mailer, or production
secrets. Full Google consent/callback remains a non-CI/manual
limitation.

EPIC-003 Phase 6 certified this authentication coverage. Review:
`docs/epics/EPIC-003/engineering-review.md`.

EPIC-004 adds workspace authorization and isolation tests.
Membership resolution (0 / 1 / >1), first-workspace creation,
onboarding route access, member access, non-member denial,
identifier substitution, and cross-workspace isolation are
verified against application authorization primitives and the
isolated PostgreSQL test database. `getAuthorizedWorkspace` is
the authorized read probe; `getWorkspaceById` is not treated as
authorization. Playwright covers register → create workspace →
application, invalid onboarding input, unauthenticated denial,
and that a browser-supplied `workspaceId` query is not
authorization. Role permission semantics (OBD-009) remain
untested by design. Playwright CI still uses `pnpm dev` with
one worker (F-004). Review:
`docs/epics/EPIC-004/engineering-review.md`.

EPIC-005 formalizes this stack as the Testing & CI Foundation.
It does not rebuild Vitest, Playwright, the isolated PostgreSQL
test database, or `.github/workflows/quality.yml`. Review:
`docs/epics/EPIC-005/engineering-review.md`.

EPIC-006 adds the UI testing baseline. Unit tests cover Field
association helpers and the account-label display helper. Playwright
covers the unauthenticated shell gate and one authenticated journey:
register → first workspace → workspace name, account label,
Application nav, Dashboard placeholder, skip link, one other
placeholder route, `aria-current`, and mobile navigation. This is an
accessibility baseline, not WCAG certification. Vitest remains Node;
jsdom/RTL and `@axe-core/playwright` were not added. The EPIC-005
isolated E2E / CI contract is unchanged. Review:
`docs/epics/EPIC-006/engineering-review.md`.

EPIC-101 adds client application-service unit tests, workspace-isolation
integration tests, and one Playwright client journey: empty ACTIVE list
→ create → list → detail → edit → archive → absent from ACTIVE →
visible in archived view. P101-01 closed at 82 unit / 60 integration.
P101-02 added no unit or integration tests. P101-03 closed at 82 unit /
62 integration / 14 E2E. The EPIC-005 isolated E2E / CI contract is
unchanged. Review: `docs/epics/EPIC-101/engineering-review.md`.

EPIC-102 adds contract application-service unit tests, workspace-isolation
and integrity integration tests, and one Playwright contract journey:
empty list → create client → create contract → list / detail → edit →
sequential adjacent contract → overlap rejection → unknown id not-found.
P102-03 closed at 116 unit / 75 integration / 15 E2E. The EPIC-005
isolated E2E / CI contract is unchanged. Review:
`docs/epics/EPIC-102/engineering-review.md`.

EPIC-103 adds TimeEntry validation and application-service unit tests,
lifecycle and workspace-isolation integration tests, and one Playwright
time-tracking spec of six tests: authenticated journey (client and
HOURLY contract fixture → create → daily view → edit → delete),
contract metadata as presentation only, weekly view with per-day
quick-add through the normal creation path, browser-level workspace
isolation, unknown entry id not-found, and edit-form immutability.
P103-03 closed at 164 unit / 119 integration / 21 E2E (suite totals at
EPIC-103 closure, not counts of tests added by the Epic). The E2E contract
fixtures select Billing model `HOURLY` explicitly, wait on URL and
locator state rather than arbitrary timeouts, and assert canonical
application output and canonical `?date=` redirect URLs. That fixture
correction exposed a real application defect (F-103-001: `redirect()`
called inside `try`/`catch`), which was fixed in application code, not
in tests. The EPIC-005 isolated E2E / CI contract is unchanged. Review:
`docs/epics/EPIC-103/engineering-review.md`.

EPIC-104 adds analytics and dashboard coverage. The EPIC-005 isolated
E2E / CI contract is unchanged. Review:
`docs/epics/EPIC-104/engineering-review.md`.

Current suite totals — **three separate suites, never combined**:

``` text
Unit          392   pnpm test                            (vitest) — 392/392 PASS
Integration   224   pnpm test:integration                (224/224 PASS on host TZ; FINDING-INT-001 CONFIRMED OPEN under America/Los_Angeles — 217 passed / 7 failed)
E2E            58   CI=true pnpm test:e2e --workers=1     (58/58 PASS)
```

MVP QA release-gate evidence (`tests/e2e/mvp-integration-journey.spec.ts`): 5 pass / 1 flaky failure (FINDING-QA-001); focused release-gate PASS; isolated release-gate 3/3 PASS after the burst failure. Classification: NON-BLOCKING TEST DEFECT / FLAKY. Do not treat as a deterministic PASS. Blocking findings: NONE. Production readiness: NO. Evidence: `docs/qa/qa-report.md`.

Suite totals at EPIC-106 closure (for reference): 379 unit / 219 integration / 57 E2E.
Suite totals at EPIC-105 closure (for reference): 331 unit / 187 integration / 51 E2E.

The integration suite is a separate `vitest` project with its own
config and its own required CI step. The earlier combined figure
"216 unit/integration" was invalid and must not be reused: 216 was the
unit suite alone.

Added by EPIC-104:

- unit — `tests/unit/application/analytics/analytics-service.test.ts`
  and `tests/unit/lib/analytics-periods.test.ts`, covering the
  calculation statics and the period utilities;
- integration — `tests/integration/analytics/analytics-isolation.test.ts`,
  `tests/integration/analytics/analytics-workspace-isolation.test.ts`,
  `tests/integration/analytics/analytics-product-decisions.test.ts`,
  and `tests/integration/dashboard/dashboard-page.test.ts`;
- E2E — `tests/e2e/dashboard.spec.ts`,
  `tests/e2e/dashboard-accessibility.spec.ts`, and the shared fixture
  helper `tests/e2e/helpers/analytics-fixtures.ts`.

Analytics integration coverage proves monthly totals, billable and
non-billable split, client allocation, contract utilization, and the
`null`-on-zero-denominator rule.

Workspace-isolation coverage is six integration scenarios, including
identical client names across two workspaces, and proves that no
foreign-workspace row reaches analytics. The malformed-workspace test
pins the fail-closed contract — a non-UUID identifier rejects with
`InvalidPersistenceStateError` / `INVALID_PERSISTENCE_STATE`, while a
well-formed unknown identifier legitimately returns empty analytics.

Product-decision coverage proves PD-104-001 (archived-client time
included, including a client archived between two recorded entries),
PD-104-002 (all tracked time consumes capacity, asserted by showing
billable percentage and utilization percentage differ), and PD-104-003
(current-month scoping).

Dashboard E2E covers the authenticated journey from sign-in to
analytics display, archived-client behaviour on the dashboard, the
empty state, responsive layout at 375 / 768 / 1024 / 1440 / 2560 px,
and that an unauthenticated request to the dashboard lands on
`/sign-in`. At EPIC-104 that dashboard URL was `/`. EPIC-107 moved it
to `/dashboard`; unauthenticated `/` is now the public landing.

Accessibility E2E coverage is **partial, and must not be cited as an
accessibility audit** (F-104-010, open). Genuinely verified: the
count of exactly three level-2 headings, absence of horizontal
overflow at mobile width, a 40-pixel touch-target floor, and the
textual utilization label. Not verified despite appearing in the
suite: focus indicators, colour independence and contrast, and
no-horizontal-scroll at 200 percent text scaling — those assertions
are unsound and cannot fail. No automated accessibility scan (for
example axe-core) exists anywhere in the repository.

Two gaps are recorded rather than covered: the analytics error path is
exercised by no test in any suite (F-104-016), and no test asserts the
Daily Average value (F-104-001). No performance baseline exists for
analytics queries; the only timing assertion runs against a workspace
with no time entries and therefore measures no aggregation
(F-104-009).

**Durability warning — F-104-006.** Roughly twenty analytics
integration tests hardcode `Date.UTC(2026, 8, …)` fixtures while
asserting against the current month resolved from the system clock.
Those tests pass only until 2026-09-30. `analytics-isolation.test.ts`
is immune because it passes explicit periods built with
`getDateRangePeriod(...)`; new analytics tests should follow that
pattern rather than relying on the current month.

Isolated E2E database contract:

- Playwright requires `TEST_DATABASE_URL` through
  `tests/integration/test-database-url.ts`.
- Missing `TEST_DATABASE_URL` fails before E2E starts.
- `freelance_os` is rejected. The database name must end in `_test`.
- `playwright.config.ts` injects that isolated URL as `DATABASE_URL`
  only into the E2E `webServer` process. An existing `pnpm dev`
  server is not reused (`reuseExistingServer: false`).
- The password-reset helper reads `TEST_DATABASE_URL`, not the
  development `DATABASE_URL`.

Database safety guard:

- Shared by integration migrate/setup and E2E.
- Required env: `TEST_DATABASE_URL`.
- Forbidden target: `freelance_os` or any name that does not end
  in `_test`.
- Schema apply: `pnpm test:db:migrate` (`prisma migrate deploy`).
- `prisma db push` is not used.

CI E2E contract (locked by `tests/unit/ci/quality-workflow.test.ts`):

- GitHub Actions `.github/workflows/quality.yml`
- PostgreSQL 17 service, database `freelanceos_test`
- `DATABASE_URL` and `TEST_DATABASE_URL` both point at that database
- `pnpm dev` (not `next start`)
- one Playwright worker when `CI` is set
- no `prisma db push`
- lint, typecheck, unit, integration, build, then Playwright E2E
- no Google credentials, production mailer, or production secrets

Workspace isolation/security regression baseline
(`tests/unit/ci/isolation-baseline.test.ts`) locks the existing
EPIC-004 coverage:

- member access
- non-member denial
- identifier substitution
- zero memberships / onboarding
- exactly one membership / `WorkspaceContext`
- multiple memberships fail closed
- browser `workspaceId` is not authorization
- persistence tenant isolation

Accepted limitations that remain:

- G-004: no Playwright `/workspace-unavailable` journey; unit and
  integration remain the Foundation coverage
- G-006: CI style gate is lint; there is no `format:check`
- G-002: E2E uses unique emails on the isolated `*_test` database;
  no E2E truncate framework
- EPIC-003 F-004: one CI worker is the formalized contract, not a
  new defect
- EPIC-003 F-002: full Google consent/callback is not automated in CI

- Create `freelanceos_test` (or another database whose name ends in
  `_test`).
- Set `TEST_DATABASE_URL`. Never reuse `freelance_os`.
- Apply committed migrations with `pnpm test:db:migrate`.
- Run `pnpm test:integration`.
- `pnpm test` remains unit-only. Playwright stays in `pnpm test:e2e`
  and also requires `TEST_DATABASE_URL`.
- CI provides PostgreSQL 17 and fails if migrations, persistence
  tests, or deterministic auth/onboarding/shell/client E2E fail.

------------------------------------------------------------------------

## 1. Purpose

This document defines the testing architecture and quality strategy for
FreelanceOS.

The objective is not to maximize test count. The objective is to provide
**high confidence in business correctness, workspace isolation,
historical correctness, and end-to-end usability** while keeping the
feedback loop fast enough for small implementation increments.

Testing follows the project methodology:

``` text
Architecture
    ↓
Planning
    ↓
Implementation
    ↓
Engineering Review
    ↓
QA
    ↓
Documentation
    ↓
UX Review
    ↓
Production Validation
    ↓
Certification
    ↓
Release
```

Tests are therefore part of the engineering lifecycle, not a final
activity performed after implementation.

------------------------------------------------------------------------

# 2. Testing Principles

## 2.1 Test behavior, not implementation details

Tests should verify externally meaningful behavior and domain
invariants.

Prefer:

``` text
"contract utilization reaches 80% and creates a warning"
```

over:

``` text
"private function calculateThreshold() was called once"
```

Avoid tests that become invalid merely because internal code is
refactored without changing behavior.

------------------------------------------------------------------------

## 2.2 Deterministic business logic

Core business calculations must be deterministic and independently
testable.

This includes:

-   duration calculations
-   contract validity
-   contract utilization
-   billing calculations
-   reporting periods
-   alert thresholds
-   historical contract association

The same input must produce the same result.

------------------------------------------------------------------------

## 2.3 Test boundaries explicitly

FreelanceOS has several important architectural boundaries:

``` text
UI
 ↓
Application
 ↓
Domain
 ↓
Repository interfaces
 ↓
Infrastructure
 ↓
PostgreSQL
```

Each boundary needs the appropriate test type.

Do not attempt to prove the entire architecture with E2E tests alone.

------------------------------------------------------------------------

## 2.4 Security is a functional requirement

Authorization and tenant isolation are not optional quality attributes.

Tests must prove that:

``` text
User A in Workspace A
```

cannot read or mutate:

``` text
Workspace B
```

even if the user manipulates identifiers in a request.

Workspace isolation must therefore have dedicated integration tests.

------------------------------------------------------------------------

## 2.5 Historical correctness is a first-class invariant

Contract changes must not alter historical time-entry meaning.

A test must explicitly prove scenarios such as:

``` text
Contract A
€500/day
January–June

Contract B
€550/day
July onward

TimeEntry
June 20
→ remains associated with Contract A
```

This is more important than testing only the happy path of creating a
contract.

------------------------------------------------------------------------

# 3. Test Pyramid

The preferred distribution is:

``` text
                 ┌───────────────┐
                 │     E2E       │
                 │ few, critical │
                 └───────┬───────┘
                         │
                 ┌───────▼───────┐
                 │ Integration   │
                 │ DB + services │
                 └───────┬───────┘
                         │
             ┌───────────▼───────────┐
             │      Unit tests       │
             │ many, fast, focused   │
             └────────────────────────┘
```

Guideline:

-   many unit tests
-   a substantial integration suite
-   a smaller number of high-value E2E tests

Do not optimize for an arbitrary percentage split.

Risk and business criticality determine coverage.

------------------------------------------------------------------------

# 4. Test Levels

## 4.1 Unit tests

Unit tests run isolated business logic without PostgreSQL, Next.js, or
browser dependencies.

Primary targets:

``` text
Domain entities
Value objects
Domain services
Billing calculations
Utilization calculations
Period calculations
Alert rules
Validation logic
```

Unit tests should be fast and deterministic.

------------------------------------------------------------------------

## 4.2 Integration tests

Integration tests verify collaboration between application code and real
infrastructure boundaries.

Primary targets:

``` text
Application services
Repository implementations
Prisma
PostgreSQL
Authorization
Workspace isolation
Transactions
Migrations
```

These tests should use a real PostgreSQL-compatible test database rather
than replacing all persistence with mocks.

------------------------------------------------------------------------

## 4.3 End-to-end tests

E2E tests exercise the system from the browser through the application
stack.

They should focus on critical user journeys rather than every possible
UI state.

Primary targets:

``` text
Authentication
Workspace onboarding
Public landing
Client creation
Contract creation
Time registration
Dashboard
Reporting
Alerts
Notification center
```

------------------------------------------------------------------------

# 5. Unit Test Strategy

## 5.1 Domain entities

Domain entities should be tested for their invariants.

Examples:

### Contract

Test:

-   valid contract creation
-   invalid rate
-   invalid validity range
-   valid adjacent contracts
-   overlapping contracts rejected
-   contract validity on boundary dates

### TimeEntry

Test:

-   positive duration accepted
-   zero duration rejected
-   negative duration rejected
-   valid work date
-   billable state
-   non-billable state

------------------------------------------------------------------------

# 6. Contract Validity Tests

Contract validity uses:

``` text
[validFrom, validTo)
```

Tests must explicitly cover boundaries.

Example:

``` text
Contract A:
[2026-01-01, 2026-07-01)

Contract B:
[2026-07-01, ∞)
```

Expected:

``` text
2026-06-30 → A
2026-07-01 → B
```

Also test:

``` text
2026-01-01 → A
```

and:

``` text
validTo itself is not included in A
```

------------------------------------------------------------------------

## 6.1 Overlap tests

The test suite must reject:

``` text
A: [Jan 1, Jul 1)
B: [Jun 15, Aug 1)
```

and:

``` text
A: [Jan 1, ∞)
B: [Jul 1, ∞)
```

while accepting:

``` text
A: [Jan 1, Jul 1)
B: [Jul 1, ∞)
```

These tests must exist at both:

``` text
domain/application validation
```

and:

``` text
database integrity
```

where the PostgreSQL exclusion constraint is used.

------------------------------------------------------------------------

# 7. Time and Duration Tests

Durations are stored in integer minutes.

Minimum test matrix:

  Input        Expected
  ---------- ----------
  30 min             30
  60 min             60
  90 min             90
  8h                480
  1h 45m            105
  0 min        rejected
  negative     rejected

Calculations converting minutes to display hours must not introduce
floating-point persistence.

Example:

``` text
90 minutes
→ 1h 30m
```

The underlying stored value remains:

``` text
90
```

------------------------------------------------------------------------

# 8. Billing Calculation Tests

Billing is a high-risk area and requires dedicated domain tests.

## 8.1 Hourly billing

Given:

``` text
duration = 120 minutes
rate = €100/hour
```

expected:

``` text
€200
```

Test additional cases:

``` text
30 minutes
60 minutes
90 minutes
135 minutes
```

------------------------------------------------------------------------

## 8.2 Daily billing

Daily billing semantics are currently an open business decision.

Therefore, tests must not silently invent a partial-day rule.

Once OBD-001 is decided, the test suite must include:

-   full day
-   partial day
-   multiple days
-   rounding behavior
-   billable/non-billable combinations

Until that decision is finalized, only the agreed daily-rate behavior
should be implemented and tested.

------------------------------------------------------------------------

## 8.3 Monetary precision

Tests must verify that monetary calculations do not depend on binary
floating-point arithmetic.

Examples should include rates such as:

``` text
€80.10
€125.50
€333.3333
```

where supported by the finalized precision rules.

The final expected result must follow the approved rounding policy.

------------------------------------------------------------------------

# 9. Contract Utilization Tests

Contract utilization is one of the core product behaviors.

Given:

``` text
monthly contracted minutes = 6000
consumed minutes = 4800
```

expected:

``` text
80%
```

Test:

``` text
0%
1%
79%
80%
99%
100%
101%
```

The exact interpretation of billable vs non-billable time for contract
consumption must follow the finalized business rule.

------------------------------------------------------------------------

# 10. Alert Rule Tests

Alert generation must be deterministic.

Minimum MVP test cases:

### Warning

``` text
utilization < threshold
```

→ no warning

``` text
utilization = 80%
```

→ warning

### Exceeded

``` text
utilization < 100%
```

→ no exceeded alert

``` text
utilization = 100%
```

→ exceeded

``` text
utilization > 100%
```

→ exceeded

The exact threshold remains configurable through workspace settings.

------------------------------------------------------------------------

## 10.1 Alert deduplication

Given the same:

``` text
workspace
alert type
contract
period
```

the system must not create duplicate logical alerts.

Test:

``` text
evaluate condition
→ alert created

evaluate same condition again
→ existing logical alert reused / no duplicate
```

The precise lifecycle implementation may vary, but duplicate alert
creation must be prevented.

------------------------------------------------------------------------

# 11. Reporting Tests

Reports are derived from source data.

### Scope reconciliation — estimated revenue

This section previously listed `estimated revenue` as a test concern.
PD-105-001 explicitly excludes revenue from EPIC-105. No revenue,
monetary amount, rate, or commercial calculation is implemented in
the reporting layer; it must not be tested as if it were delivered.
The historical wording is retained for audit only.

Tests should verify:

-   date range filtering
-   client grouping
-   contract grouping
-   total minutes
-   billable minutes
-   non-billable minutes
-   monthly boundaries
-   yearly boundaries
-   empty periods
-   multiple clients
-   multiple contracts
-   historical contracts
-   pro-rata capacity (overlap days / period days)
-   ongoing and unlimited as independent properties
-   out-of-validity time retained and flagged
-   dashboard and reporting surface agreement for the same period

### Implemented by EPIC-105

The reporting integration suite (`tests/integration/reporting/`) covers
all categories above. The E2E suite (`tests/e2e/reports.spec.ts`) covers
SI-105-006 redirect invariants, period navigation, empty-state
rendering, tabular semantics, accessibility, responsive layout, and
error recovery. Suite totals at EPIC-105 closure: 331 unit /
187 integration / 51 E2E (reported separately).

### Implemented by EPIC-106

EPIC-106 adds alert evaluation, deduplication, resolution, and notification center coverage. All suites remain separate; totals at EPIC-106 P106-05 closure: 379 unit / 219 integration / 57 E2E (56 pass / 1 pre-existing flaky — F-106-P05-001).

Added by EPIC-106:

- unit — `tests/unit/application/alerts/alert-service.test.ts` (AR-001/AR-002 evaluation, deduplication, resolution, re-trigger, membership guard, null-capacity suppression) and `tests/unit/application/alerts/alert-dedup-key.test.ts` (deterministic key construction per alert type); `tests/unit/time-entries/trigger-alert-evaluation.test.ts` (non-blocking trigger, error isolation);
- integration — `tests/integration/alerts/time-entry-alert-trigger.test.ts` (TimeEntry create/update/delete → alert evaluated against real DB), `tests/integration/alerts/notification-center.test.ts` (mark-as-read, workspace isolation, ownership check), `tests/integration/alerts/alert-service-integration.test.ts` (full evaluation lifecycle: threshold, deduplication, resolution, re-trigger, workspace isolation, null-capacity contract);
- E2E — `tests/e2e/alerts.spec.ts`: 6 tests covering create TimeEntries to threshold → notification visible in `/alerts` → mark-as-read → UI reflects state; empty state; workspace isolation.

Alert evaluation coverage proves AR-001 fires at `>= contractWarningPercent`, AR-002 fires at `>= 100%`, null `contractedMinutes` suppresses alert, active alert is not duplicated, resolved condition resolves alert, re-trigger creates new alert. Workspace isolation (two workspaces, no cross-alert) is integration-proven.

F-106-P05-001: `auth.spec.ts` — "should register, stay authenticated, and sign out" — 1 E2E failure. Classified PRE-EXISTING / FLAKY. Reproduced at commit `95eaede` (pre-P106-05). Not a P106 regression.

### Implemented by MVP Integration

MVP Integration added the cross-domain release-gate journey and nav-badge / revalidation coverage. Review: `docs/epics/MVP-INTEGRATION/engineering-review.md`. Verdict: PASS WITH FINDINGS. Blocking findings: NONE. Release gate PASSED.

Added by MVP Integration:

- unit — `tests/unit/features/time-entries/time-entry-action-revalidation.test.ts`; `tests/unit/lib/navigation-badge.test.ts`
- integration — `tests/integration/persistence/notification-unread-count.test.ts`
- E2E — `tests/e2e/mvp-integration-journey.spec.ts` (`@release-gate`): Auth → Workspace → Client → Contract → TimeEntry → Dashboard → Reports → Alerts → mark-as-read → badge clear

Classified suite exceptions at MVP Integration closure (historical; not closed here):

| ID | Status at integration closure | Type | Deferred to |
|---|---|---|---|
| FINDING-P04-003 | PRE-EXISTING | TEST DEFECT (`time-tracking.spec.ts` hardcoded `"9/17/2026"`) | QA / Production Certification |
| FINDING-INT-001 | PRE-EXISTING | TEST DEFECT (`analytics-isolation.test.ts` UTC normalization) | QA / Production Certification |
| FINDING-INT-002 | OPEN | TEST DEFECT (`auth.spec.ts` sign-out missing `waitForURL`) | QA / Production Certification |
| FINDING-INT-003 | OPEN | TEST INFRASTRUCTURE (password-reset email delivery) | QA / Production Certification |

FINDING-P04-001 (application sign-out race) is CLOSED. FINDING-P04-002 (dual notification at 100% utilization) is ACCEPTED / BY DESIGN.

### Revalidated by MVP QA Gate

Evidence: `docs/qa/qa-report.md`. Verdict: PASS WITH FINDINGS. Blocking findings: NONE. Production readiness: NO.

| ID | QA status | Classification | Notes |
|---|---|---|---|
| FINDING-P04-001 | CLOSED | APPLICATION DEFECT (fixed) | Sign-out 2/2 PASS |
| FINDING-P04-002 | ACCEPTED / BY DESIGN | BY DESIGN | 100% may emit WARNING + EXCEEDED |
| FINDING-P04-003 | CLOSED | — | Hardcoded `"9/17/2026"` absent at QA HEAD |
| FINDING-INT-001 | OPEN / CONFIRMED | TEST DEFECT | Reproduced under `America/Los_Angeles` |
| FINDING-INT-002 | OPEN / NOT REPRODUCED | TEST DEFECT | Sign-out 2/2 PASS; no `waitForURL` residual |
| FINDING-INT-003 | OPEN / NOT REPRODUCED | TEST INFRASTRUCTURE | Password reset 2/2 PASS with test email delivery |
| FINDING-QA-001 | OPEN | TEST DEFECT / FLAKY | Release-gate 5 pass / 1 flaky failure |
| FINDING-QA-002 | OPEN | APPLICATION DEFECT | `getDateRangePeriod` custom-range TZ shift west of UTC |
| F-104-007 | PRE-EXISTING | APPLICATION | Dashboard `NEXT_REDIRECT` logs; redirects still work |

### Implemented by EPIC-107

EPIC-107 added public-root and dashboard-routing coverage. It does not close inherited findings. FINDING-QA-001 was not reproduced in P107-03; it remains OPEN.

Added / updated by P107-03 (`2ee06fb`):

- E2E — `tests/e2e/landing.spec.ts` (public `/`, CTAs, authenticated `/` → `/dashboard`, 390px, skip link / single `h1`, capability disclosure)
- E2E — `tests/e2e/auth.spec.ts` (protected `/dashboard` → `/sign-in`; sign-out → `/`; workspace sign-in → `/dashboard`; reset-password success → `/sign-in`)
- E2E — `tests/e2e/onboarding.spec.ts` (no-workspace `/` → `/onboarding`; unauthenticated `/` remains landing; `/?workspaceId=…` does not grant access)
- E2E — `tests/e2e/dashboard.spec.ts` and `tests/e2e/app-shell.spec.ts` (`/dashboard` AppShell, Dashboard `href="/dashboard"`, sign-out → landing)

P107-03 evidence:

``` text
Targeted E2E   26/26 PASS   landing, auth, onboarding, dashboard, app-shell
Broader E2E    40/40 PASS   alerts, clients, reports, time-tracking,
                            mvp-integration, dashboard-accessibility, contracts
```

Ambiguous membership `/` → `/workspace-unavailable` is not a dedicated E2E fixture; it remains covered by workspace-route-access unit tests and authorization-isolation integration tests. Google callback destination is `/dashboard` in `tests/integration/auth/google-oauth.test.ts`; full Google consent is not E2E-automated.

Example:

``` text
Client A
100 billable minutes

Client B
200 billable minutes
```

Expected total:

``` text
300 minutes
```

Client-level breakdown must remain:

``` text
A → 100
B → 200
```

------------------------------------------------------------------------

# 12. Reporting Period Tests

Date boundaries are a common source of defects.

Test:

``` text
today
week
month
year
custom range
```

For each period verify:

-   first date included
-   last date included
-   day immediately before excluded
-   day immediately after excluded

Special attention is required around:

``` text
month → month
December → January
year → year
```

The workspace timezone must be respected for timestamp-derived
operations.

------------------------------------------------------------------------

# 13. Application Service Tests

Application services orchestrate domain behavior and persistence.

Typical use cases:

``` text
CreateClient
ArchiveClient
CreateContract
UpdateContract
RecordTimeEntry
UpdateTimeEntry
DeleteTimeEntry
GetDashboard
GetReport
EvaluateAlerts
ListNotifications
MarkNotificationRead
```

Tests should verify:

1.  authorization context is required;
2.  input is validated;
3.  required repositories are called through interfaces;
4.  domain rules are applied;
5.  transactions are used where necessary;
6.  expected result is returned;
7.  invalid operations produce controlled errors.

Avoid asserting internal call counts unless the interaction itself is a
meaningful contract.

------------------------------------------------------------------------

# 14. Authorization Tests

Authorization requires explicit test coverage.

Minimum cases:

### Workspace access

``` text
member of workspace
→ access allowed
```

``` text
non-member
→ access denied
```

### Client access

``` text
client belongs to current workspace
→ allowed
```

``` text
client belongs to another workspace
→ denied
```

### Contract access

Same principle.

### TimeEntry access

Same principle.

### Notifications

A user must only see notifications intended for them and their
workspace.

------------------------------------------------------------------------

# 15. Cross-Workspace Isolation Tests

These are mandatory.

Test setup:

``` text
Workspace A
  User A
  Client A
  Contract A
  TimeEntry A

Workspace B
  User B
  Client B
  Contract B
  TimeEntry B
```

Then attempt from User A:

``` text
read Client B
read Contract B
read TimeEntry B
update Client B
update Contract B
delete TimeEntry B
read Notification B
```

Expected:

``` text
DENIED
```

Also test identifier substitution:

``` text
request contains Workspace B resource ID
```

The operation must still be rejected.

This verifies that authorization does not rely on the client-controlled
workspace identifier.

------------------------------------------------------------------------

# 16. Repository Integration Tests

Repository tests use a real PostgreSQL database.

Test:

-   insert
-   update
-   delete
-   query
-   relations
-   unique constraints
-   foreign keys
-   indexes through representative query behavior
-   transaction behavior
-   contract overlap constraint

Repository tests should verify persistence semantics, not duplicate all
domain tests.

------------------------------------------------------------------------

# 17. Database Constraint Tests

The following database invariants require explicit integration coverage:

### Foreign keys

Invalid references must fail.

### Composite workspace relationships

Cross-workspace relationships must fail.

### Unique constraints

Duplicate membership must fail.

### Duration constraint

Invalid duration must fail.

### Contract overlap

Overlapping contracts must fail at database level.

### Nullability

Required fields must reject null values.

The database is the final integrity boundary.

------------------------------------------------------------------------

# 18. Migration Tests

Every migration must be executable against a clean database.

CI should validate:

``` text
empty database
    ↓
all migrations
    ↓
current schema
```

The migration chain must produce the expected schema without manual
intervention.

Where destructive migrations are introduced, they require explicit
review.

------------------------------------------------------------------------

# 19. Seed Tests

Development seed data should be executable against a clean database.

The seed must create a coherent graph:

``` text
Workspace
 → Members
 → Clients
 → Contracts
 → TimeEntries
 → Alerts
 → Notifications
```

The seed must not rely on manually created records.

Running the seed repeatedly should either be safely repeatable or
clearly documented as reset-only behavior.

------------------------------------------------------------------------

# 20. Transaction Tests

Transactions are required for operations where partial persistence would
create inconsistent state.

Tests should simulate failures at intermediate steps.

Example:

``` text
create time entry
→ alert processing fails
```

The intended transactional behavior must be verified.

If alert generation is deliberately decoupled from the time-entry
transaction, the test should instead verify the documented
eventual-consistency behavior.

The implementation must not accidentally produce an undocumented hybrid
state.

------------------------------------------------------------------------

# 21. E2E Critical Journeys

The E2E suite should cover the MVP's primary end-to-end workflow:

``` text
Register
→ Login
→ Create workspace
→ Create client
→ Create contract
→ Register work
→ View weekly timesheet
→ View monthly dashboard
→ View contract utilization
→ Trigger threshold warning
→ View monthly revenue
→ Generate report
→ View notification
```

This is the primary acceptance journey.

Foundation E2E covers Register / Login / Create workspace and the
authenticated shell gate against `TEST_DATABASE_URL`. EPIC-101 adds
the client create / edit / archive journey. EPIC-102 adds the contract
create / edit / sequential / overlap journey. EPIC-103 adds the time
entry create / edit / delete journey with the daily and weekly views.
The remaining MVP steps are later product work.

------------------------------------------------------------------------

# 22. E2E Authentication

Minimum scenarios:

### Email/password

``` text
register
→ login
→ authenticated session
→ logout
```

### Google

Test the configured OAuth flow in an environment where the provider can
be safely exercised.

The exact provider mechanics belong to the authentication
infrastructure.

### Password recovery

Test:

``` text
request recovery
→ receive recovery mechanism in test environment
→ set new password
→ login with new password
```

Secrets and real production email delivery must not be required for
normal CI.

------------------------------------------------------------------------

# 23. E2E Client Management

Test:

``` text
create client
→ appears in list
→ open detail
→ edit
→ updated data visible
→ archive
→ client no longer appears in active list
```

Also verify that archived clients remain available where historical
reporting requires them.

Implemented by EPIC-101 (`tests/e2e/clients.spec.ts`): create, list,
detail, edit, archive, ACTIVE exclusion, archived-view visibility.
Historical reporting attachment remains later product work.

------------------------------------------------------------------------

# 24. E2E Contract Management

Test:

``` text
create hourly contract
→ visible on client
```

and:

``` text
create historical contract
→ create newer contract
→ verify validity timeline
```

Attempt to create overlapping contracts and verify that the UI exposes a
useful validation error.

Implemented by EPIC-102 (`tests/e2e/contracts.spec.ts`): create, list,
detail, edit, sequential adjacent contract, overlap rejection, unknown-id
not-found. Time-entry historical journeys remain later product work.

------------------------------------------------------------------------

# 25. E2E Time Tracking

Minimum scenarios:

``` text
create time entry
edit time entry
delete time entry
```

Verify:

-   client selection
-   contract selection
-   date
-   duration
-   description
-   billable state

Also verify that the weekly view totals correctly.

Implemented by EPIC-103 (`tests/e2e/time-tracking.spec.ts`): create,
daily-view verification, edit of mutable fields, hard delete,
client-first selection with a contract restricted to the client and
work date, contract metadata as presentation only, weekly view with
per-day quick-add, browser-level workspace isolation, unknown entry id
not-found, and read-only `workDate` / client / contract on the edit
form. Weekly and daily totals are minute sums; no monetary total is
rendered or asserted, because no billing calculation exists yet.

------------------------------------------------------------------------

# 26. Dashboard E2E Tests

### Implemented by EPIC-104

`tests/e2e/dashboard.spec.ts` and
`tests/e2e/dashboard-accessibility.spec.ts` cover the `/dashboard`
surface (moved from `/` by EPIC-107),
with fixtures built by `tests/e2e/helpers/analytics-fixtures.ts`.
Verified: monthly totals, billable and non-billable hours, client
allocation, contract utilization, archived-client labelling, the empty
state, responsive layout, and the unauthenticated redirect from
`/dashboard` to `/sign-in`. Public `/` is covered by
`tests/e2e/landing.spec.ts`.

Estimated revenue and alerts are **not** verified because they are not
implemented: revenue is an explicit EPIC-104 non-goal and alerts
belong to R1-E06.

The dashboard should show consistent figures derived from the same
source data.

Given known seed/test data, verify:

``` text
total hours              verified (EPIC-104)
billable hours           verified (EPIC-104)
non-billable hours       verified (EPIC-104)
client allocation        verified (EPIC-104)
contract utilization     verified (EPIC-104)
estimated revenue        not implemented — deferred
alerts                   implemented — EPIC-106 (CONTRACT_WARNING, CONTRACT_EXCEEDED)
```

Dashboard values must agree with report calculations.

A critical invariant is:

``` text
Dashboard
    ↕
Analytics service
    ↕
Reports
```

They must not implement separate versions of the same business
calculation.

------------------------------------------------------------------------

# 27. Notification E2E Tests

Test:

``` text
alert condition triggered
→ notification appears
→ unread state visible
→ mark as read
→ unread count changes
```

The underlying alert and notification should remain distinguishable.

------------------------------------------------------------------------

# 28. UI Validation vs Business Validation

Browser tests should not become the only validation for business logic.

For example, the rule:

``` text
contract utilization >= 80%
```

must have unit/domain coverage.

The E2E test should additionally prove:

``` text
real user workflow
→ real data
→ real application
→ visible warning
```

This gives two complementary guarantees:

``` text
domain correctness
+
product integration
```

------------------------------------------------------------------------

# 29. Test Data Strategy

Avoid large uncontrolled fixtures.

Prefer small, explicit factories/builders.

Conceptual examples:

``` text
createWorkspace()
createMember()
createClient()
createContract()
createTimeEntry()
```

Factories should make the relevant scenario obvious.

Bad:

``` text
createEverything()
```

Preferred:

``` text
workspace = createWorkspace()
client = createClient(workspace)
contract = createContract(client)
entry = createTimeEntry(contract)
```

This keeps tests readable and reduces hidden coupling.

------------------------------------------------------------------------

# 30. Test Isolation

Each integration/E2E test should start from a known state.

Preferred strategies:

``` text
transaction rollback
```

or:

``` text
dedicated test database reset
```

depending on the test runner and architecture.

Do not allow test order to determine correctness.

A test that passes only after another test has run is defective.

------------------------------------------------------------------------

# 31. Mocking Strategy

Mock external systems, not the domain.

Appropriate mocks/stubs:

``` text
OAuth provider
email provider
future LLM provider
external e-invoicing provider
clock, where deterministic time is required
```

Use real implementations for:

``` text
domain calculations
application services
PostgreSQL repository behavior
workspace authorization
```

Avoid mocking Prisma so heavily that repository integration defects
become invisible.

------------------------------------------------------------------------

# 32. Time Control

Tests involving dates and periods must be deterministic.

Where current time is relevant, use an injectable/test-controlled clock
rather than directly depending on the machine clock.

This is particularly important for:

-   monthly reports
-   current-day dashboard
-   alert periods
-   notification timestamps
-   contract validity
-   password/session expiration

Example:

``` text
Test clock:
2026-07-15 10:00 Europe/Rome
```

Then all expected results are calculated relative to that controlled
value.

------------------------------------------------------------------------

# 33. Property-Based Testing Candidates

Property-based testing is not required for the first implementation
increment but may be valuable for calculation-heavy logic.

Good candidates:

### Duration arithmetic

For non-negative integer minutes:

``` text
sum(entries) is independent of grouping/order
```

### Reporting

``` text
sum(client totals) = global total
```

### Utilization

For a fixed positive contract capacity:

``` text
more consumed minutes cannot reduce utilization
```

### Contract boundaries

Adjacent intervals should not overlap.

These tests can expose edge cases that example-based tests miss.

------------------------------------------------------------------------

# 34. Accessibility Testing

UX quality is part of the release lifecycle.

EPIC-006 established an accessibility baseline for the authenticated
shell. Playwright asserts semantic Application nav, skip link to
`#main-content`, `aria-current`, Sign out, heading structure, and
mobile menu keyboard/role access. Field helpers associate label,
hint, and error (`aria-invalid` / `aria-describedby`). UX Polish
extends `app-shell.spec.ts` to assert `/settings` is a read-only
workspace/account surface (not a placeholder) and `auth.spec.ts` to
assert the FreelanceOS wordmark on Sign In, Forgot Password, and the
Sign Out destination.

EPIC-104 added `tests/e2e/dashboard-accessibility.spec.ts` for the `/`
dashboard. Only part of it is sound evidence. Verified: exactly three
level-2 headings, no horizontal overflow at mobile width, a 40-pixel
touch-target floor, and a textual (non-colour) utilization label.
**Not** verified, despite being present in the suite: focus
indicators, colour independence and contrast, and no-horizontal-scroll
at 200 percent text scaling — those assertions cannot fail as written
(F-104-010, open). The dashboard also renders `dt`/`dd` pairs with no
`dl` ancestor (F-104-011) and uses `role="heading" aria-level={2}`
rather than native `h2` (F-104-012).

This is an accessibility baseline, not WCAG certification, and the
dashboard portion of it is weaker than its test count suggests. No
automated accessibility scan (for example axe-core) exists in the
repository. Formal UX Review for the MVP is complete
(`docs/ux/ux-review.md`, PASS WITH FINDINGS). A real accessibility
audit remains a later activity.

Later product screens still need accessibility coverage when they
exist:

``` text
client form
contract form
time-entry form
weekly timesheet
reports
notification center
```

Checks should include:

-   semantic controls
-   keyboard accessibility
-   form labels
-   focus behavior
-   dialog accessibility
-   validation error association
-   sufficient interaction clarity

Automated accessibility testing does not replace manual UX review.

------------------------------------------------------------------------

# 35. Error-State Testing

Each critical workflow needs tests for failure states.

Examples:

``` text
network/server failure
invalid form input
expired session
unauthorized resource
contract overlap
missing active contract
database conflict
```

The UI must show a controlled, understandable result.

Do not expose:

``` text
Prisma error
SQL error
stack trace
internal identifier
```

to normal users.

------------------------------------------------------------------------

# 36. Loading and Empty States

Critical screens must have explicit tests or visual checks for:

``` text
loading
empty
success
error
```

Examples:

### Client list

``` text
loading → empty → populated → error
```

### Reports

``` text
loading → no data → populated → error
```

### Notifications

``` text
loading → no notifications → unread notifications
```

These states are part of product behavior.

------------------------------------------------------------------------

# 37. Performance Smoke Tests

Full performance engineering is outside MVP scope, but obvious
regressions should be detected.

### Baseline measured by EPIC-105

EPIC-104 left the analytics performance baseline unevidenced
(F-104-009 / F-104-P-001). EPIC-105 P105-06 measured a baseline at
the EPIC-104 reference volume: 100 clients, 50 contracts, 1000 time
entries spanning 13 months. Results (wall-clock, local runner):

``` text
Monthly contract report:        ~27 ms  /  ≤ 53 DB operations
Annual overview (12 months):    ~27 ms  /  ≤ 636 DB operations
Weekly aggregation (30-day):    ~3 ms   /  5 fixed DB operations
Year-scale contract report:     ~9 ms   /  ≤ 53 DB operations
```

No pass/fail threshold is enforced in CI (PD-105-008 accepted default;
no threshold established). The baseline is recorded for the Engineering
Review and as a regression reference.

The out-of-validity check issues one COUNT per contract with in-period
consumption via `Promise.all` (concurrent, not serial). This is not a
classical serial N+1. At the declared MVP scale (50 contracts) the
total DB operations per call is bounded and acceptable.

Representative checks for future phases:

-   dashboard with realistic number of time entries
-   monthly report over a realistic period
-   client report
-   weekly timesheet
-   notification center

Watch for:

``` text
N+1 queries
```

and:

``` text
loading entire TimeEntry history into application memory
```

Reporting aggregates at the database/query layer. A dedicated SQL
aggregation query or view may be introduced if profiling justifies it
(permitted by `docs/architecture.md` §17); do not introduce one
speculatively.

------------------------------------------------------------------------

# 38. Security Test Baseline

The MVP security test suite should cover:

-   authentication required for protected routes/actions
-   authorization required for mutations
-   workspace isolation
-   server-side validation
-   CSRF protections provided by the selected framework/mechanism
-   safe session handling
-   no secrets exposed to browser code
-   no direct browser access to Prisma/database
-   safe error responses
-   input validation with Zod/application boundaries

Security testing must verify architecture, not merely UI behavior.

------------------------------------------------------------------------

# 39. CI Quality Gates

A normal pull request should run, at minimum:

``` text
format/lint
typecheck
unit tests
integration tests
build
```

E2E tests should run according to the CI strategy and environment cost.

A release candidate should additionally run:

``` text
full integration suite
full critical E2E suite
migration validation
production-like build
```

Implemented Foundation CI (EPIC-005) uses GitHub Actions
`.github/workflows/quality.yml`. The style gate is `pnpm lint`
(G-006: no `format:check`). Playwright E2E runs in the same
workflow with `pnpm dev` and one worker. The exact production E2E
environment and future parallelism remain open (TD-008 / TD-009).

------------------------------------------------------------------------

# 40. Test Naming

Test names should describe business behavior.

Preferred:

``` text
should reject overlapping contracts for the same client
```

``` text
should preserve the historical contract of a time entry
```

``` text
should deny access to a client belonging to another workspace
```

Avoid:

``` text
test1
works
should call repository
```

unless the call itself is the behavior being verified.

------------------------------------------------------------------------

# 41. Coverage Policy

Code coverage is a signal, not the definition of quality.

The most important areas should have strong behavioral coverage:

### Highest priority

``` text
authorization
workspace isolation
contract validity
historical correctness
billing calculations
utilization
alerts
report totals
```

### Medium priority

``` text
CRUD orchestration
notification state
settings
UI helpers
```

### Lower priority

``` text
simple rendering wrappers
pure presentational components
generated/infrastructure boilerplate
```

A high coverage percentage with missing business scenarios is not
considered sufficient.

------------------------------------------------------------------------

# 42. Definition of Done --- Feature

A feature is not complete merely because it works manually.

Minimum feature DoD:

-   [ ] acceptance criteria implemented
-   [ ] domain rules tested
-   [ ] application behavior tested
-   [ ] persistence behavior tested where relevant
-   [ ] authorization tested
-   [ ] error states handled
-   [ ] loading/empty states handled where relevant
-   [ ] critical UI path tested
-   [ ] no known regression introduced
-   [ ] documentation updated where architecture/behavior changed

------------------------------------------------------------------------

# 43. Definition of Done --- Epic

An Epic is ready for Engineering Review when:

-   [ ] all planned use cases implemented
-   [ ] unit suite passes
-   [ ] integration suite passes
-   [ ] critical E2E flows pass
-   [ ] workspace isolation tests pass
-   [ ] migration state is clean
-   [ ] typecheck/lint/build pass
-   [ ] documented business decisions are respected
-   [ ] no unresolved critical defects
-   [ ] architecture deviations are documented
-   [ ] UX review can begin

------------------------------------------------------------------------

# 44. Release Gate

A release candidate must satisfy:

``` text
Architecture compliant
        ↓
Tests green
        ↓
Security baseline green
        ↓
Migration validated
        ↓
Critical E2E green
        ↓
UX review complete
        ↓
Production validation
        ↓
Certification
```

A failed critical gate blocks release.

------------------------------------------------------------------------

# 45. MVP Test Matrix

  Area                     Unit   Integration   E2E
  ----------------------- ------ ------------- -----
  Authentication           ---         ✓         ✓
  Workspace                 ✓          ✓         ✓
  Authorization             ✓          ✓         ✓
  Client CRUD               ✓          ✓         ✓
  Contract validity         ✓          ✓         ✓
  Contract overlap          ✓          ✓         ✓
  Time entries              ✓          ✓         ✓
  Duration calculations     ✓          ✓        ---
  Billing                   ✓          ✓         ✓
  Utilization               ✓          ✓         ✓
  Alerts                    ✓          ✓         ✓
  Notifications             ✓          ✓         ✓
  Dashboard                 ✓          ✓         ✓
  Reports                   ✓          ✓         ✓
  Migrations               ---         ✓        ---
  Seed data                ---         ✓        ---
  Accessibility            ---        ---        ✓
  Error states              ✓          ✓         ✓

------------------------------------------------------------------------

# 46. Suggested Tooling Baseline

The architecture baseline proposes:

``` text
Vitest
```

for unit/domain/application tests and:

``` text
Playwright
```

for browser-level E2E testing.

Integration tests should run against PostgreSQL rather than a fake
relational implementation.

Foundation pins currently in use: Vitest 4.1.11 and Playwright
1.63.0. Integration tests run against isolated PostgreSQL 17 via
`TEST_DATABASE_URL`.

------------------------------------------------------------------------

# 47. Repository Structure

Recommended structure:

``` text
tests/
├── unit/
│   ├── domain/
│   ├── application/
│   └── lib/
├── integration/
│   ├── repositories/
│   ├── authorization/
│   ├── database/
│   └── use-cases/
├── e2e/
│   ├── auth/
│   ├── clients/
│   ├── contracts/
│   ├── time-tracking/
│   ├── dashboard/
│   ├── reporting/
│   └── notifications/
├── fixtures/
└── factories/
```

The exact folder structure may evolve with the implementation, but the
conceptual separation should remain.

Implemented Foundation tree (do not relocate to match the sketch):

``` text
tests/unit/application|infrastructure|lib|ci|components
tests/integration/persistence|auth|workspace
tests/e2e/   (flat: auth, onboarding, app-shell)
```

------------------------------------------------------------------------

# 48. First Test Suite to Implement

Before building the full UI, establish a small high-value test
foundation.

Recommended first tests:

1.  Workspace membership authorization.
2.  Cross-workspace client isolation.
3.  Contract validity boundaries.
4.  Contract overlap rejection.
5.  TimeEntry duration validation.
6.  Historical `contractId` preservation.
7.  Hourly billing calculation.
8.  Contract utilization calculation.
9.  80% alert threshold.
10. 100% exceeded threshold.
11. Monthly report aggregation.
12. Database migration from clean state.

This gives the project an executable safety net before the UI becomes
large.

Foundation coverage already present: workspace membership
authorization, persistence tenant isolation, and clean-database
migration. Items 2–11 remain later MVP/product work. Do not treat
them as missing EPIC-005 E2E.

------------------------------------------------------------------------

# 49. Test Execution Philosophy

Tests should support small implementation increments.

For each change:

``` text
Make one focused change
        ↓
Run targeted tests
        ↓
Run broader suite
        ↓
Review result
        ↓
Commit
```

Do not accumulate dozens of unrelated changes and run the full suite
only at the end.

The faster the feedback loop, the easier it is to identify the source of
a regression.

------------------------------------------------------------------------

# 50. Open Testing Decisions

The following remain implementation/product decisions rather than
assumptions:

  ID       Decision
  -------- --------------------------------------------------
  TD-001   Exact daily-rate billing semantics
  TD-002   Final monetary rounding policy
  TD-003   Contract-capacity treatment of non-billable time
  TD-004   Closed-period edit/delete rules
  TD-005   Audit requirements
  TD-006   Final workspace role/permission matrix
  TD-007   Email notification behavior
  TD-008   Production E2E environment strategy
  TD-009   CI provider and execution parallelism
  TD-010   Performance thresholds

Tests should be added or refined when these decisions are finalized.

------------------------------------------------------------------------

# 51. Definition of Done for Testing Strategy

The testing architecture is ready when:

1.  Every architectural layer has a defined test responsibility.
2.  Domain invariants have explicit test targets.
3.  Workspace isolation has mandatory integration coverage.
4.  Historical contract correctness has mandatory coverage.
5.  Billing and utilization calculations have deterministic tests.
6.  Database constraints are tested against real PostgreSQL.
7.  Critical user journeys have E2E coverage.
8.  Authentication and authorization have explicit coverage.
9.  Migration execution is tested.
10. CI quality gates are defined.
11. Open business decisions are not silently encoded as test
    assumptions.
12. The strategy can be implemented incrementally alongside the Epics.

------------------------------------------------------------------------

# 52. Next Step

With:

``` text
docs/product-vision.md
docs/domain-model.md
docs/architecture.md
docs/storage.md
docs/testing-strategy.md
```

the architectural baseline is sufficiently defined to move to planning.

The next canonical artifact should be:

``` text
MASTER_PLAN.md
```

It should translate the architecture into:

-   Foundation work
-   Epics
-   dependencies
-   implementation order
-   release gates
-   documentation deliverables
-   engineering-review checkpoints
-   QA checkpoints
-   certification criteria

The first implementation Epic should remain small and establish the
project foundation before business functionality is expanded.
