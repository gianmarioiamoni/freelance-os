# FreelanceOS --- MASTER PLAN

**Status:** R1 FROZEN / GRANTED. R2 Revenue Operations in planning.\
**Document:** `MASTER_PLAN.md`\
**Product:** FreelanceOS\
**Canonical format:** Markdown\
**Current phase:** EPIC-110 CLOSED. R1 FROZEN / GRANTED (`docs/release/r1-freeze.md`). Candidate `c6712224e8d093b6f64cb46a17823a20de356a31`. Production deployment `6558481150` at `https://freelance-os-timeplan.vercel.app`. Actionable R1 findings = 0. Historical §34 / §35 snapshots unchanged. R2 Revenue Operations is the active next product evolution and remains in planning. No R2 implementation epic approved.

------------------------------------------------------------------------

## 1. Purpose

`MASTER_PLAN.md` is the single source of truth for the project's
execution status.

It answers:

> **Where is the project today, what has been completed, what comes
> next, and what remains blocked or deferred?**

The project methodology explicitly defines `MASTER_PLAN.md` as the
central project-level planning artifact containing the roadmap,
completed releases and Epics, current status, next work, technical debt,
and production status. fileciteturn1file6L1963-L1981

This document converts the approved product vision, domain model,
architecture, storage architecture, and testing strategy into an
executable roadmap.

It does **not** replace Epic plans. Each Epic will receive its own
detailed planning document before implementation.

------------------------------------------------------------------------

# 2. Project Operating Model

FreelanceOS follows the engineering lifecycle:

``` text
Vision
  ↓
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
UX Polish
  ↓
Production Validation
  ↓
Production Certification
  ↓
Release
```

The methodology explicitly separates these stages and assigns each a
unique objective. fileciteturn1file1L432-L482

The operating principle is:

``` text
Release
  ↓
Epic
  ↓
Phase
  ↓
Commit
```

with each commit having a single responsibility.
fileciteturn1file1L368-L388

------------------------------------------------------------------------

# 3. Roles

## Product Owner --- Human

Responsibilities:

-   product vision
-   priorities
-   business decisions
-   final architecture decisions
-   acceptance
-   release approval

The methodology assigns product ownership, priorities, technical
decisions, validation, and release approval to the human.
fileciteturn1file1L404-L428

## Architect / Engineering Advisor --- Assistant

Responsibilities:

-   architecture
-   domain analysis
-   planning
-   technical alternatives
-   review
-   QA strategy
-   documentation
-   risk identification
-   implementation guidance

## Implementation Engineer --- Cursor

Responsibilities:

-   implementation
-   refactoring
-   tests
-   local verification
-   focused commits
-   implementation documentation

Cursor must not be expected to remember previous conversations. Project
context is recovered from repository documentation.
fileciteturn1file3L1365-L1389

------------------------------------------------------------------------

# 4. Current Project Status

## Overall

``` text
STATUS: UX Polish COMPLETE; EPIC-107 Public Landing COMPLETE through P107-06 and epic certification; MASTER_PLAN §34 READY FOR RELEASE; §35 GRANTED; EPIC-108 COMPLETE (ER PASS WITH FINDINGS); EPIC-109 COMPLETE (ER PASS); EPIC-110 CLOSED (P110-00 PASS; P110-01 PASS; P110-02 PASS; P110-03 SKIPPED BY DESIGN; P110-04 PASS; P110-05 PASS; P110-06 / P110-06C intermediate findings resolved or superseded; P110-06D PASS; P110-06C FINAL PASS; P110-07 PASS; P110-08 FREEZE). Actionable R1 findings = 0. R1 FROZEN. R2 Decision Workshop complete for in-scope decisions. R2 planning baseline recorded. R2-E01 Revenue Visibility COMPLETE / RELEASE-READY (P-E01-00…P-E01-07). R2-E02 Invoice Tracking COMPLETE WITH NON-BLOCKING FINDING (P-E02-00…P-E02-07). R2-E03 Payment Tracking CERTIFIED (P-E03-00…P-E03-07). R2-E04 Forecasting & Contract Time Allocation CERTIFIED (P-E04-00…P-E04-07). R2-E05 P-E05-00 COMPLETE AS PLANNING RECOVERY — BLOCKED — PO DECISIONS REQUIRED. R2 is not production-ready.
NEXT: Close E05 PO decisions. E05 plan: `docs/release/r2-e05-advanced-reporting-export.md`. P-E05-01 is not authorized. R2 is not production-ready.
Production Validation (§34): EXECUTED — READY FOR RELEASE — docs/release/production-validation.md
Production Certification (§35): GRANTED — docs/release/production-certification.md
R1 Freeze: FROZEN — docs/release/r1-freeze.md
R2 Decision Pack: docs/release/r2-decision-pack.md
R2 Architecture Delta: docs/release/r2-architecture-delta.md
R2 Epic Map: docs/release/r2-epic-map.md
R2 Open Decisions: docs/release/r2-open-decisions.md
R2-E01 plan: docs/release/r2-e01-revenue-visibility.md
R2-E02 plan: docs/release/r2-e02-invoice-tracking.md
R2-E03 plan: docs/release/r2-e03-payment-tracking.md
R2-E04 plan: docs/release/r2-e04-forecasting-allocation.md
R2-E05 plan: docs/release/r2-e05-advanced-reporting-export.md
Release gate resolution: docs/release/release-gate-resolution.md
Production readiness: RELEASE GRANTED
```

## Completed planning artifacts

``` text
docs/
├── product-vision.md
├── domain-model.md
├── architecture.md
├── storage.md
├── testing-strategy.md
└── release/
    ├── r1-freeze.md
    ├── r2-decision-pack.md
    ├── r2-architecture-delta.md
    ├── r2-epic-map.md
    ├── r2-open-decisions.md
    └── r2-e01-revenue-visibility.md
```

## Current implementation status

``` text
Application implementation: STARTED
Foundation implementation: EPIC-001 COMPLETE; EPIC-002 COMPLETE; EPIC-003 COMPLETE; EPIC-004 COMPLETE; EPIC-005 COMPLETE; EPIC-006 COMPLETE
MVP implementation: EPIC-101 COMPLETE; EPIC-102 COMPLETE; EPIC-103 COMPLETE; EPIC-104 COMPLETE; EPIC-105 COMPLETE; EPIC-106 COMPLETE
MVP integration: COMPLETE / CLOSED — see docs/epics/MVP-INTEGRATION/engineering-review.md
MVP QA Gate: PASS WITH FINDINGS — see docs/qa/qa-report.md
Documentation Gate: COMPLETE — MASTER_PLAN.md §32
Production deployment: HOSTED — Vercel + Neon + Google OAuth + Gmail SMTP (current freeze candidate `c6712224`; deployment `6558481150`; docs/release/r1-freeze.md). Historical §35 grant remains `2b58af4`. Historical §34 rows are not rewritten.
Authentication: IMPLEMENTED — see docs/epics/EPIC-003/engineering-review.md
Workspace / authorization: IMPLEMENTED — see docs/epics/EPIC-004/engineering-review.md
Testing / CI foundation: IMPLEMENTED — see docs/epics/EPIC-005/engineering-review.md
UI foundation: IMPLEMENTED — see docs/epics/EPIC-006/engineering-review.md
Client management: IMPLEMENTED — see docs/epics/EPIC-101/engineering-review.md
Contract management: IMPLEMENTED — see docs/epics/EPIC-102/engineering-review.md
Time tracking: IMPLEMENTED — see docs/epics/EPIC-103/engineering-review.md
Analytics / dashboard: IMPLEMENTED — see docs/epics/EPIC-104/engineering-review.md
Reporting: IMPLEMENTED — see docs/epics/EPIC-105/engineering-review.md
Alerts & notifications: IMPLEMENTED — see docs/epics/EPIC-106/engineering-review.md
Public landing: IMPLEMENTED — P107-05 PASS WITH FINDINGS; P107-06 PASS WITH FINDINGS; epic certification RELEASE BLOCKED — see docs/epics/EPIC-107/
```

EPIC-104 completed the shared analytics layer and the authenticated
monthly dashboard. EPIC-105 extended the analytics layer with
timezone-aware period boundaries, weekly aggregation, and pro-rata
contract capacity; added the reporting service and the `/reports` RSC
surface; and produced integration, E2E, and performance baseline
evidence. No billing, revenue, or rollover semantics were introduced.

