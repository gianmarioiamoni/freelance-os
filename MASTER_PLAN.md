# FreelanceOS --- MASTER PLAN

**Status:** Planning baseline\
**Document:** `MASTER_PLAN.md`\
**Product:** FreelanceOS\
**Canonical format:** Markdown\
**Current phase:** EPIC-002 Phase 4 complete → Phase 5

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
STATUS: EPIC-002 IN PROGRESS
NEXT: EPIC-002 Phase 5 — Documentation & Storage Engineering Review
```

## Completed planning artifacts

``` text
docs/
├── product-vision.md
├── domain-model.md
├── architecture.md
├── storage.md
└── testing-strategy.md
```

## Current implementation status

``` text
Application implementation: NOT STARTED
Foundation implementation: EPIC-001 COMPLETE; EPIC-002 Phase 1–4 COMPLETE
MVP implementation: NOT STARTED
Production deployment: NOT STARTED
```

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
Release 2 — Billing & Intelligence
        ↓
Release 3 — Integrations
        ↓
Release 4 — AI
```

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
-   calendar view
-   copy previous entry if retained after UX review

## Dependencies

``` text
R1-E01 Client Management
R1-E02 Contract Management
```

## Primary success criterion

A normal workday entry should be recordable in less than one minute.

------------------------------------------------------------------------

# 14. R1-E04 --- Analytics & Dashboard

## Objective

Create a shared deterministic analytics layer and expose the operational
dashboard.

## Scope

-   current month total hours
-   billable hours
-   non-billable hours
-   estimated revenue
-   client allocation
-   contract utilization
-   current alerts
-   shared analytics services

## Dependencies

``` text
R1-E02 Contract Management
R1-E03 Time Tracking
```

## Architectural requirement

Dashboard calculations must use the shared analytics capability.

Do not create dashboard-specific versions of business calculations.

------------------------------------------------------------------------

# 15. R1-E05 --- Reporting

## Objective

Provide reliable operational reporting.

## Scope

-   today
-   week
-   month
-   year
-   custom period
-   hours by client
-   revenue by client
-   contract report
-   annual overview

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

# 18. MVP Non-Goals

The following are explicitly outside Release 1:

-   electronic invoicing / SDI
-   full invoice lifecycle
-   payment management
-   accounting
-   expense management
-   tax management
-   advanced team management
-   native mobile applications
-   calendar integrations
-   Slack/Teams integrations
-   AI assistant
-   advanced forecasting
-   advanced multi-currency reporting

These may become later-release work.

------------------------------------------------------------------------

# 19. Release 2 --- Billing & Intelligence

## Objective

Expand FreelanceOS from operational tracking into a more complete
commercial management system.

Potential Epics:

### R2-E01 --- Invoice Lifecycle

-   invoice generation
-   invoice records
-   invoice status
-   invoice line items
-   invoice totals
-   historical billing snapshot

### R2-E02 --- Payment Tracking

-   payment status
-   due dates
-   overdue tracking
-   payment history

### R2-E03 --- Forecasting & Capacity

-   projected monthly usage
-   projected revenue
-   capacity forecast
-   workload/capacity analysis

### R2-E04 --- Advanced Reporting & Export

Potential:

-   CSV
-   PDF
-   advanced filtering
-   richer annual analysis

### R2-E05 --- Commercial Intelligence

Potential:

-   profitability indicators
-   contract performance
-   client concentration
-   trend analysis

Exact scope requires a future planning pass.

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
21. Production Validation
22. Production Certification
23. Release

This order minimizes downstream rework.

------------------------------------------------------------------------

# 29. Foundation Completion Gate

Release 0 cannot proceed to MVP feature development until:

-   [ ] repository structure exists
-   [ ] environment configuration exists
-   [ ] PostgreSQL is connected
-   [ ] Prisma schema/migrations work
-   [ ] authentication foundation works
-   [ ] workspace membership works
-   [ ] cross-workspace access is rejected
-   [ ] test suite runs
-   [ ] CI passes
-   [ ] production build passes
-   [ ] initial UI shell works
-   [ ] architecture has not been violated

------------------------------------------------------------------------

# 30. MVP Engineering Gate

Before QA begins:

-   [ ] all planned MVP Epics implemented
-   [ ] architecture remains compliant
-   [ ] dependencies are controlled
-   [ ] no direct UI → Prisma access
-   [ ] no domain → Prisma dependency
-   [ ] workspace authorization is server-side
-   [ ] business calculations are centralized
-   [ ] historical contract behavior is preserved
-   [ ] tests pass
-   [ ] known technical debt is documented

Engineering Review answers:

> **Is the implementation technically sound?**

This is the methodology's defined purpose for Engineering Review.
fileciteturn1file1L543-L560

------------------------------------------------------------------------

# 31. MVP QA Gate

QA must verify:

-   [ ] critical workflows
-   [ ] regressions
-   [ ] edge cases
-   [ ] authorization
-   [ ] workspace isolation
-   [ ] contract validity
-   [ ] billing calculations
-   [ ] utilization
-   [ ] alerts
-   [ ] reporting
-   [ ] authentication
-   [ ] stability
-   [ ] performance smoke checks
-   [ ] error states

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

UX Polish then implements only the identified UX improvements.

No new functionality is introduced during UX Polish.
fileciteturn1file2L595-L628

------------------------------------------------------------------------

# 34. Production Validation Gate

Validate the exact build that will be deployed.

Minimum:

-   [ ] production build
-   [ ] deployment configuration
-   [ ] database migration
-   [ ] authentication
-   [ ] complete MVP workflow
-   [ ] critical E2E regression
-   [ ] reports
-   [ ] alerts
-   [ ] notifications
-   [ ] security baseline
-   [ ] environment variables
-   [ ] no release-blocking defects

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

Certification is a formal approval step after successful production
validation.

Only then is the build considered releasable.
fileciteturn1file6L1914-L1918

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
  OBD-007   Post-closure edits/deletes            R2
  OBD-008   Audit requirements                    R2
  OBD-009   Workspace roles                       R0/R1
  OBD-010   Payment-term catalog                  R1-E02
  OBD-011   Multi-currency                        R2
  OBD-012   Contract-hour rollover/expiry         R1-E04/R1-E06

The Product Owner must explicitly resolve decisions before they become
hidden implementation assumptions.

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

The project should **not jump directly into feature implementation**.

Next actions:

``` text
1. Open a new Cursor chat
2. Execute EPIC-002 Phase 5
3. Review
4. Commit
```

This follows the methodology's rule that each Phase gets a focused
Cursor chat, a defined commit expectation, review, approval, and then
progression to the next Phase. fileciteturn1file0L59-L87

------------------------------------------------------------------------

# 48. Current Project State --- Machine-Readable Summary

``` yaml
project:
  name: FreelanceOS
  phase: foundation
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
    status: planned
  R2:
    name: Billing & Intelligence
    status: future
  R3:
    name: Integrations
    status: future
  R4:
    name: AI
    status: future

next:
  epic: EPIC-002
  phase: 5
  objective: Documentation & Storage Engineering Review
  implementation: phase-4-complete
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
docs/epics/EPIC-002/epic-plan.md
```

Do not start EPIC-002 implementation before that Epic plan is created.