``` text
Phase 3: 48c3552
Review:  18c3b0a
Verdict: PASS WITH FINDINGS
Engineering status: COMPLETE
Blocking findings: NONE (F-104-000 RESOLVED)
Production readiness: NO
Tests: 216 unit / 148 integration / 37 E2E (suite totals, reported separately)
Gates: lint PASS; typecheck PASS; build PASS

EPIC-105 — Reporting
Commits: 134800f (P105-01) · 756649d (P105-02) · 428f6e4 + 6822600 (P105-03)
         e1a1a42 (P105-04 initial) · caf6f96 (P105-04 corrective) · 59d28fa (P105-05)
         8faed35 (P105-06)
Verdict: COMPLETE WITH DOCUMENTED ENVIRONMENTAL GATE EXCEPTION
Engineering status: COMPLETE
Blocking findings: NONE
Production readiness: NO
Tests: 331 unit / 187 integration / 51 E2E (suite totals, reported separately)
Gates: lint PASS; typecheck PASS; build PASS
Environmental exceptions: two inherited F-104-006 clock-sensitive E2E failures
                          (time-tracking.spec.ts, unchanged from prior phases),
                          one inherited F-104-006 clock-sensitive integration failure
                          (analytics-isolation.test.ts, unchanged from prior phases).
                          Both fail only when the test runner's local clock
                          crosses midnight while the server runs UTC.

EPIC-106 — Alerts & Notifications
Commits: 6daf2cd (P106-02) · 012f6da (P106-03) · 95eaede (P106-04) · 72d9f1d (P106-05)
         069cb2c (P106-06) · 13a48a0 (P106-07) · 47f82ec (P106-08) · b421e60 (P106-09)
Verdict: COMPLETE — Engineering Review PASS
Engineering status: COMPLETE
Blocking findings: NONE (F-106-P07-001 CLOSED)
Production readiness: NO
Tests: 379 unit / 219 integration / 57 E2E (suite totals, reported separately)
Gates: lint PASS; typecheck PASS; build PASS

MVP Integration — Cross-domain certification
Commits: 35d1764 (P-INT-01) · d4e420c (P-INT-02) · 74d6968 (P-INT-03) · ad944a2 (P-INT-04)
         9541779 (P-INT-05)
Verdict: COMPLETE / CLOSED — Engineering Review PASS WITH FINDINGS
Engineering status: COMPLETE
Blocking findings: NONE
Release gate: 3/3 PASS — 22-step authenticated MVP integration journey; 22/22 assertions PASS
Production readiness: NO
Tests: 392 unit / 223 integration (1 pre-existing FINDING-INT-001) / 58 E2E (54 passed / 4 failed, all classified non-application defects)
Gates: lint PASS; typecheck PASS; build PASS
Open findings deferred to QA / Production Certification: FINDING-INT-002, FINDING-INT-003
Accepted / pre-existing: FINDING-P04-002 ACCEPTED; FINDING-P04-003 PRE-EXISTING; FINDING-INT-001 PRE-EXISTING
Closed: FINDING-P04-001

MVP QA Gate — §31
Evidence: docs/qa/qa-report.md
HEAD at QA: c872a83
Verdict: PASS WITH FINDINGS
Blocking findings: NONE
Production readiness: NO
Critical workflows: PASS
Regressions: PASS
Edge cases: PASS WITH FINDINGS
Authorization: PASS
Workspace isolation: PASS
Contract validity: PASS
Billing calculations: N/A (no billing/revenue in MVP)
Utilization: PASS
Alerts: PASS
Reporting: PASS WITH FINDINGS
Authentication: PASS
Stability: PASS WITH FINDINGS
Performance smoke: PASS
Error states: PASS
Lint: 0 errors / 6 pre-existing warnings
Typecheck: PASS
Unit: 392/392
Integration (host TZ): 224/224
Build: PASS
E2E: 58/58
Release-gate: 5 pass / 1 flaky failure (FINDING-QA-001)
Focused release-gate: PASS
Isolated release-gate: 3/3 PASS after the burst failure
Core journeys: ALL PASS
Timezone current periods: PASS
Custom date range: APPLICATION DEFECT — FINDING-QA-002 (OPEN / NON-BLOCKING)

Documentation Gate — §32
Status: COMPLETE

UX Gate — §33
Status: COMPLETE
Verdict: PASS WITH FINDINGS
Evidence: `docs/ux/ux-review.md`
Blocking findings: NONE
Next: §34 READY FOR RELEASE; §35 GRANTED (D-005 PROVIDED)

UX Polish — after §33
Status: COMPLETE
Evidence: `docs/ux/ux-review.md` §18
Closed: FINDING-UX-001, UX-002, UX-003, UX-005, UX-006, UX-007, UX-008, UX-009
Remaining OPEN: FINDING-UX-004; FINDING-QA-002; FINDING-INT-001/002/003; FINDING-QA-001; F-104-007

Findings after QA / UX Polish (current):
FINDING-P04-001 CLOSED
FINDING-P04-002 ACCEPTED / BY DESIGN
FINDING-P04-003 CLOSED
FINDING-INT-001 CLOSED — EPIC-108 Stream A / ER-108-A PASS
FINDING-INT-002 CLOSED — EPIC-108 Stream B / ER-108-B PASS
FINDING-INT-003 CLOSED — EPIC-108 Stream B / ER-108-B PASS
FINDING-QA-001 CLOSED — EPIC-108 Stream B / ER-108-B PASS
FINDING-QA-002 CLOSED — EPIC-108 Stream A / ER-108-A PASS
FINDING-108-001 CLOSED — EPIC-108 Stream A / ER-108-A PASS
F-104-007 CLOSED — EPIC-108 Stream E / ER-108-E PASS
FINDING-UX-001 CLOSED
FINDING-UX-002 CLOSED
FINDING-UX-003 CLOSED
FINDING-UX-004 CLOSED — EPIC-108 Stream C / C05 verification PASS
FINDING-UX-005 CLOSED
FINDING-UX-006 CLOSED
FINDING-UX-007 CLOSED
FINDING-UX-008 CLOSED
FINDING-UX-009 CLOSED
F-105-013 CLOSED — EPIC-110 / P110-02
F-103-002 CLOSED — EPIC-110 / P110-02
F-104-001 CLOSED — EPIC-105 / P105-02
F-104-002 CLOSED — EPIC-105 / P105-02
F-104-003 CLOSED — EPIC-105 / P105-04
F-104-004 CLOSED — EPIC-105 / P105-04
F-104-005 CLOSED — EPIC-105 / P105-03
F-104-013 CLOSED — EPIC-105 / P105-03
F-104-014 CLOSED — EPIC-105 / P105-02
F-104-015 CLOSED — EPIC-105 / PD-105-010
F-104-017 CLOSED — EPIC-105 / P105-04
F-104-P-002 CLOSED — subsumed by F-104-005 / P105-03
F-103-003 ACCEPTED R1 LIMITATION — EPIC-110 / P110-01
P109-05 LA updatedAt CLOSED / NOT REPRODUCED — EPIC-110 / P110-01
FINDING-110-P06-001 CLOSED TECHNICAL — EPIC-110 / P110-06C
F-110-P06-002 CLOSED TECHNICAL / production-verified — EPIC-110 / P110-06C FINAL
```

Present after EPIC-104:

-   `AnalyticsService` as the shared, workspace-scoped calculation
    layer for monthly, daily, client-allocation, and
    contract-utilization figures
-   `AnalyticsRepository` performing `workspaceId`-scoped Prisma
    aggregation and grouping over `TimeEntry`
-   analytics domain types and period utilities in
    `src/lib/analytics-periods.ts`
-   the authenticated dashboard at `/` — a React Server Component that
    replaced the EPIC-006 structural placeholder; no `/dashboard`
    route existed at EPIC-104 close. EPIC-107 later moved the dashboard
    to `/dashboard` and made `/` the public landing.
-   monthly summary, client allocation, and contract utilization
    surfaces with empty and error states
-   archived-client time included in analytics and labelled
    `Archived` (PD-104-001); utilization uses all tracked time
    (PD-104-002); current-month default (PD-104-003)
-   workspace isolation proven by six integration scenarios
-   no schema or migration change; no revenue, rate, or commercial
    amount calculated anywhere in the analytics layer
-   weekly aggregation, timezone-aware period boundaries, loading
    skeletons, a custom date-range UI, and a measured performance
    baseline are **not** implemented — see F-104-013, F-104-005,
    F-104-008, Epic-plan §5, and F-104-009

Present after EPIC-103:

``` text
Phase 3: 2e67759
Verdict: PASS WITH FINDINGS
Tests: 164 unit / 119 integration / 21 E2E (suite totals at EPIC-103 closure)
```


-   workspace-scoped TimeEntry create, read, daily list, weekly
    timesheet, update, and hard delete
-   `workDate`, `clientId`, and `contractId` immutable after creation;
    update permits `durationMinutes`, `description`, and `billable`
-   client-first selection with contracts filtered by client and
    `[validFrom, validTo)` validity for the work date
-   archived-client create rejection; existing entries remain readable
    and editable at the application layer
-   integer-minute duration storage with 1–1440 bounds
-   future dates and duplicate entries permitted
-   `/time-tracking` is a product surface with `/time-tracking/new` and
    `/time-tracking/[timeEntryId]/edit`
-   `TimeEntryRepository.listTimeEntriesForPeriod`, `updateTimeEntry`,
    and `deleteTimeEntry` without schema or migration change
-   lifecycle and isolation integration tests plus the Playwright time
    tracking journey
-   no rate calculation, billing, forecasting, or analytics

Present after EPIC-102:

-   workspace-scoped create, list, detail, and update
-   Client association, archived-client create rejection, and existing
    contract editability
-   `[validFrom, validTo)` validity, open-ended contracts, and overlap
    prevention
-   PostgreSQL exclusion constraint as concurrency authority
-   `HOURLY` / `DAILY` billing, rate, currency, monthly hours, payment
    terms
-   Server Actions for mutations; RSC / application-service reads
-   `ContractRepository.updateContract` and `listContracts` without
    schema or migration change
-   isolation integration tests and Playwright contract journey
-   `/contracts` is a product surface; client detail shows contract
    history

This is not production readiness. Release 0 Foundation engineering
remains complete. MVP implementation, integration, QA, and
Documentation Gate, UX Review, and UX Polish are complete. Production
Validation and Production Certification remain required.

This distinction is deliberate: planning documents describe what has
been designed; future documentation updates must describe what has
actually been implemented. The methodology explicitly requires
documentation to be synchronized with reality rather than describing
planned behavior as implemented behavior.
fileciteturn1file2L883-L889

------------------------------------------------------------------------

# 5. Product Objective

FreelanceOS is a freelancer operations platform designed to provide a
single operational console for:

-   client management
-   contract management
-   work-hour tracking
-   contract utilization
-   revenue estimation
-   reporting
-   threshold alerts
-   notification management

The product should behave as an **operations system**, not merely as a
timesheet.

The MVP prioritizes deterministic business logic and historical
correctness.

AI is intentionally deferred until the deterministic operational core is
stable.

------------------------------------------------------------------------

# 6. Architectural Baseline

## Architecture style

``` text
Modular Monolith
```

not microservices.

## Technology baseline

``` text
Next.js
React
TypeScript
PostgreSQL
Prisma
Better Auth
shadcn/ui
Tailwind CSS
Zod
Vitest
Playwright
```

Exact package versions will be pinned during Foundation implementation.

------------------------------------------------------------------------

## Logical architecture

``` text
Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure
```

Infrastructure implements persistence and external adapters without
leaking infrastructure concerns into the domain.

------------------------------------------------------------------------

## Core modules

``` text
Authentication
Workspace
Clients
Contracts
Time Tracking
Analytics
Billing
Alerts
Notifications
Dashboard
```

Analytics is a shared capability used by dashboard, reports, alerts, and
billing calculations.

R2 Revenue Operations (Accrued / Expected / Forecast, Invoice Tracking,
Payment Tracking, Contract Time Allocation) is documented in
`docs/release/r2-decision-pack.md`. Planning baseline:
`docs/release/r2-epic-map.md`. It does not add a profitability or
accounting module. The historical module name “Billing” remains the R1
calculation placeholder.

------------------------------------------------------------------------

# 7. Core Domain Decisions

The following decisions are considered part of the current baseline.

## Client vs Contract

`Client` is customer identity.

`Contract` is the commercial agreement valid during a defined period.

This separation preserves historical correctness.

------------------------------------------------------------------------

## Time duration

Store:

``` text
durationMinutes: integer
```

not floating-point hours.

------------------------------------------------------------------------

## Money

Store exact decimal values using PostgreSQL numeric representation and
an explicit currency.

No floating-point persistence for money.

------------------------------------------------------------------------

## Contract validity

Use:

``` text
[validFrom, validTo)
```

where `validTo` is exclusive.

Overlapping contracts for the same client are forbidden.

------------------------------------------------------------------------

## Historical TimeEntry

`TimeEntry` stores an explicit `contractId`.

Historical reports must not dynamically reinterpret old work using the
client's current contract.

------------------------------------------------------------------------

## Multi-tenancy

Every business record is workspace-scoped.

Server-side authorization is mandatory.

A client-controlled `workspaceId` is never considered sufficient
authorization.

------------------------------------------------------------------------

# 8. Release Roadmap

``` text
Release 0 — Foundation
        ↓
Release 1 — MVP
        ↓
Release 2 — Revenue Operations
        ↓
Release 3 — Integrations
        ↓
Release 4 — AI
```

Historical name “Release 2 — Billing & Intelligence” is superseded.
Canonical R2 decisions: `docs/release/r2-decision-pack.md`.

The releases are intentionally sequential.

A later release must not expand while the previous release has
unresolved critical defects.

The methodology explicitly favors validating one Epic before expanding
to the next. fileciteturn1file5L1838-L1843

------------------------------------------------------------------------

# 9. Release 0 --- Foundation

## Objective

Create a production-capable technical foundation before business
functionality is implemented.

## Scope

### R0-E01 --- Repository & Application Bootstrap

Establish:

-   Next.js application
-   TypeScript
-   package manager
-   linting
-   formatting
-   environment configuration
-   basic project scripts
-   initial repository structure

### R0-E02 --- Database & Persistence Foundation

Establish:

-   PostgreSQL connection
-   Prisma
-   initial schema
-   migration strategy
-   development database
-   seed infrastructure
-   repository boundaries

### R0-E03 --- Authentication Foundation

Establish:

-   Better Auth
-   session management
-   email/password foundation
-   Google OAuth configuration
-   protected server boundary

### R0-E04 --- Workspace Foundation

Establish:

-   workspace model
-   workspace membership
-   role baseline
-   server-side workspace resolution
-   tenant isolation primitives

### R0-E05 --- Testing & CI Foundation

Establish:

-   Vitest
-   integration test environment
-   Playwright
-   test database strategy
-   CI quality gates
-   initial isolation/security tests

### R0-E06 --- UI Foundation

Establish:

-   shadcn/ui
-   Tailwind
-   application shell
-   typography/layout baseline
-   navigation foundation
-   accessible form primitives
-   loading/error/empty-state primitives

------------------------------------------------------------------------

## Release 0 Non-Goals

Do not implement:

-   client CRUD
-   contract CRUD
-   time tracking
-   reports
-   billing
-   alerts
-   AI
-   e-invoicing

The purpose of Release 0 is to establish the platform on which those
features will be built.

------------------------------------------------------------------------

## Release 0 Exit Criteria

``` text
Application boots
        ↓
Database connects
        ↓
Migrations work
        ↓
Authentication works
        ↓
Workspace isolation works
        ↓
Tests execute
        ↓
CI passes
        ↓
Production build succeeds
```

Release 0 is complete only when the technical foundation is demonstrably
usable by the first MVP Epic.

------------------------------------------------------------------------

# 10. Release 1 --- MVP

## Objective

Deliver the smallest complete operational loop for a freelancer.

Primary workflow:

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
→ Receive threshold warning
→ View monthly revenue
→ Generate report
→ View notification
```

------------------------------------------------------------------------

# 11. MVP Epic Map

## R1-E01 --- Client Management

### Status

IMPLEMENTED — engineering complete (PASS). Review:
`docs/epics/EPIC-101/engineering-review.md`. Contract management is
implemented in R1-E02.

### Objective

Manage the client master data required by the rest of the product.

### Scope

-   create client
-   edit client
-   list clients
-   client detail
-   archive client
-   client search/filter as justified by UX
-   historical visibility for archived clients

### Dependencies

``` text
R0-E04 Workspace
R0-E06 UI
```

### Exit criteria

A user can create and maintain a client without bypassing workspace
authorization.

------------------------------------------------------------------------

# 12. R1-E02 --- Contract Management

### Status

IMPLEMENTED — engineering complete (PASS WITH FINDINGS). Review:
`docs/epics/EPIC-102/engineering-review.md`. Time tracking is not
included. Production readiness is not claimed.

## Objective

Represent commercial agreements and preserve their history.

## Scope

-   create contract
-   edit contract where permitted
-   contract history
-   validity dates
-   hourly billing
-   daily billing
-   rate
-   currency
-   monthly contracted hours
-   payment terms
-   overlap validation
-   historical contract visibility

## Dependencies

``` text
R1-E01 Client Management
R0-E02 Database
```

## Exit criteria

A client can have sequential historical contracts and historical
validity remains correct.

------------------------------------------------------------------------

# 13. R1-E03 --- Time Tracking

### Status

IMPLEMENTED — engineering complete (PASS WITH FINDINGS). Review:
`docs/epics/EPIC-103/engineering-review.md`. Calendar view and
copy-previous-entry are deferred; copy-previous-entry remains
conditional on UX Review. No billing, rate calculation, or forecasting
was introduced. Production readiness is not claimed.

## Objective

Make daily work registration fast enough for normal use.

## Scope

-   create time entry
-   edit time entry
-   delete time entry
-   client selection
-   contract selection
-   date
-   duration
-   description
-   billable/non-billable
-   daily view
-   weekly timesheet
-   calendar view — deferred, not implemented
-   copy previous entry if retained after UX review — deferred, UX
    Review has not occurred

## Dependencies

``` text
R1-E01 Client Management
R1-E02 Contract Management
```

## Primary success criterion

A normal workday entry should be recordable in less than one minute.

------------------------------------------------------------------------

# 14. R1-E04 --- Analytics & Dashboard

### Status

IMPLEMENTED — engineering complete (PASS WITH FINDINGS). Review:
`docs/epics/EPIC-104/engineering-review.md`. Blocking findings: none.
Production readiness is not claimed. EPIC-104 delivered the dashboard
as the authenticated default route `/`. EPIC-107 moved it to
`/dashboard` under the existing `(app)` layout and made `/` the public
landing. Estimated revenue and current alerts were removed from this
Epic's scope (see the scope reconciliation below). Weekly aggregation,
timezone-aware period boundaries, loading skeletons, a custom
date-range UI, and a measured query-performance baseline are not
implemented.

## Objective

Create a shared deterministic analytics layer and expose the operational
dashboard.

## Scope

Approved and delivered scope:

-   current month total hours
-   billable hours
-   non-billable hours
-   client allocation
-   contract utilization
-   shared analytics services

### Scope reconciliation — revenue and alerts

This section previously listed `estimated revenue` and
`current alerts` in R1-E04 scope. The approved EPIC-104 plan declared
both **explicit non-goals**: revenue and every monetary calculation
are deferred (Epic-plan §5), and alerts belong to R1-E06 Alerts &
Notifications. The Engineering Review confirmed that no revenue or
commercial amount is calculated anywhere in the delivered analytics
layer and that no alert surface exists.

The historical wording is recorded here for audit only. The current
R1-E04 scope is the list above.

-   estimated revenue → deferred; depends on the commercial
    calculation decisions tracked as OBD-002 and OBD-011
-   current alerts → R1-E06 Alerts & Notifications; the undocumented
    80 percent bar-colour change in `ContractUtilization.tsx` is a
    visual cue only and must not be read as an accepted threshold
    (OBD-006 remains open)

## Dependencies

``` text
R1-E02 Contract Management
R1-E03 Time Tracking
```

## Architectural requirement

Dashboard calculations must use the shared analytics capability.

Do not create dashboard-specific versions of business calculations.

This requirement is **not** satisfied as delivered: percentage
arithmetic exists in three independent places and the shared
`AnalyticsService` statics are unreachable from production code
(F-104-002, open). R1-E05 Reporting must consume the shared service
and must not reproduce the duplicated arithmetic.

------------------------------------------------------------------------

# 15. R1-E05 --- Reporting

## Status

IMPLEMENTED — engineering complete (COMPLETE WITH DOCUMENTED ENVIRONMENTAL GATE EXCEPTION).
Engineering Review pending (P105-08). Blocking findings: none.
Production readiness is not claimed.

## Objective

Provide reliable operational reporting.

## Scope

Approved and delivered scope:

-   today
-   week
-   month
-   year
-   custom period
-   hours by client
-   contract report
-   annual overview

### Scope reconciliation — revenue by client

This section previously listed `revenue by client` in R1-E05 scope.
The approved EPIC-105 plan declared it an **explicit non-goal**:
revenue and every monetary calculation are deferred (PD-105-001).
OBD-001, OBD-002, OBD-011, and OBD-016 remain open and are not
closed by this exclusion. The Engineering Review confirmed that no
revenue or commercial amount is calculated anywhere in the delivered
reporting layer.

The historical wording is recorded here for audit only. The current
R1-E05 scope is the list above.

-   revenue by client → deferred; depends on OBD-001, OBD-002,
    OBD-011, OBD-016, and a decision on live contract fields versus
    snapshots (P102-F-001).

## Dependencies

``` text
R1-E04 Analytics & Dashboard
```

## Exit criteria

Dashboard and reports agree on the same underlying business figures.

------------------------------------------------------------------------

# 16. R1-E06 --- Alerts & Notifications

## Objective

Surface important contractual/capacity conditions before they become
surprises.

## Scope

-   contract warning threshold
-   contract exceeded
-   monthly capacity warning
-   monthly capacity exceeded
-   alert deduplication
-   in-app notifications
-   read/unread state
-   notification center

Default contract warning threshold:

``` text
80%
```

subject to final business confirmation.

## Dependencies

``` text
R1-E04 Analytics & Dashboard
R0-E04 Workspace
```

------------------------------------------------------------------------

# 17. MVP Integration Epic

**Status:** COMPLETE / CLOSED — Engineering Review PASS WITH FINDINGS  
**Plan:** `docs/epics/MVP-INTEGRATION/epic-plan.md`  
**Review:** `docs/epics/MVP-INTEGRATION/engineering-review.md`  
**QA:** PASS WITH FINDINGS — `docs/qa/qa-report.md`  
**Documentation Gate:** COMPLETE (§32)  
**Blocking findings:** NONE  
**Production readiness:** NO  
**Release gate (integration):** PASSED (3/3; 22-step authenticated journey; 22/22 assertions)  
**Release gate (QA):** 5 pass / 1 flaky failure (FINDING-QA-001); focused PASS; isolated 3/3 PASS  
**UX Gate:** COMPLETE — PASS WITH FINDINGS (`docs/ux/ux-review.md`). Blocking findings: NONE.  
**UX Polish:** COMPLETE — `docs/ux/ux-review.md` §18.  
**Next:** D-001–D-005 complete. MASTER_PLAN §34 READY FOR RELEASE. §35 GRANTED (`docs/release/production-certification.md`). Production readiness: RELEASE GRANTED.

After individual MVP Epics are complete, perform an explicit integration
phase.

## Objective

Validate the entire operational loop.

``` text
Authentication
     ↓
Workspace
     ↓
Client
     ↓
Contract
     ↓
TimeEntry
     ↓
Analytics
     ↓
Dashboard
     ↓
Alerts
     ↓
Notifications
     ↓
Reports
```

This is not a new feature Epic.

It is the integration and validation step required before release gates.

------------------------------------------------------------------------

# 17A. R1-E07 --- Public Landing

**Status:** IMPLEMENTATION COMPLETE — Engineering Review PASS WITH FINDINGS (P107-05); production-like validation PASS WITH FINDINGS (P107-06); epic certification RELEASE BLOCKED  
**Plan:** `docs/epics/EPIC-107/epic-plan.md`  
**Identifier:** EPIC-107 / R1-E07  
**HEAD at planning:** `791c879`  
**HEAD at P107-03:** `2ee06fb`  
**Engineering Review:** COMPLETE — PASS WITH FINDINGS (P107-05)  
**Epic production-like validation:** COMPLETE — PASS WITH FINDINGS (P107-06)  
**MASTER_PLAN §34:** EXECUTED — READY FOR RELEASE — `docs/release/production-validation.md`. Hosted blockers CLOSED.  
**MASTER_PLAN §35:** GRANTED — `docs/release/production-certification.md`. D-005 PROVIDED.  
**Production readiness:** RELEASE GRANTED

At planning: unauthenticated `/` redirected to `/sign-in`. There was no public landing and no `/dashboard` route. The authenticated dashboard lived at `/`.

Implemented (P107-01 … P107-03): public `/` landing; authenticated dashboard at `/dashboard` under existing `(app)` / AppShell; authenticated `/` never renders the landing (one workspace → `/dashboard`; none → `/onboarding`; ambiguous → `/workspace-unavailable`); sign-out → `/`; unauthenticated `/dashboard` → `/sign-in`; post-auth destination `/dashboard`; reset-password success remains `/sign-in`. Wordmark-only plain `FreelanceOS` text. No brand asset. No site-wide dark mode. No authenticated-app restyle.

This is a dedicated MVP product-surface Epic (public landing) plus authenticated route migration (`/` → `/dashboard`). It is not a Documentation Gate, UX Gate, or Production Validation phase. The Epic is not CLOSED.

## Objective

Public `/` landing with Sign Up / Sign In entry points. Authenticated dashboard at `/dashboard`. Authenticated `/` redirects to `/dashboard` (or workspace-gate). Sign-out lands on `/`. Wordmark-only plain text. No new brand asset. No site-wide dark mode. No authenticated-app restyle.

## Dependencies

``` text
Authentication (EPIC-003)
Workspace (EPIC-004)
UI Foundation (EPIC-006)
Analytics & Dashboard (EPIC-104)
MVP Integration COMPLETE
UX Polish COMPLETE
```

------------------------------------------------------------------------

# 18. MVP Non-Goals

The following are explicitly outside Release 1:

-   electronic invoicing / SDI
-   full invoice lifecycle (R2 replaces this with Invoice Tracking only — D2)
-   payment management (R1 non-goal; R2 adds operational Payment Tracking — D5)
-   accounting
-   expense management
-   tax management
-   profitability / cost accounting (owned by PIVA Balance; never FreelanceOS — D3)
-   advanced team management
-   native mobile applications
-   calendar integrations
-   Slack/Teams integrations
-   AI assistant
-   advanced forecasting
-   advanced multi-currency reporting

These may become later-release work.

------------------------------------------------------------------------

# 19. Release 2 --- Revenue Operations

## Status

R1 remains certified / released / FROZEN. R2 is the active next product
evolution. R2-E01 Revenue Visibility is COMPLETE / RELEASE-READY.
R2-E02 Invoice Tracking is COMPLETE WITH NON-BLOCKING FINDING
(P-E02-00…P-E02-07). R2-E03 Payment Tracking is CERTIFIED
(`docs/release/r2-e03-payment-tracking.md`; P-E03-00…P-E03-07).
R2-E04 Forecasting & Contract Time Allocation is CERTIFIED
(`docs/release/r2-e04-forecasting-allocation.md`; P-E04-00…P-E04-07).
R2-E05 detailed plan exists (`docs/release/r2-e05-advanced-reporting-export.md`).
P-E05-00 is BLOCKED — PO DECISIONS REQUIRED. E05 implementation is not
authorized. R2 is not production-ready.

Canonical decisions: `docs/release/r2-decision-pack.md`.
Architecture delta: `docs/release/r2-architecture-delta.md`.
Executable epic map: `docs/release/r2-epic-map.md`.
Residual questions: `docs/release/r2-open-decisions.md`.
E01 plan: `docs/release/r2-e01-revenue-visibility.md`.
E02 plan: `docs/release/r2-e02-invoice-tracking.md`.
E03 plan: `docs/release/r2-e03-payment-tracking.md`.
E04 plan: `docs/release/r2-e04-forecasting-allocation.md`.
E05 plan: `docs/release/r2-e05-advanced-reporting-export.md`.

This section does not authorize E05 implementation.

## Objective

Add Financial / Revenue Operations **secondary** to Time Tracking.

``` text
TIME TRACKING > CONTRACT > REVENUE VISIBILITY > PAYMENT TRACKING
```

FreelanceOS is not a billing, accounting, fiscal, profitability, or
cost-accounting system. PIVA Balance owns costs, profitability, and
fiscality / accounting. Integration with PIVA Balance is not R2.

## In R2

-   Revenue visibility — Accrued, Expected, Forecast (D4)
-   Invoice Tracking only (D2)
-   Payment Tracking and simple discrepancies (D5, D6, R2-OD-009)
-   Forecasting and optional Contract Time Allocation (R2-OD-013)
-   Advanced reporting; simple CSV only if R2-E05 planning justifies it

## Out of R2

-   Invoice Lifecycle / generation / PDF / numbering / e-invoicing / line items / credit notes
-   Profitability, cost allocation, tax, accounting calculations
-   FX conversion and cross-currency aggregation
-   Installment engine, ML/AI forecast, risk scoring
-   Workspace capacity alerts, period-close, dedicated audit ledger
-   PIVA Balance integration

## Product priority

TIME TRACKING FIRST. TimeEntry remains currency-agnostic. Currency
belongs to the Contract (D7).

## Planning Epics

Planning labels only. Full baseline: `docs/release/r2-epic-map.md`.

``` text
R2-E01 Revenue Visibility
R2-E02 Invoice Tracking          (parallel with E01)
R2-E03 Payment Tracking          (after E02)
R2-E04 Forecasting & Contract Time Allocation  (after E01)
R2-E05 Advanced Reporting & Export             (trailing; does not block E01–E03)
```

### R2-E01 --- Revenue Visibility

Accrued Revenue and HOURLY Expected Revenue. Independent of invoice and
payment. Detailed plan: `docs/release/r2-e01-revenue-visibility.md`.
COMPLETE / RELEASE-READY (P-E01-00…P-E01-07). Commercial snapshot
`snapshotBillingModel` / `snapshotRate` / `snapshotCurrency` on TimeEntry.
R2-OD-016 and R2-OD-017 closed. E02 Invoice Tracking is COMPLETE WITH
NON-BLOCKING FINDING. E03 Payment Tracking is CERTIFIED
(P-E03-00…P-E03-07). R2 is not production-ready.

### R2-E02 --- Invoice Tracking

Replaces withdrawn Invoice Lifecycle. Operational invoice records only.
VOID / soft-delete. No fiscal invoice engine. Detailed plan:
`docs/release/r2-e02-invoice-tracking.md`. COMPLETE WITH NON-BLOCKING
FINDING (P-E02-00…P-E02-07). Currency snapshot and VOID semantics
closed and implemented. `dueDate` uses the Invoice terms snapshot, not
live Contract terms. Payment is implemented in R2-E03.

### R2-E03 --- Payment Tracking & Reconciliation

Expected payment date is Invoice `dueDate` (invoiceDate + snapshotted
`paymentTermsDays`). Do not reread live Contract terms.
Multiple payment events. Derived UNPAID / PARTIAL / PAID / MISMATCH.
Independent PAYMENT_OVERDUE. E03-D-VOID-PAYMENTS CLOSED: Option A
freeze writes on VOID. Detailed plan:
`docs/release/r2-e03-payment-tracking.md`. CERTIFIED (P-E03-00…P-E03-07).
Accepted findings F-E03-001…005. Release migration: `prisma migrate deploy`.

### R2-E04 --- Forecasting & Contract Time Allocation

Deterministic linear Forecast from Accrued and elapsed time. Optional
`allocatedMinutes`. No workspace capacity alerts. Detailed plan:
`docs/release/r2-e04-forecasting-allocation.md`. CERTIFIED (P-E04-00…P-E04-07).
Forecast = Accrued / elapsedFraction on the certified current period only.
Null and zero allocation have no status / no alert (8-C). Positive: `<80`
NORMAL, `80–100` WARNING, `>100` EXCEEDED. Accepted findings retained.
Release migration: `prisma migrate deploy`.

### R2-E05 --- Advanced Reporting & Export

Operational reporting extensions. Document / PDF generation is out of
core R2. Simple CSV only if planning shows low complexity. Excel is not
an R2 decision. Detailed plan:
`docs/release/r2-e05-advanced-reporting-export.md`. P-E05-00 COMPLETE AS
PLANNING RECOVERY — BLOCKED — PO DECISIONS REQUIRED. Implementation is
not authorized.

## Historical map (superseded)

The previous “Billing & Intelligence” candidates were:

-   R2-E01 Invoice Lifecycle — **withdrawn** (D2)
-   R2-E02 Payment Tracking — retained as current R2-E03, narrowed
-   R2-E03 Forecasting & Capacity — retained as current R2-E04, reduced
-   R2-E04 Advanced Reporting & Export — retained as current R2-E05
-   R2-E05 Commercial Intelligence — **withdrawn** (D3)

Do not plan or implement from the historical list.

------------------------------------------------------------------------

# 20. Release 3 --- Integrations

## Objective

Connect FreelanceOS to external operational/accounting systems.

Potential Epics:

### R3-E01 --- E-Invoicing

Potential:

-   electronic invoice generation
-   SDI integration
-   delivery status
-   rejection handling
-   invoice lifecycle synchronization

This requires dedicated architecture and compliance analysis before
implementation.

### R3-E02 --- Calendar Integration

Potential:

-   calendar import
-   work-event conversion
-   synchronization rules

### R3-E03 --- Accounting Integration

Potential:

-   export
-   synchronization
-   accounting-system adapters

No Release 3 implementation begins from this MASTER_PLAN alone. Each
integration requires its own architecture and Epic plan.

------------------------------------------------------------------------

# 21. Release 4 --- AI

## Objective

Add AI only after the deterministic operational platform is mature.

The AI layer must sit above controlled application/domain services.

``` text
LLM
 ↓
Controlled application services
 ↓
Domain
 ↓
Database
```

The LLM must not:

``` text
query PostgreSQL directly
execute arbitrary SQL
calculate authoritative financial totals
bypass authorization
```

------------------------------------------------------------------------

# 22. AI Epic Candidates

## R4-E01 --- Natural Language Analytics

Examples:

``` text
"Quanto ho fatturato con ACME negli ultimi tre mesi?"
```

``` text
"Quante ore ho lavorato questo mese?"
```

The AI translates intent into controlled analytics operations.

------------------------------------------------------------------------

## R4-E02 --- Timesheet Assistant

Example:

``` text
"Oggi ho lavorato 3 ore per ACME sulla migrazione."
```

The assistant converts the request into a structured time-entry
proposal.

The final persisted record remains subject to normal validation and
authorization.

------------------------------------------------------------------------

## R4-E03 --- Business Assistant

Example:

``` text
"Come sto andando questo mese?"
```

The assistant summarizes deterministic application data in natural
language.

It must not invent authoritative figures.

------------------------------------------------------------------------

# 23. Cross-Cutting Epic --- Engineering Quality

Quality is not one final Epic. It is embedded in every Epic.

Each Epic must include:

``` text
Implementation
→ Engineering Review
→ QA
→ Documentation
→ UX Review
→ UX Polish
```

The methodology explicitly defines Engineering Review before QA and UX
Review after QA. fileciteturn1file1L543-L628

------------------------------------------------------------------------

# 24. Epic Lifecycle

Every Epic follows:

``` text
Epic Plan
   ↓
Phase 1
   ↓
Commit
   ↓
Phase 2
   ↓
Commit
   ↓
...
   ↓
Engineering Review
   ↓
QA
   ↓
Documentation
   ↓
UX Review
   ↓
UX Polish
   ↓
Epic Complete
```

Every Epic must have an Epic Plan before implementation.

The methodology defines Epic plans as pre-implementation documents
containing objectives, scope, phases, and non-goals.
fileciteturn1file3L1241-L1259

------------------------------------------------------------------------

# 25. Phase Rules

Each implementation Phase must specify:

``` text
New Cursor chat: YES
Commit expected: YES / NO
```

The implementation prompt must contain:

-   context
-   mission
-   implementation requirements
-   acceptance criteria
-   output format
-   commit message

The methodology explicitly requires focused implementation prompts and
recommends a new Cursor chat for each phase.
fileciteturn1file5L1659-L1680

------------------------------------------------------------------------

# 26. Expected Commit Strategy

Default:

``` text
One Phase = One meaningful commit
```

Examples:

``` text
feat(auth): establish authentication foundation
feat(workspace): add workspace membership
feat(clients): implement client management
feat(contracts): implement contract lifecycle
feat(time): implement time entry workflow
feat(analytics): implement monthly analytics
feat(alerts): implement threshold alerts
```

Commit messages will be finalized in each Epic plan.

------------------------------------------------------------------------

# 27. Dependency Graph

The MVP dependency graph is:

``` text
R0-E01 Repository Bootstrap
       │
       ├───────────────┐
       ▼               ▼
R0-E02 Database    R0-E06 UI Foundation
       │               │
       ▼               │
R0-E03 Auth            │
       │               │
       ▼               │
R0-E04 Workspace ──────┘
       │
       ▼
R0-E05 Testing/CI
       │
       ▼
R1-E01 Clients
       │
       ▼
R1-E02 Contracts
       │
       ▼
R1-E03 Time Tracking
       │
       ▼
R1-E04 Analytics/Dashboard
       │
       ├───────────────┐
       ▼               ▼
R1-E05 Reporting   R1-E06 Alerts/Notifications
       │               │
       └───────┬───────┘
               ▼
        MVP Integration
               │
               ▼
          Release Gates
```

Some Foundation work can proceed in parallel, but business-domain Epics
should follow the dependency chain unless a later Epic can be safely
isolated.

------------------------------------------------------------------------

# 28. Recommended Implementation Order

## Phase Group A --- Foundation

1.  Repository bootstrap
2.  Database and Prisma
3.  Authentication
4.  Workspace isolation
5.  Testing/CI
6.  UI foundation

## Phase Group B --- Core Operations

7.  Client management
8.  Contract management
9.  Time tracking

## Phase Group C --- Intelligence

10. Analytics
11. Dashboard
12. Reporting
13. Alerts
14. Notifications

## Phase Group D --- MVP Validation

15. Integration
16. Engineering Review
17. QA
18. Documentation synchronization
19. UX Review
20. UX Polish
21. Public Landing (EPIC-107 / R1-E07) — inserted after UX Polish; required before Production Validation
22. Production Validation
23. Production Certification
24. Release

This order minimizes downstream rework.

------------------------------------------------------------------------

# 29. Foundation Completion Gate

Release 0 cannot proceed to MVP feature development until:

-   [ ] repository structure exists
-   [ ] environment configuration exists
-   [ ] PostgreSQL is connected
-   [ ] Prisma schema/migrations work
-   [x] authentication foundation works
-   [ ] workspace membership works
-   [ ] cross-workspace access is rejected
-   [x] test suite runs
-   [x] CI passes
-   [x] production build passes
-   [x] initial UI shell works
-   [ ] architecture has not been violated

------------------------------------------------------------------------

# 30. MVP Engineering Gate

Before QA begins:

-   [x] all planned MVP Epics implemented
-   [x] architecture remains compliant
-   [x] dependencies are controlled
-   [x] no direct UI → Prisma access
-   [x] no domain → Prisma dependency
-   [x] workspace authorization is server-side
-   [x] business calculations are centralized
-   [x] historical contract behavior is preserved
-   [x] tests pass
-   [x] known technical debt is documented

Engineering Review answers:

> **Is the implementation technically sound?**

This is the methodology's defined purpose for Engineering Review.
fileciteturn1file1L543-L560

------------------------------------------------------------------------

# 31. MVP QA Gate

QA must verify:

-   [x] critical workflows — PASS
-   [x] regressions — PASS
-   [x] edge cases — PASS WITH FINDINGS
-   [x] authorization — PASS
-   [x] workspace isolation — PASS
-   [x] contract validity — PASS
-   [ ] billing calculations — N/A (MVP has no billing/revenue; utilization/capacity verified)
-   [x] utilization — PASS
-   [x] alerts — PASS
-   [x] reporting — PASS WITH FINDINGS (FINDING-QA-002)
-   [x] authentication — PASS
-   [x] stability — PASS WITH FINDINGS (FINDING-QA-001)
-   [x] performance smoke checks — PASS
-   [x] error states — PASS

Evidence: `docs/qa/qa-report.md`. Verdict: **PASS WITH FINDINGS**.
Blocking findings: **NONE**. Production readiness: **NO**.

QA answers:

> **Does it work correctly?**

This is the methodology's defined purpose for QA.
fileciteturn1file1L562-L575

------------------------------------------------------------------------

# 32. Documentation Gate

After QA, synchronize:

``` text
README
architecture.md
storage.md
testing-strategy.md
MASTER_PLAN.md
CHANGELOG
Epic documentation
```

Only implemented behavior should be described as implemented.

The methodology requires continuous documentation synchronization and
explicitly includes README, Architecture, CHANGELOG, MASTER_PLAN, and
technical documentation. fileciteturn1file3L1333-L1361

Status (2026-09-18): **COMPLETE**. QA evidence: `docs/qa/qa-report.md`.
QA verdict: **PASS WITH FINDINGS**. Blocking findings: **NONE**.
Production readiness: **NO**. Open/non-blocking findings remain.

------------------------------------------------------------------------

# 33. UX Gate

UX Review happens after QA.

Review:

-   clarity
-   discoverability
-   navigation
-   consistency
-   trust
-   onboarding
-   interaction flow
-   visual hierarchy

The objective is:

> **Does it feel like a professional product?**

Status (2026-09-18): **COMPLETE**. Evidence: `docs/ux/ux-review.md`.
Verdict: **PASS WITH FINDINGS**. Blocking findings: **NONE**.
Production readiness: **NO**.

UX Polish (2026-09-18): **COMPLETE**. Evidence: `docs/ux/ux-review.md` §18.
Implemented only identified UX improvements. No new Settings
administration or timezone mutation. FINDING-UX-004 remains OPEN.
FINDING-QA-002 remains OPEN.
fileciteturn1file2L595-L628

------------------------------------------------------------------------

# 34. Production Validation Gate

**Status:** LAST EXECUTED — **READY FOR RELEASE**. Evidence: `docs/release/production-validation.md`. Candidate: `2b58af4` (2026-09-19 hosted production + Gmail SMTP). Hosted Vercel, Neon, production Google, and Gmail SMTP password-reset completion verified. F-004 CLOSED. §35 GRANTED after D-005.

Validate the exact build that will be deployed.

Minimum:

-   [x] production build — PASS (`2b58af4` / prior release-line build)
-   [x] deployment configuration — Vercel Production operational (`https://freelance-os-timeplan.vercel.app`); hosted deployment CLOSED
-   [x] database migration — PASS hosted (Neon; `migrate deploy` on Vercel) and locally
-   [x] authentication — PASS (email/password; Google production E2E; Gmail SMTP reset completion)
-   [x] complete MVP workflow — PASS on `pnpm start` (PV34F); hosted auth/recovery verified
-   [x] critical E2E regression — F-004 CLOSED. Isolated `next start` 68/68. Canonical CI remains `pnpm dev`.
-   [x] reports — PASS
-   [x] alerts — PASS
-   [x] notifications — PASS
-   [x] security baseline — PASS on exercised paths
-   [x] environment variables — production Google + SMTP names set on Vercel (values not recorded)
-   [x] no release-blocking defects — no new §37 Release Blocker; historical findings remain OPEN; §34 outcome READY FOR RELEASE. §35 GRANTED.

The methodology requires Production Validation to validate exactly what
will be deployed and concludes with either:

``` text
READY FOR RELEASE
```

or:

``` text
RELEASE BLOCKED
```

fileciteturn1file3L1108-L1135

------------------------------------------------------------------------

# 35. Production Certification

**Status:** **GRANTED**. Evidence: `docs/release/production-certification.md`. D-005 PROVIDED — Product Owner approved production release. Validated build: `2b58af4`. Date: 2026-09-19.

Certification is a formal approval step after successful production
validation.

Only then is the build considered releasable.

Certification record should contain:

``` text
Release:
Version:
Build:
Validation result:
Known limitations:
Open operational warnings:
Product Owner approval:
Date:
```

------------------------------------------------------------------------

# 36. Release Decision Model

Releases are binary:

``` text
READY FOR RELEASE
```

or:

``` text
RELEASE BLOCKED
```

The methodology explicitly rejects ambiguous release states.
fileciteturn1file5L1874-L1884

------------------------------------------------------------------------

# 37. Finding Classification

All findings are classified as:

## Release Blocker

Must be fixed before release.

Examples:

-   broken workflow
-   impossible task
-   corrupted export
-   invalid data

## Known Limitation

Accepted limitation that does not block release.

## Operational Warning

Technical issue that does not affect the user and is tracked separately.

This classification follows the project's methodology.
fileciteturn1file2L655-L684

------------------------------------------------------------------------

# 38. Technical Debt Register

Current expected technical-debt candidates:

  ID       Area                       Status
  -------- -------------------------- ----------------
  TD-001   Audit log                  Deferred
  TD-002   Period closure             Deferred
  TD-003   Advanced roles             Deferred
  TD-004   Multi-currency reporting   Deferred
  TD-005   Advanced forecasting       Deferred
  TD-006   E-invoicing                Future release
  TD-007   AI layer                   Future release

This list must be updated as implementation reveals real debt.

Current R1 freeze disposition (EPIC-110 / P110-08). Historical §34 / §35
and historical epic reviews are not rewritten.

- Actionable R1 findings: none
- Corrected by EPIC-110: F-105-013, F-103-002, FINDING-110-P06-001,
  F-110-P06-002
- Accepted for R1: F-103-003, F-103-005, F-103-006, F-103-P-002,
  F-104-008, F-104-009 (measured; no gate), F-104-016, F-104-P-001
  (measured; PD-105-008), F-105-008, F-P2-004, F-P3-002, F-004-001,
  EPIC-003 F-002, OBD-003, OBD-006-as-shipped, PD-105-008,
  FINDING-P04-002
- Deferred: P102-F-001 / OBD-016, F-103-P-001 / OBD-008, F-060, F-061,
  F-062, F-072, OBD-001, OBD-002, OBD-004, OBD-005, OBD-007, OBD-009,
  OBD-010, OBD-011, OBD-012, CSV/PDF, invoice lifecycle, calendar,
  copy-previous, EPIC-003 F-001, TD-001 … TD-007
- R1 FROZEN on `c6712224` / deployment `6558481150`. No next epic
  approved. Accepted and deferred items are not closed by freeze.

Real debt recorded by EPIC-103 (see
`docs/epics/EPIC-103/engineering-review.md` §16):

  ID          Area                                                     Status
  ----------- -------------------------------------------------------- ------------------------------------------
  F-103-002   Archived-client entries absent from time-tracking views   CLOSED (EPIC-110 / P110-02)
  F-103-003   Contract-selector stale selection unverified              ACCEPTED R1 LIMITATION (EPIC-110 / P110-01)
  F-103-005   Unused TimeEntry domain error classes                     Accepted
  F-103-006   Invalid `?date=` falls back to today silently             Accepted

Real debt recorded by EPIC-104 (see
`docs/epics/EPIC-104/engineering-review.md` §10 and §11). All are
non-blocking; F-104-000 is RESOLVED and is not listed:

  ID            Area                                                          Severity   Status
  ------------- ------------------------------------------------------------- ---------- ------------------------------------------
  F-104-001     Daily average divides by a hardcoded 30                        Medium     CLOSED (EPIC-105 / P105-02)
  F-104-002     Percentage logic duplicated; shared service unreachable        Medium     CLOSED (EPIC-105 / P105-02)
  F-104-003     `isOngoing` derived from capacity, diverges from PD-104-004    Medium     CLOSED (EPIC-105 / P105-04)
  F-104-004     Contract `[validFrom, validTo)` validity unapplied             Medium     CLOSED (EPIC-105 / P105-04)
  F-104-005     Workspace timezone unused for period boundaries               Medium     CLOSED (EPIC-105 / P105-03)
  F-104-006     Analytics integration tests bound to the current month        High       CLOSED (EPIC-109 / ER-109)
  F-104-007     Page-level `catch` swallows Next.js control-flow signals      Medium     CLOSED (EPIC-108 Stream E / ER-108-E)
  F-104-008     Loading skeletons / per-section loading not implemented       Medium     Accepted
  F-104-009     Performance acceptance criteria unevidenced                   Medium     Accepted (measured; PD-105-008)
  F-104-010     Several accessibility assertions cannot fail                  Medium     CLOSED (EPIC-108 Stream D / ER-108-D3)
  F-104-011     `dt`/`dd` markup without a `dl` ancestor                      Low        CLOSED (EPIC-108 Stream D / ER-108-D1)
  F-104-012     Residual accessibility-specification gaps                     Low        CLOSED (EPIC-108 Stream D / ER-108-D2)
  F-104-013     Weekly aggregation absent; daily aggregation unconsumed       Low        CLOSED (EPIC-105 / P105-03)
  F-104-014     `AnalyticsService` does not verify workspace membership       Low        CLOSED (EPIC-105 / P105-02)
  F-104-015     Locale-dependent period formatting and assertion              Low        CLOSED (EPIC-105 / PD-105-010)
  F-104-016     Analytics error path untested                                 Low        Accepted
  F-104-017     PD-104-003 period end diverges from the decision text         Low        CLOSED (EPIC-105 / P105-04)
  F-104-P-001   Analytics query performance — unevidenced                     Low        Accepted (measured; PD-105-008)
  F-104-P-002   Timezone complexity — confirmed by F-104-005                  Medium     CLOSED (subsumed by F-104-005 / P105-03)

**F-104-006 is CLOSED (EPIC-109 / ER-109).** Axis 1 (hardcoded September
2026 vs current-month analytics) was remediated by P105-01. Axis 2
(isolation `futureDate`) was closed as FINDING-INT-001 (EPIC-108 Stream
A). Axis 3 (E2E local getters / local-midnight → ISO) was hardened in
P109-02…P109-04. Host + `TZ=America/Los_Angeles` evidence: P109-05.
The 2026-10-01 expiry applied to axis 1 only and is obsolete.

F-104-003 and F-104-017 were resolved by EPIC-105: PD-105-004 settled
ongoing ≡ `validTo === null` (independent from capacity) and
PD-105-002 settled period end as "through today". Both are implemented
in P105-04 and verified by integration evidence.

Real debt recorded by EPIC-105 (see `docs/epics/EPIC-105/epic-plan.md`
§16.4 and `docs/epics/EPIC-105/engineering-review.md`):

  ID            Area                                                          Severity    Status
  ------------- ------------------------------------------------------------- ----------- ------------------------------------------
  F-105-008     Test comment arithmetic description imprecise                 Non-blocking Accepted
  F-105-013     Annual overview `year` / `now` latent inconsistency          Low          CLOSED (EPIC-110 / P110-02)
  F-104-006     Clock-sensitive E2E / integration tests                       High         CLOSED (EPIC-109 / ER-109)

Real debt recorded by EPIC-110 (see `docs/epics/EPIC-110/epic-plan.md`
and `docs/release/r1-freeze.md`):

  ID                    Area                                                          Status
  --------------------- ------------------------------------------------------------- ------------------------------------------
  FINDING-110-P06-001   Production candidate identity drift                           CLOSED TECHNICAL (P110-06C)
  F-110-P06-002         Time Entry contract eligibility used initial workDate          CLOSED TECHNICAL / production-verified (P110-06C FINAL)

EPIC-105 findings F-105-001 through F-105-007 are closed; F-105-P-007
(performance N+1 concern) is evidenced and measured at MVP scale; no
optimization is required without a threshold from PD-105-008.

Real debt recorded by MVP QA Gate (see `docs/qa/qa-report.md`). F-104-007
is CLOSED (EPIC-108 Stream E / ER-108-E; NEXT_REDIRECT handling).
`DYNAMIC_SERVER_USAGE` remains a historical EPIC-104 note and does not
reopen F-104-007. FINDING-QA-001 was a test flake and is CLOSED
(EPIC-108 Stream B / ER-108-B):

  ID               Area                                                          Severity   Status
  ---------------- ------------------------------------------------------------- ---------- ------------
  FINDING-QA-002   `getDateRangePeriod` custom-range process-TZ shift west of UTC Medium     CLOSED (EPIC-108 Stream A / ER-108-A)
  FINDING-INT-001  Analytics isolation futureDate fixture under LA TZ             —          CLOSED (EPIC-108 Stream A / ER-108-A)
  FINDING-108-001  `isDateInPeriod` local getters on UTC-midnight calendar dates  Low        CLOSED (EPIC-108 Stream A / ER-108-A)
  FINDING-INT-002  `auth.spec.ts` sign-out missing `waitForURL`                   —          CLOSED (EPIC-108 Stream B / ER-108-B)
  FINDING-INT-003  Password-reset email delivery residual                        —          CLOSED (EPIC-108 Stream B / ER-108-B)
  FINDING-QA-001   Flaky release-gate sign-up (`/onboarding` vs `/sign-in`)       Low        CLOSED (EPIC-108 Stream B / ER-108-B)

Do not use "technical debt" as a label for unimplemented planned
features.

------------------------------------------------------------------------

# 39. Open Business Decisions

These decisions must be resolved before the Epics that depend on them.

  ID        Decision                              Needed by
  --------- ------------------------------------- -----------------
  OBD-001   Daily-rate semantics / partial days   R1-E02 / R1-E03
  OBD-002   Monetary rounding                     R1-E02 / R1-E04
  OBD-003   Midnight-crossing entries             R1-E03
  OBD-004   Holiday model                         Future
  OBD-005   Vacation/absence model                Future
  OBD-006   Capacity warning threshold            R1-E06
  OBD-007   Post-closure edits/deletes            OUT OF R2 (R2-OD-014); historically open later
  OBD-008   Audit requirements                    OUT OF R2 (R2-OD-015); historically open later
  OBD-009   Workspace roles                       R0/R1
  OBD-010   Payment-term catalog                  Deferred; D5 uses paymentTermsDays
  OBD-011   Multi-currency                        CLOSED (D7 + R2-OD-011); Invoice snapshot residual
  OBD-012   Contract-hour rollover/expiry         R1-E04/R1-E06

The Product Owner must explicitly resolve decisions before they become
hidden implementation assumptions.

R2 product decisions D1–D7 and the in-scope OD resolutions are APPROVED
(`docs/release/r2-decision-pack.md`). OBD-007 and OBD-008 are out of R2
and remain historically open for a later release. OBD-011 direction and
post-record currency mutation are closed (Contract currency, TimeEntry
currency-agnostic, no FX, per-currency aggregates, immutable after first
monetary record). Residual R2 planning questions live in
`docs/release/r2-open-decisions.md`.

EPIC-103 did not close any OBD. OBD-001 was not required because
`DAILY` contracts are stored and selectable without any rate or
partial-day calculation. OBD-003 was not required because `workDate`
is a calendar date and midnight-crossing work is not representable.
OBD-008 remains the blocker for TimeEntry audit history (F-103-P-001).
Proposed OBD-013 through OBD-016 remain proposals and are not policy.

EPIC-104 did not close any OBD. OBD-002 was not required because no
monetary amount is computed, but the percentage rounding applied by
`AnalyticsService.formatPercentage` should be settled with OBD-002
before R1-E05 publishes figures. OBD-012 is directly coupled to
F-104-004: utilization compares period consumption against current
monthly capacity with no rollover, carry-over, or expiry semantics.
OBD-006 remains deferred to R1-E06 and is not satisfied by the
dashboard's 80 percent bar-colour cue.

EPIC-105 did not close any OBD. OBD-012 gates rollover/expiry
semantics only: EPIC-105 implemented pro-rata capacity (no rollover,
no carry-over, no expiry) as its intentional behaviour, and OBD-012
remains open for the future rollover decision. OBD-001, OBD-002,
OBD-011, and OBD-016 remain open and gate revenue reporting. PD-105-008
(performance threshold) was accepted as a default with no threshold
established; the measured baseline is recorded in the Engineering
Review (F-104-P-001 now measured, not closed).

------------------------------------------------------------------------

# 40. Architecture Change Policy

The architecture baseline should remain stable during normal
implementation.

If implementation reveals a genuine architectural problem:

``` text
Stop implementation
      ↓
Document problem
      ↓
Evaluate alternatives
      ↓
Propose architecture change
      ↓
Approve decision
      ↓
Update architecture documents
      ↓
Update MASTER_PLAN
      ↓
Resume implementation
```

Do not silently redesign the architecture inside an implementation
phase.

The methodology explicitly says implementation should implement what has
already been planned and avoid redesigning architecture while coding.
fileciteturn1file1L535-L540

------------------------------------------------------------------------

# 41. Context Recovery Protocol

Every new Cursor chat starts from zero context.

For general project recovery, Cursor should read:

``` text
README
MASTER_PLAN
CHANGELOG
relevant architecture documents
docs/release/r1-freeze.md          when R1 status is in scope
docs/release/r2-decision-pack.md        when R2 is in scope
docs/release/r2-architecture-delta.md   when R2 is in scope
docs/release/r2-epic-map.md             when R2 is in scope
docs/release/r2-open-decisions.md       when R2 is in scope
```

The methodology defines this as the standard context-recovery mechanism.
fileciteturn1file6L2144-L2168

For feature implementation, use only the relevant subset:

``` text
MASTER_PLAN
Epic Plan
affected architecture
relevant contracts
```

This is intentional context recovery by intent.

------------------------------------------------------------------------

# 42. Required Epic Artifacts

Every Epic should produce:

``` text
docs/epics/EPIC-XXX/
├── epic-plan.md
├── engineering-review.md
├── qa-report.md
├── ux-review.md
└── production-validation.md
```

Not every artifact necessarily exists at the beginning.

Creation follows the lifecycle.

The methodology defines Epic-level plans, Engineering Reviews, QA
Reports, UX Reviews, and Production Validation Reports as distinct
artifacts. fileciteturn1file6L2024-L2108

------------------------------------------------------------------------

# 43. Proposed Epic Naming

``` text
EPIC-001 — Foundation / Repository
EPIC-002 — Database & Persistence
EPIC-003 — Authentication
EPIC-004 — Workspace
EPIC-005 — Testing & CI
EPIC-006 — UI Foundation

EPIC-101 — Clients
EPIC-102 — Contracts
EPIC-103 — Time Tracking
EPIC-104 — Analytics & Dashboard
EPIC-105 — Reporting
EPIC-106 — Alerts & Notifications
EPIC-107 — Public Landing
```

Release 2+ identifiers will be assigned when those releases enter active
planning.

------------------------------------------------------------------------

# 44. First Implementation Epic

The first implementation Epic should be:

``` text
EPIC-001 — Foundation / Repository
```

Its objective is to create the smallest clean application skeleton from
which all later Epics can safely grow.

It should not contain client, contract, or time-tracking functionality.

------------------------------------------------------------------------

# 45. EPIC-001 High-Level Phases

## Phase 1 --- Repository Bootstrap

Deliver:

-   Next.js project
-   TypeScript
-   package manager
-   lint/format
-   environment conventions
-   base folder structure
-   README foundation

Expected commit:

``` text
chore(foundation): bootstrap application repository
```

------------------------------------------------------------------------

## Phase 2 --- Application Shell

Deliver:

-   root layout
-   application shell
-   base styling
-   shadcn/ui foundation
-   basic navigation structure

Expected commit:

``` text
feat(ui): establish application shell
```

------------------------------------------------------------------------

## Phase 3 --- Developer Quality Baseline

Deliver:

-   typecheck
-   lint
-   test command
-   build command
-   CI-ready scripts

Expected commit:

``` text
chore(ci): establish development quality gates
```

------------------------------------------------------------------------

## Phase 4 --- Engineering Review

Review:

-   structure
-   dependencies
-   naming
-   maintainability
-   unnecessary abstractions
-   architecture compliance

No feature expansion.

------------------------------------------------------------------------

# 46. What Comes Immediately After EPIC-001

After EPIC-001 is validated:

``` text
EPIC-002 — Database & Persistence
```

Then:

``` text
EPIC-003 — Authentication
EPIC-004 — Workspace
EPIC-005 — Testing & CI
EPIC-006 — UI Foundation
```

The exact parallelization will be determined during each Epic plan.

------------------------------------------------------------------------

# 47. Current Next Action

MASTER_PLAN §35 Production Certification is **GRANTED**. Evidence:
`docs/release/production-certification.md`. D-005 PROVIDED. §34 remains
**READY FOR RELEASE** on `2b58af4`. Production readiness: RELEASE
GRANTED.

EPIC-107 Engineering Review, production-like validation, and epic
certification already exist and are not re-opened here.

Next actions:

``` text
1. Release 1 MVP is certified
2. EPIC-108 is CLOSED (ER PASS WITH FINDINGS)
3. EPIC-109 is CLOSED (ER PASS)
4. EPIC-110 is CLOSED (P110-08 FREEZE)
5. R1 is FROZEN on c6712224 / deployment 6558481150
6. Actionable R1 findings = 0
7. R2 Decision Workshop complete for in-scope decisions
8. R2 planning baseline recorded (`docs/release/r2-epic-map.md`)
9. R2-E01 detailed plan complete (`docs/release/r2-e01-revenue-visibility.md`; P-E01-00)
10. R2-E01 COMPLETE / RELEASE-READY (P-E01-00…P-E01-07)
11. R2-E02 COMPLETE WITH NON-BLOCKING FINDING (P-E02-00…P-E02-07)
12. R2-E03 Payment Tracking CERTIFIED (`docs/release/r2-e03-payment-tracking.md`; P-E03-00…P-E03-07)
13. R2-E04 Forecasting & Contract Time Allocation CERTIFIED (`docs/release/r2-e04-forecasting-allocation.md`; P-E04-00…P-E04-07)
14. R2-E05 P-E05-00 COMPLETE AS PLANNING RECOVERY — BLOCKED — PO DECISIONS REQUIRED (`docs/release/r2-e05-advanced-reporting-export.md`)
15. Do not start P-E05-01; R2-E05 is not authorized
16. Do not mark R2 production-ready
17. Do not rewrite historical §34 / §35 rows
```

FINDING-UX-004, FINDING-QA-002, FINDING-INT-001, FINDING-108-001, F-104-007,
FINDING-QA-001, FINDING-INT-002, FINDING-INT-003, F-104-011, F-104-012, and
F-104-010 are CLOSED (`docs/epics/EPIC-108/findings.md`). F-004 is CLOSED.
F-105-013 and F-103-002 are CLOSED (EPIC-110 / P110-02). F-103-003 is
ACCEPTED R1 LIMITATION (EPIC-110 / P110-01). P109-05 LA `updatedAt` is
CLOSED / NOT REPRODUCED (EPIC-110 / P110-01). FINDING-110-P06-001 is
CLOSED TECHNICAL. F-110-P06-002 is CLOSED TECHNICAL / production-verified.

This follows the methodology's rule that each Phase gets a focused
Cursor chat, a defined commit expectation, review, approval, and then
progression to the next Phase.

------------------------------------------------------------------------

# 48. Current Project State --- Machine-Readable Summary

``` yaml
project:
  name: FreelanceOS
  phase: mvp
  implementation_started: true

architecture:
  status: approved-baseline
  style: modular-monolith
  database: PostgreSQL
  orm: Prisma

documents:
  product_vision: complete
  domain_model: complete
  architecture: complete
  storage: complete
  testing_strategy: complete
  master_plan: complete

releases:
  R0:
    name: Foundation
    status: in-progress
  R1:
    name: MVP
    status: frozen
  R2:
    name: Revenue Operations
    status: planning
    decision_pack: docs/release/r2-decision-pack.md
    architecture_delta: docs/release/r2-architecture-delta.md
    epic_map: docs/release/r2-epic-map.md
    open_decisions: docs/release/r2-open-decisions.md
    implementation_epic: none
    production_ready: false
  R3:
    name: Integrations
    status: future
  R4:
    name: AI
    status: future

last_completed:
  epic: EPIC-110
  phase: P110-08
  status: CLOSED
  gate: Production Certification
  reference: MASTER_PLAN.md §35
  evidence: docs/release/production-certification.md
  r1_freeze: frozen
  r1_freeze_evidence: docs/release/r1-freeze.md
  epic_110: docs/epics/EPIC-110/epic-plan.md
  production_validation: READY FOR RELEASE
  production_certification: GRANTED
  ux_verdict: pass-with-findings
  ux_polish: COMPLETE
  qa_gate: MVP QA Gate
  qa_reference: MASTER_PLAN.md §31
  qa_evidence: docs/qa/qa-report.md
  qa_verdict: pass-with-findings
  documentation_gate: COMPLETE
  blocking_findings: none
  production_readiness: release-granted
  candidate: c6712224e8d093b6f64cb46a17823a20de356a31
  deployment: "6558481150"
  production_url: https://freelance-os-timeplan.vercel.app
  tests:
    unit: 398
    integration: 224
    e2e_dev_historical: 66-pass
    e2e_next_start: 68-pass-F-004-closed
    release_gate: 5-pass-1-flaky
    focused_release_gate: pass
    isolated_release_gate: 3/3
    ux_playwright_a11y: 33-pass
  findings:
    - FINDING-P04-001 CLOSED
    - FINDING-P04-002 ACCEPTED / BY DESIGN
    - FINDING-P04-003 CLOSED
    - FINDING-INT-001 CLOSED (EPIC-108 Stream A / ER-108-A)
    - FINDING-INT-002 CLOSED (EPIC-108 Stream B / ER-108-B)
    - FINDING-INT-003 CLOSED (EPIC-108 Stream B / ER-108-B)
    - F-004 CLOSED
    - FINDING-QA-001 CLOSED (EPIC-108 Stream B / ER-108-B)
    - FINDING-QA-002 CLOSED (EPIC-108 Stream A / ER-108-A)
    - FINDING-108-001 CLOSED (EPIC-108 Stream A / ER-108-A)
    - F-104-007 CLOSED (EPIC-108 Stream E / ER-108-E)
    - F-104-011 CLOSED (EPIC-108 Stream D / ER-108-D1)
    - F-104-012 CLOSED (EPIC-108 Stream D / ER-108-D2)
    - F-104-010 CLOSED (EPIC-108 Stream D / ER-108-D3)
    - FINDING-UX-001 CLOSED
    - FINDING-UX-002 CLOSED
    - FINDING-UX-003 CLOSED
    - FINDING-UX-004 CLOSED (EPIC-108 Stream C / C05)
    - FINDING-UX-005 CLOSED
    - FINDING-UX-006 CLOSED
    - FINDING-UX-007 CLOSED
    - FINDING-UX-008 CLOSED
    - FINDING-UX-009 CLOSED
    - F-105-013 CLOSED (EPIC-110 / P110-02)
    - F-103-002 CLOSED (EPIC-110 / P110-02)
    - F-104-001 CLOSED (EPIC-105 / P105-02)
    - F-104-002 CLOSED (EPIC-105 / P105-02)
    - F-104-003 CLOSED (EPIC-105 / P105-04)
    - F-104-004 CLOSED (EPIC-105 / P105-04)
    - F-104-005 CLOSED (EPIC-105 / P105-03)
    - F-104-013 CLOSED (EPIC-105 / P105-03)
    - F-104-014 CLOSED (EPIC-105 / P105-02)
    - F-104-015 CLOSED (EPIC-105 / PD-105-010)
    - F-104-017 CLOSED (EPIC-105 / P105-04)
    - F-104-P-002 CLOSED (subsumed by F-104-005 / P105-03)
    - F-103-003 ACCEPTED R1 LIMITATION (EPIC-110 / P110-01)
    - P109-05 LA updatedAt CLOSED / NOT REPRODUCED (EPIC-110 / P110-01)
    - FINDING-110-P06-001 CLOSED TECHNICAL (EPIC-110 / P110-06C)
    - F-110-P06-002 CLOSED TECHNICAL / production-verified (EPIC-110 / P110-06C FINAL)

next:
  phase: planning
  epic: none
  gate: none
  reference: docs/release/r2-e05-advanced-reporting-export.md
  r1_freeze_reference: docs/release/r1-freeze.md
  production_validation: READY FOR RELEASE
  production_validation_reference: MASTER_PLAN.md §34
  production_certification: GRANTED
  production_readiness: release-granted
  product_owner_approval: D-005 PROVIDED
  r1_freeze: frozen
  r2_discovery: closed
  r2_planning: baseline
  r2_approved_decisions: D1-D7 and in-scope OD resolutions
  r2_e04: certified
  r2_e05: planning-blocked
  objective: R1 FROZEN. R2-E04 CERTIFIED. R2-E05 P-E05-00 BLOCKED — PO DECISIONS REQUIRED. Do not start P-E05-01. Plan in docs/release/r2-e05-advanced-reporting-export.md.
  open_non_blocking_findings: []
  accepted_r1_limitations:
    - F-103-003
    - F-103-005
    - F-103-006
    - F-103-P-002
    - F-104-008
    - F-104-009
    - F-104-016
    - F-104-P-001
    - F-105-008
    - F-P2-004
    - F-P3-002
    - F-004-001
    - EPIC-003 F-002
    - OBD-003
    - OBD-006-as-shipped
    - PD-105-008
    - FINDING-P04-002
  deferred_future:
    - P102-F-001 / OBD-016 (R2-OD-003 semantics approved; persistence still to plan)
    - F-103-P-001 / OBD-008 (OUT OF R2)
    - F-060 / F-061 / F-062 / F-072 (R2 revenue / invoice tracking)
    - OBD-001 / OBD-002 (R2-OD-001 / R2-OD-002 APPROVED)
    - OBD-004 / OBD-005 / OBD-007 / OBD-009 / OBD-010 / OBD-012
    - OBD-011 (direction and mutation CLOSED; Invoice currency snapshot residual)
    - CSV in R2-E05 (R2-OD-012 residual; PDF out of core R2)
    - invoice lifecycle (superseded by Invoice Tracking — D2)
    - calendar
    - copy-previous
    - EPIC-003 F-001
    - TD-001 … TD-007
```

------------------------------------------------------------------------

# 49. MASTER_PLAN Maintenance Rules

`MASTER_PLAN.md` must be updated whenever project status changes
materially.

Update after:

-   Epic completion
-   release completion
-   major architecture decision
-   significant technical debt discovery
-   production validation
-   production certification
-   release
-   change of next planned work

The document must describe the **current reality**, not an aspirational
roadmap disguised as implementation status.

The methodology explicitly defines `MASTER_PLAN.md` as the project's
single source of truth for current status and next work.
fileciteturn1file6L1963-L1981

------------------------------------------------------------------------

# 50. Success Definition

The project succeeds when FreelanceOS becomes software that is:

``` text
understandable
maintainable
testable
reviewable
releasable
```

These are the methodology's explicit quality objectives.
fileciteturn1file1L320-L344

The ultimate objective is not merely to produce code.

It is to produce a trustworthy operational product whose:

``` text
product decisions
      ↓
architecture
      ↓
implementation
      ↓
tests
      ↓
reviews
      ↓
validation
      ↓
release
```

remain traceable.

------------------------------------------------------------------------

# 51. Final Planning Gate

The planning stage is considered complete when:

-   [x] Product vision exists.
-   [x] Domain model exists.
-   [x] Architecture exists.
-   [x] Storage architecture exists.
-   [x] Testing strategy exists.
-   [x] Release roadmap exists.
-   [x] MVP Epics are identified.
-   [x] Dependencies are identified.
-   [x] Release gates are defined.
-   [x] Current project status is explicit.
-   [x] EPIC-001 detailed plan exists.
-   [x] Foundation implementation begins.

The next artifact is therefore:

``` text
docs/epics/EPIC-105/epic-plan.md
```

Do not start EPIC-105 implementation before that Epic plan is created.
`docs/epics/EPIC-104/epic-plan.md` exists and EPIC-104 is
engineering-complete.
