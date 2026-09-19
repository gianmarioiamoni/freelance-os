# FreelanceOS — System Architecture

**Status:** Architecture Baseline — Authentication, workspace, testing/CI, UI foundation, client management, contract management, time tracking, analytics/dashboard, reporting, alert evaluation with in-app notification center, and MVP Integration COMPLETE / CLOSED (EPIC-003, EPIC-004, EPIC-005, EPIC-006, EPIC-101, EPIC-102, EPIC-103, EPIC-104, EPIC-105, EPIC-106, MVP-INTEGRATION). MVP QA Gate PASS WITH FINDINGS. Documentation Gate COMPLETE. UX Gate PASS WITH FINDINGS. UX Polish COMPLETE. EPIC-107 Public Landing COMPLETE. MASTER_PLAN §34 last executed — RELEASE BLOCKED (`docs/release/production-validation.md`). D-001 Vercel, D-002 Google OAuth, D-003 Resend Free, and D-004 E2E isolation are recorded; hosted production URL is not invented. Public `/` landing; authenticated Dashboard at `/dashboard`. Production readiness: NO.  
**Scope:** MVP  
**Architectural style:** Modular Monolith  
**Primary runtime:** Next.js / TypeScript  
**Persistence:** PostgreSQL via Prisma ORM

---

## 1. Purpose

This document defines the technical architecture of FreelanceOS.

It translates the Product Vision, Functional Specification and Domain Model into:

- system boundaries;
- module responsibilities;
- application boundaries;
- persistence boundaries;
- authentication and authorization boundaries;
- frontend architecture;
- reporting and alerting architecture;
- testing boundaries;
- deployment model;
- future integration and AI boundaries.

This document is an architectural baseline. Implementation must conform to it unless an explicit architectural decision changes it.

---

## 2. Architectural Principles

### A-001 — Modular Monolith

FreelanceOS will be implemented initially as a modular monolith.

We deliberately avoid microservices because:

- the domain is relatively small;
- the application is initially used by a small number of users;
- the modules have strong relationships;
- independent service deployment is not currently valuable;
- operational complexity would exceed the benefits.

The architecture must nevertheless maintain explicit module boundaries so that future extraction is possible if justified.

### A-002 — Architecture before implementation

Business responsibilities, boundaries and contracts are defined before implementation.

### A-003 — Domain independence

Core business rules must not depend directly on React, Next.js or Prisma.

### A-004 — Server-side authority

Authorization, business rules, billing calculations and data access are authoritative on the server.

The browser is never trusted to enforce business rules.

### A-005 — Deterministic business logic

Hours, revenue, contract utilization, alerts and reporting facts are calculated deterministically.

### A-006 — Shared calculation services

Dashboard, reports, alerts and future AI queries must consume the same application/domain calculation services.

### A-007 — Workspace isolation

Workspace is the primary tenant/security boundary.

Every business-data access path must be scoped to an authorized workspace.

### A-008 — Historical correctness

Historical TimeEntries must retain their correct commercial interpretation even when contracts change later.

### A-009 — AI as an adapter

Future LLM capabilities must consume controlled application services. The LLM is never the source of truth for domain facts.

---

# 3. System Context

At MVP level:

```text
                         ┌─────────────────────┐
                         │       User          │
                         │  Browser / Desktop  │
                         └──────────┬──────────┘
                                    │ HTTPS
                                    ▼
                         ┌─────────────────────┐
                         │     Next.js App     │
                         │                     │
                         │ UI + Application    │
                         │ + Domain adapters   │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                  ┌──────────────┐     ┌───────────────┐
                  │ PostgreSQL   │     │ Auth Provider │
                  │              │     │ / OAuth       │
                  └──────────────┘     └───────────────┘
```

Future integrations:

```text
                         ┌─────────────────────┐
                         │   FreelanceOS       │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
       E-invoicing             Email service          LLM provider
       provider                / notifications        / AI layer
```

These external systems are not dependencies of the MVP core domain.

---

# 4. High-Level Logical Architecture

The application is divided into four principal layers:

```text
┌─────────────────────────────────────────────────────────────┐
│                        Presentation                          │
│  Next.js App Router / React / UI components                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                        Application                           │
│  Use cases / application services / DTOs / authorization    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                           Domain                             │
│  Entities / value objects / business rules / calculations   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                       Infrastructure                         │
│  Prisma / PostgreSQL / Auth / Email / external adapters     │
└─────────────────────────────────────────────────────────────┘
```

### Dependency rule

Dependencies flow inward:

```text
Presentation
     ↓
Application
     ↓
Domain

Infrastructure
     ↓
Application / Domain contracts
```

The domain must not import infrastructure implementations.

---

# 5. Module Boundaries

The MVP contains these logical modules:

```text
authentication
workspace
clients
contracts
time-tracking
analytics
billing
alerts
notifications
dashboard
```

Some modules are primarily domain/application modules; others are presentation/read-model modules.

---

## 5.1 Authentication

### Responsibility

- user authentication;
- email/password;
- Google OAuth;
- sessions;
- password recovery;
- authentication identity.

### Does not own

- business authorization;
- client data;
- contract data.

Authentication answers:

> Who is this user?

Authorization answers:

> What is this user allowed to access?

---

## 5.2 Workspace

### Responsibility

- workspace lifecycle;
- workspace membership;
- workspace-level authorization context;
- tenant isolation.

### Core concept

```text
User
  ↓
WorkspaceMembership
  ↓
Workspace
```

The current user/workspace context is established server-side.

Implemented `WorkspaceContext`:

```text
workspaceId
userId
role            ← attached from WorkspaceMember; not a permission matrix
```

Resolution uses the Better Auth session user id and `listMembershipsByUserId`. Zero memberships require onboarding. Exactly one membership becomes the current context. More than one membership fails closed. The browser cannot select an arbitrary workspace.

---

## 5.3 Clients

### Responsibility

- client creation;
- client updates;
- client archival;
- client retrieval;
- client-specific summaries (contract history is implemented on client detail; hours remain R1-E03).

### Does not own

- contract pricing rules;
- time-entry calculations.

---

## 5.4 Contracts

### Responsibility

- contract lifecycle;
- validity intervals;
- billing model;
- rates;
- monthly contracted hours;
- payment terms;
- contract applicability.

### Key rule

Contract applicability must be deterministic for a given work date.

EPIC-102 implements workspace-scoped contract create, list, detail, and update. Applicability is derived from `[validFrom, validTo)`. There is no stored `Contract.status`. Review: `docs/epics/EPIC-102/engineering-review.md`.

---

## 5.5 Time Tracking

### Responsibility

- TimeEntry creation;
- modification;
- deletion according to business rules;
- daily views;
- weekly timesheet;
- calendar data;
- billable/non-billable status.

### Does not own

- dashboard aggregation;
- report presentation;
- notification delivery.

EPIC-103 implements workspace-scoped TimeEntry create, read, daily list, weekly timesheet, update of mutable fields, and hard delete. `workDate`, `clientId`, and `contractId` are immutable after creation; `UpdateTimeEntryInput` carries only `durationMinutes`, `description`, and `billable`. Contract eligibility is derived from `[validFrom, validTo)` for the work date and is validated at create; no revalidation path exists on update because the three inputs it would depend on cannot change. Client selection precedes contract selection. Contract metadata is presented but never used for calculation: no rate, billing, utilization, or forecasting logic exists in this module. Review: `docs/epics/EPIC-103/engineering-review.md`.

---

## 5.6 Analytics

This is a central architectural module.

### Responsibility

Provide deterministic read/calculation services for:

- hours;
- billable hours;
- non-billable hours;
- client allocation;
- contract utilization;
- monthly summaries;
- period summaries.

The analytics layer is not a second database of truth.

It derives information from domain data.

**`Workspace.timezone` is the intended sole authority for period
boundaries (PD-105-003).** Current-period constructors (`getTodayPeriod`,
`getCurrentWeekPeriod`, `getCurrentMonthPeriod`, `getCurrentYearPeriod`)
accept the workspace timezone as an explicit parameter and passed QA
under host TZ and `America/New_York`. `getDateRangePeriod` (custom
range) still uses local date getters and shifts the calendar day when
the process timezone is west of UTC (FINDING-QA-002, OPEN, APPLICATION
DEFECT, NON-BLOCKING). No period boundary is accepted from an
unauthenticated request parameter.

### Implemented by EPIC-104 and extended by EPIC-105

The analytics module is implemented as an application service over a
dedicated persistence adapter. Reviews:
`docs/epics/EPIC-104/engineering-review.md`,
`docs/epics/EPIC-105/engineering-review.md`.

```text
src/domain/analytics-types.ts                       domain types
src/domain/repositories.ts                          AnalyticsRepository port
src/application/analytics/analytics-service.ts      AnalyticsService
src/application/reporting/reporting-service.ts      ReportingService (P105-04)
src/infrastructure/persistence/analytics-repository.ts   Prisma adapter
src/lib/analytics-periods.ts                        period utilities
src/features/reporting/                             RSC presentation components
```

`AnalyticsService` follows the established application-service shape:
the repository is constructor-injected, `WorkspaceContext` is the first
parameter of every method, and the workspace identifier is never
accepted from the browser. It exposes workspace-scoped monthly, daily,
weekly, client-allocation, and contract-utilization calculations. A
service-level membership guard (SI-105-005) rejects callers who are not
members of the target workspace.

`ReportingService` is a thin layer that resolves period-kind requests
into `AnalyticsPeriod` values using `Workspace.timezone` and delegates
all arithmetic to `AnalyticsService`. It contains no percentage, average,
capacity, or utilization formula.

`AnalyticsRepository` is registered in `PersistenceRepositories` and
constructed by `createRepositories()`, like every other repository. It
performs Prisma `aggregate` and `groupBy` queries over `TimeEntry`;
**every** query carries `where: { workspaceId }`. No raw SQL exists in
the analytics layer.

Domain types: `AnalyticsPeriod`, `MonthlyAnalytics`, `ClientAllocation`,
`ContractUtilization`, `DailyAnalytics`, `DailyClientBreakdown`,
`WeeklyAnalytics`, `ReportingPeriodKind`.

Period utilities: `getTodayPeriod`, `getCurrentWeekPeriod`,
`getCurrentMonthPeriod`, `getCurrentYearPeriod`, `getMonthPeriod`,
`getDateRangePeriod`, `getWeekStartFromDate`, `isValidPeriod`,
`isDateInPeriod`, `getPeriodDays`, `formatPeriodDisplay`.

Durations are integer minutes throughout; a zero denominator yields
`null` rather than a fabricated percentage. No revenue, rate, or
commercial amount is computed anywhere in the analytics or reporting
layers.

Contract capacity is **pro-rated** to the reporting period using the
overlap between `[validFrom, validTo)` and the period (PD-105-005).
`isOngoing` ≡ `validTo === null`; unlimited capacity ≡
`monthlyContractedMinutes === null`; these are independent properties
(PD-105-004). No rollover, carry-over, or expiry semantics are applied
(OBD-012 open).

A measured query-performance baseline exists at the EPIC-104 reference
volume (100 clients, 50 contracts, 1000 time entries, 13 months). No
pass/fail threshold is established (PD-105-008 accepted default).

### Not implemented

The following remain future work and must not be described as
delivered:
- a workspace-membership guard inside `AnalyticsService` itself
  (F-104-014) — **resolved by EPIC-105 P105-02** (SI-105-005);
- weekly aggregation (F-104-013) — **resolved by EPIC-105 P105-03**
  (`getWeeklyAnalytics` composes over `getDailyAnalytics`);
- timezone-aware period boundaries (F-104-005 / F-104-P-002) — **resolved
  by EPIC-105 P105-03** (`Workspace.timezone` is now the authority);
- a measured query-performance baseline (F-104-009 / F-104-P-001) —
  **measured by EPIC-105 P105-06** (baseline recorded; no threshold
  established per PD-105-008).

Percentage arithmetic was consolidated onto shared `AnalyticsService`
static methods by EPIC-105 P105-02 (F-104-002). The reporting layer and
the dashboard both consume the shared service; no formula is duplicated.

### Why it is central

```text
                    ┌──────────────┐
                    │   Dashboard  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Analytics  │
                    └──────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
        TimeEntry      Contract       Billing
```

Future:

```text
LLM
 │
 ▼
Analytics/Application Services
```

---

## 5.7 Billing

### Responsibility

- billable amount calculation;
- estimated revenue;
- amount to invoice;
- future invoice preparation.

### MVP boundary

The MVP does not implement full electronic invoicing.

Billing is a calculation capability, not an accounting system.

---

## 5.8 Alerts

### Responsibility

Evaluate deterministic rules such as:

- contract utilization warning;
- contract exceeded;
- capacity warning (DEFERRED — PD-106-001);
- capacity exceeded (DEFERRED — PD-106-001).

The alert engine should consume analytics/application services rather than duplicate calculations.

### Implemented by EPIC-106

`AlertService` at `src/application/alerts/alert-service.ts` evaluates AR-001 (`CONTRACT_WARNING`) and AR-002 (`CONTRACT_EXCEEDED`) per contract per current month period. Delegates utilization calculation to `AnalyticsService.getContractUtilizations()`. Reads threshold from `WorkspaceSettings.contractWarningPercent` (default 80%, OBD-006 resolved). Alert evaluation is triggered as a non-blocking side-effect from all three TimeEntry Server Actions (`create-time-entry-action.ts`, `update-time-entry-action.ts`, `delete-time-entry-action.ts`) via `trigger-alert-evaluation.ts` (PD-106-003). No cron, scheduler, Inngest, or background monitoring introduced.

Dependency chain:
```text
AlertService
  → AnalyticsService → getContractUtilizations()
  → WorkspaceSettingsRepository → getSettings()
  → AlertRepository → createAlert / resolveAlert / findAlertByDeduplicationKey
  → NotificationRepository → createNotification
```

Deduplication key: deterministic string scoped to `(type, workspaceId, contractId, periodStart)`. Active alert not duplicated; resolved alert triggers new alert on re-fire. Evaluation failure does not fail the triggering TimeEntry operation. Evaluation period uses `Workspace.timezone` (consistent with EPIC-105 reporting semantics).

---

## 5.9 Notifications

### Responsibility

- user-facing alert presentation;
- read/unread state;
- notification history;
- optional future email delivery (deferred — PD-106-002: in-app only for MVP).

Alert generation and notification delivery remain separate concepts.

### Implemented by EPIC-106

`/alerts` RSC at `src/app/(app)/alerts/page.tsx` lists workspace-scoped notifications for the authenticated user, newest first. Components at `src/features/notifications/`: `NotificationList.tsx`, `NotificationCard.tsx`. Server query via `src/features/notifications/load-notifications.ts`. Mark-as-read via Server Action `src/features/notifications/mark-notification-read-action.ts` with server-side ownership check (`workspaceId` + `userId` guard). Reading a notification does not resolve the alert; alert resolution does not delete the notification — independent lifecycle objects.

### Implemented by MVP Integration

The app-shell Alerts nav item shows an unread count badge loaded in the authenticated layout via `loadUnreadNotificationCount()` (`readAt IS NULL`, workspace- and user-scoped). `buildNavigationItems(unreadAlertCount)` supplies the badge. Mark-as-read and TimeEntry mutations call `revalidatePath("/", "layout")` so the layout RSC refreshes the count. At 100% utilization, `CONTRACT_WARNING` and `CONTRACT_EXCEEDED` may both create notifications (FINDING-P04-002 ACCEPTED).

---

## 5.10 Dashboard

Dashboard is primarily a presentation/read-model capability.

It should not contain business calculations.

Example:

```text
Dashboard
   ↓
Application query
   ↓
Analytics services
   ↓
Domain / persistence
```

### Implemented by EPIC-104 and moved by EPIC-107

EPIC-104 delivered the authenticated dashboard as a React Server Component at `/` (`src/app/(app)/page.tsx`). EPIC-107 moved it to `/dashboard` (`src/app/(app)/dashboard/page.tsx`) under the existing `(app)` layout. There is no nested `dashboard/layout.tsx`. `(app)/page.tsx` was removed. `/` is the public landing (`src/app/(public)/page.tsx`) and is not inside `(app)`.

The dashboard is labelled `Dashboard` in `src/lib/navigation.ts` (`href: "/dashboard"`).

- It is a **React Server Component** with no client island, which is
  the correct default for a read-only analytics surface.
- Session and workspace are resolved **server-side** by
  `getCurrentWorkspaceContext()`; no workspace identifier is accepted
  from the request.
- It renders inside the `(app)/layout.tsx` `AppShell`.
- It consumes the **shared analytics capability** rather than querying
  persistence directly: `AnalyticsService` via the repositories built
  by `createRepositories()`.
- Presentation components live in `src/components/dashboard/`:
  `Dashboard`, `MonthlyAnalytics`, `ClientAllocation`,
  `ContractUtilization`.
- Empty state and error state are handled; loading is only the
  route-level `(app)/loading.tsx` inherited from EPIC-006 — per-section
  skeletons are specified but **not** implemented (F-104-008).

The route is dynamic (`ƒ /dashboard` in the build route table) because
authentication reads `headers()`. This is intentional and correct for
an authenticated workspace-scoped surface and must not be changed. The
page-level `try`/`catch` currently intercepts Next.js control-flow
signals including `NEXT_REDIRECT`; the redirect still reaches the user
because `(app)/layout.tsx` performs the same workspace resolution
outside any handler and wins. Recorded as F-104-007, confirmed and
non-blocking.

### Public landing (EPIC-107)

`(public)/layout.tsx` is not AppShell. If a session is present it
`redirect`s through `resolveSessionWorkspace` + `getWorkspaceResolutionPath`
(one workspace → `/dashboard`; none → `/onboarding`; ambiguous →
`/workspace-unavailable`). Unauthenticated visitors remain on `/` and
see the landing: header wordmark plus Sign Up / Sign In, hero, How it
works, and six capability cards. No `proxy.ts` or `middleware.ts` is
used.

---

# 6. Application Layer

The application layer coordinates use cases.

It is responsible for:

- authorization checks;
- orchestration;
- transaction boundaries;
- input/output DTOs;
- calling domain services;
- invoking repositories;
- invoking analytics;
- mapping domain results to UI-safe responses.

Example use cases:

```text
createClient()
updateClient()
archiveClient()

createContract()
getActiveContract()

createTimeEntry()
updateTimeEntry()
deleteTimeEntry()

getDailyTimesheet()
getWeeklyTimesheet()

getMonthlyDashboard()
getHoursReport()
getRevenueReport()
getContractUtilization()

evaluateAlerts()
getNotifications()
markNotificationAsRead()
```

Application services should be use-case oriented rather than generic CRUD wrappers where business logic exists.

---

# 7. Domain Layer

The domain layer contains business meaning.

Candidate domain concepts:

```text
Client
Contract
TimeEntry
Workspace
Duration
Money
BillingModel
BillableStatus
ContractUtilization
```

Domain services may include:

```text
ContractApplicabilityService
BillingCalculationService
ContractUtilizationService
CapacityCalculationService
```

These services must not depend on Prisma or React.

---

# 8. Persistence Architecture

## 8.1 PostgreSQL

PostgreSQL is the system of record.

It is appropriate because the domain is strongly relational:

```text
Workspace
   ↓
Client
   ↓
Contract
   ↓
TimeEntry
```

and requires:

- relational integrity;
- constraints;
- indexes;
- aggregation;
- transactions;
- historical consistency.

## 8.2 Prisma

Prisma is the persistence/data-access layer between application code and PostgreSQL.

Conceptually:

```text
Application
     ↓
Repository / persistence adapter
     ↓
Prisma
     ↓
PostgreSQL
```

Prisma must not leak into the domain layer.

The current Prisma documentation supports PostgreSQL and Next.js integration, including migrations and typed database access. This repository uses Prisma 6.19.3. Prisma 8's contract-first workflow is not in use. 

## 8.3 Repository boundary

Where business logic needs persistence, prefer application-facing repository interfaces such as:

```text
ClientRepository
ContractRepository
TimeEntryRepository
WorkspaceRepository
AnalyticsRepository
```

`AnalyticsRepository` (EPIC-104) is the aggregation-side adapter: it
owns the `workspaceId`-scoped Prisma `aggregate` and `groupBy` queries
that back analytics, and the client/contract lookups needed to label
their results. It is a read-only query boundary and performs no
mutation.

Concrete Prisma implementations live in infrastructure.

For simple read-only queries, an application query service may use a dedicated persistence adapter rather than forcing every query through an artificial repository abstraction.

The rule is:

> abstract where it protects a meaningful boundary; do not create interfaces solely for ceremony.

---

# 9. Data Access Rules

All business data queries must be scoped to the authorized workspace.

Bad:

```text
findClient(clientId)
```

Preferred conceptual contract:

```text
findClient(workspaceId, clientId)
```

or derive workspace context inside a trusted server-side application service.

The client/browser must never be able to select an arbitrary workspace and thereby bypass isolation.

---

# 10. Transactions

A transaction is required when a use case performs multiple writes whose consistency must be atomic.

Examples:

- creating an entity plus required related records;
- closing/finalizing a billing operation in a future release;
- state transitions that update multiple aggregates.

Simple independent reads should not be unnecessarily wrapped in transactions.

---

# 11. Authentication and Authorization

## Authentication

The MVP will use:

- email/password;
- Google OAuth.

Better Auth 1.7.4 is the pinned authentication adapter. Persistence, a server-only Infrastructure instance, email/password registration/sign-in/sign-out, Google OAuth through Better Auth's Google provider, password recovery, server-side session retrieval, and a protected App Router boundary are implemented.

Password recovery uses Better Auth's `requestPasswordReset` / `resetPassword` API and the existing `verification` table (`reset-password:${token}`). Recovery tokens expire after the library default of one hour and are consumed on use. `emailAndPassword.revokeSessionsOnPasswordReset` is enabled, so a successful reset deletes the user's Better Auth sessions. Public recovery pages are `/forgot-password` and `/reset-password`. Authenticated visitors are redirected away from `/forgot-password` but may remain on `/reset-password` so a valid token can be used.

Email delivery is an Infrastructure boundary (`sendPasswordResetEmail`). `AUTH_EMAIL_DELIVERY` selects `development` (acknowledge only), `test` (in-process capture for automated tests), or `production` (Gmail SMTP). Production send requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD`. If any is missing, production mode warns and does not send. Reset tokens, reset URLs, passwords, and session tokens are never written to application logs.

Google OAuth remains in the MVP release. It uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The provider is registered only when both values are present. The callback is Better Auth's catch-all handler at `/api/auth/callback/google`, derived from `BETTER_AUTH_URL` and the default `/api/auth` base path. Production `BETTER_AUTH_URL` is the Vercel origin once that hostname exists; the repository does not invent it. Client code never receives the client secret.

Account linking uses Better Auth 1.7.4 defaults. Implicit linking stays enabled, but the library requires the existing local user to have `emailVerified: true` before linking a Google identity to an email/password user. Phase 2 registration does not verify email, so an existing unverified email/password account is not silently merged with a later Google sign-in for the same email. FreelanceOS does not override that library security default.

Protected application routes live in the `(app)` route group, including `/dashboard`. The authenticated layout reads the Better Auth server session and the server-resolved workspace membership. Unauthenticated requests to those routes redirect to `/sign-in`. Unauthenticated `/` is public and does not redirect to `/sign-in`. Authenticated visitors to `/` never see the landing: they follow `getWorkspaceResolutionPath` to `/dashboard`, `/onboarding`, or `/workspace-unavailable`. Authenticated visitors with no membership are sent to `/onboarding`. Authenticated visitors with exactly one membership enter `(app)`. Authenticated visitors with more than one membership are sent to `/workspace-unavailable`. Authenticated visitors to `/sign-in`, `/sign-up`, and `/forgot-password` follow that same workspace resolution. `/reset-password` remains reachable while authenticated so a recovery token can be completed. Sign-in, sign-up, and Google `callbackURL` use `DEFAULT_AUTHENTICATED_PATH` (`/dashboard`). Sign-out uses `router.refresh()` then `router.push("/")`. Password-reset success remains `/sign-in`.

Authentication integration tests run against the isolated PostgreSQL test database. Deterministic Playwright coverage exercises email/password, protected routes, logout, and password recovery. CI applies the migration chain and runs those suites without Google credentials or a production email provider. Canonical Playwright CI starts `pnpm dev`. Production-like E2E is `pnpm build` then `E2E_WEB_SERVER=start` / `pnpm test:e2e:start`, which injects `AUTH_E2E_RUNTIME=true` so Better Auth uses non-production rate-limit defaults in that process only. The marker is ignored when `VERCEL=1` or `VERCEL_ENV=production`. Production Better Auth rate-limit defaults are unchanged. Isolated `next start` evidence: 63/5/68 then 68/68 (`docs/release/release-gate-resolution.md` §12). Full Google consent/callback is a documented non-CI limitation.

EPIC-005 does not change this runtime architecture. Playwright E2E requires `TEST_DATABASE_URL`, refuses `freelance_os`, and injects the isolated `*_test` URL only into the E2E process. An existing `pnpm dev` server is not reused. Review: `docs/epics/EPIC-005/engineering-review.md`.

EPIC-006 does not change this runtime architecture. The authenticated `(app)` layout reads the Better Auth session and `WorkspaceContext`, then uses `getAuthorizedWorkspace` to pass display-only `workspaceName` and account label into `AppShell`. `workspaceId` and `role` are not rendered. There is no client `WorkspaceProvider`, no workspace client store, and no workspace switcher. Review: `docs/epics/EPIC-006/engineering-review.md`.

EPIC-101 does not change this runtime architecture. Client mutations use Server Actions that resolve `WorkspaceContext` and call application services. Client reads use RSC loaders through the same services. `clientId` is a resource id, not a tenant grant. Query `status=archived` is a list filter only. Review: `docs/epics/EPIC-101/engineering-review.md`.

EPIC-102 does not change this runtime architecture. Contract mutations use Server Actions that resolve `WorkspaceContext` and call application services. Contract reads use RSC loaders through the same services. `contractId` and `clientId` are resource ids, not tenant grants. Query `clientId` on `/contracts/new` is a form preselect only. Review: `docs/epics/EPIC-102/engineering-review.md`.

EPIC-103 does not change this runtime architecture. TimeEntry mutations use Server Actions that resolve `WorkspaceContext` and call application services. TimeEntry reads use RSC loaders through the same services. `timeEntryId`, `clientId`, and `contractId` are resource ids, not tenant grants. Query `date`, `view`, and `start` are view state; `clientId` and `contractId` on `/time-tracking/new` are form preselects only. The hidden `workDate` field on the edit form is redirect context only; the update service never receives it. Review: `docs/epics/EPIC-103/engineering-review.md`.

**Server Action constraint:** `redirect()` and `notFound()` signal by throwing (`NEXT_REDIRECT`, `NEXT_NOT_FOUND`). They must be called outside any `try`/`catch` that maps errors to user-facing state, otherwise a successful mutation reports a false failure. EPIC-103 F-103-001 was exactly this defect and was corrected in the three TimeEntry Server Actions. This constraint is documentation-only; no lint rule enforces it.

**TimeEntry mutation cache order (MVP Integration, path updated by EPIC-107):** persistence → `triggerAlertEvaluation` (best-effort) → `revalidatePath("/", "layout")` → `revalidatePath("/dashboard")` → `revalidatePath("/reports")` → `revalidatePath("/alerts")` → `redirect(...)`. Layout revalidation on `/` remains so the AppShell unread badge refreshes. Sign-out uses `router.refresh()` then `router.push("/")`.

Next.js 15.5.25 does not provide the `proxy.ts` request-interception convention. `middleware.ts` is deprecated by project convention and is not used. Server-side session validation in the authenticated layout is the authoritative boundary. Client auth state is a projection of that session.

## Authorization

Authorization is implemented in the application/server layer.

```text
Browser
  ↓
Better Auth session
  ↓
Workspace membership resolution
  ↓
Authorization
  ↓
WorkspaceContext
  ↓
Workspace-scoped application operation
  ↓
Persistence
```

Authentication and authorization are separate. A valid session is not a workspace grant.

Membership is the authorization source. `WorkspaceMember.userId` is a logical Better Auth user id. There is no application User model.

Implemented primitives:

- `resolveWorkspaceContext(userId)` — 0 memberships → onboarding; 1 → `WorkspaceContext`; >1 → fail closed
- `requireWorkspaceAccess(userId, workspaceId)` — membership check; non-members receive `UnauthorizedWorkspaceAccessError`
- `getAuthorizedWorkspace(userId, requestedWorkspaceId)` — authorized read after membership; `getWorkspaceById` is not an authorization API
- `createFirstWorkspace(userId, input)` — atomic first-workspace create for a user with zero memberships

`role` is stored and returned. OWNER versus MEMBER permission semantics are not implemented (OBD-009).

Path or query `workspaceId` cannot establish authorization. No workspace switcher exists.

---

# 12. Multi-Tenancy

The MVP uses logical multi-tenancy.

Primary boundary:

```text
Workspace
```

Business records should contain or be resolvable to a workspace ownership boundary.

Conceptually:

```text
Workspace
 ├── Client
 ├── Contract
 ├── TimeEntry
 ├── Alert
 └── Notification
```

Authorization must be enforced server-side.

The architecture does not currently require database-per-tenant or schema-per-tenant isolation.

---

# 13. API / Server Boundary

Because this is a Next.js modular monolith, we should avoid building a large REST API unless external clients actually require one.

### Preferred internal access

For browser-to-server mutations and queries, use Next.js server-side mechanisms where appropriate.

Potential mechanisms:

- Server Actions for application mutations tightly coupled to the web application;
- Route Handlers for externally consumable HTTP endpoints;
- server-side query functions for server-rendered views.

### Rule

The choice of transport must not determine the application architecture.

For example:

```text
Server Action
      ↓
Application Service
      ↓
Domain
```

not:

```text
Server Action
      ↓
Prisma directly
```

---

# 14. Frontend Architecture

## 14.1 Next.js

Next.js is the web application framework.

Use the App Router.

Current Next.js tooling supports the App Router and `src` directory setup. Next.js 15.5.25 is pinned.

## 14.2 React

React provides UI composition.

The Modular Monolith presentation split is implemented as:

```text
src/app/                    route groups and App Router boundaries
src/components/ui/          reusable primitives only
src/components/forms/       Field composition
src/components/app-shell/   authenticated chrome
src/components/page/        PageHeader / PageContent
src/components/states/      LoadingState / ErrorState / EmptyState
src/components/placeholder/ structural placeholder pages
src/components/dashboard/   analytics dashboard presentation (EPIC-104)
src/features/               auth, workspace, clients, contracts, time-entries, landing, notifications
src/lib/                    navigation helper, cn, analytics periods
```

`src/features/clients` is implemented (EPIC-101). `src/features/contracts` is implemented (EPIC-102). `src/features/time-entries` is implemented (EPIC-103) and serves the `/time-tracking` routes. EPIC-104 added `src/components/dashboard/` as presentation-only server components for the dashboard; EPIC-107 serves that surface at `/dashboard`. The calculation logic lives in the analytics application service, not in a feature folder. EPIC-107 added `src/features/landing/` and the `(public)` route group for `/`. EPIC-106 added `src/features/notifications/` (notification center UI components and Server Action) and `src/application/alerts/` (AlertService, alert evaluation types, dedup key builder). Remaining product feature folders (`billing`) are future work.

## 14.3 UI system

shadcn/ui (`radix-nova`, CSS variables, base color `neutral`) and Tailwind CSS 4 are the Foundation styling system. Light `:root` tokens are the runtime theme. `.dark` tokens remain unused; there is no theme switcher.

Implemented primitives:

- `Button`, `Sheet`, `Input`, `Label`, `Card`, `Alert`
- `Field` (label + control + optional hint/error association)
- `LoadingState`, `ErrorState`, `EmptyState`
- `PageHeader`, `PageContent`

Typography baseline: Geist, `h1`–`h3`, body, muted. This is a Foundation default, not a product brand system.

UI primitives contain no domain or authorization logic. They do not import Prisma or the Better Auth server instance.

## 14.4 Application shell

`(app)/layout.tsx` remains the authenticated workspace gate. After `getCurrentWorkspaceContext()` and `getAuthorizedWorkspace()`, the server layout passes display-only props to `AppShell`.

Desktop: skip link, header (product mark, workspace name, account label, Sign out), `md` sidebar, `main#main-content`.

Mobile: header menu button opens a Sheet with Application nav.

`/` is the public landing (EPIC-107): `(public)` layout, no AppShell. Authenticated visitors are redirected via workspace resolution and never see the landing. `/dashboard` is the authenticated Dashboard product surface (EPIC-104, route moved by EPIC-107): monthly summary, client allocation, and contract utilization, rendered as a Server Component from the shared analytics service inside `(app)` / AppShell. `/clients` is a product surface: ACTIVE list, archived view, create, detail, and edit. `/contracts` is a product surface: list, create, detail, and edit. `/time-tracking` is a product surface. `/alerts` is the in-app notification center (page title Alerts). `/settings` is a read-only Account / Workspace / Alerts information surface. It does not mutate timezone, currency, or thresholds. Timezone remains immutable after workspace creation. `(auth)` and `(public-auth)` layouts show the FreelanceOS wordmark. `(app)/loading.tsx`, `error.tsx`, and `not-found.tsx` render the shared state primitives; the dashboard uses the route-level loading surface only, with no per-section skeletons (F-104-008).

## 14.5 Responsive design

The primary target is desktop/laptop use, but core workflows must remain usable on tablet and mobile browser sizes.

Priority:

1. desktop productivity;
2. tablet;
3. mobile browser.

A native mobile app is outside MVP.

---

# 15. Frontend Feature Boundaries

Each feature owns its:

- pages/routes;
- feature-specific components;
- UI state;
- application calls;
- feature-specific validation;
- presentation logic.

Example:

```text
features/time-tracking/
├── components/
├── queries/
├── mutations/
├── schemas/
└── types/
```

Generic UI primitives remain under `components/ui/`. Shared form, page, state, and shell composition live beside that folder. Business-specific components do not belong there. The client and contract feature folders are implemented; remaining product feature folders remain future work.

---

# 16. Validation

Use two levels of validation:

### Boundary validation

Validate external/user input before entering application services.

Candidate technology:

```text
Zod
```

### Domain validation

Enforce business invariants independently of UI validation.

Example:

```text
UI:
"duration must be > 0"

Domain:
Duration cannot be zero or negative.
```

Client-side validation is a UX optimization, not a security boundary.

---

# 17. Reporting Architecture

Reporting is implemented as application queries/read models, as
specified. Review: `docs/epics/EPIC-105/engineering-review.md` (pending
P105-08).

```text
                 ┌───────────────┐
                 │   TimeEntry   │
                 └───────┬───────┘
                         │
                 ┌───────▼───────┐
                 │ Analytics     │
                 │ Query Layer   │
                 └───────┬───────┘
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
   Dashboard          Reports           Alerts
```

The reporting layer does not create an independent source of truth.
`ReportingService` is a thin orchestration layer that resolves
period-kind requests and delegates all arithmetic to `AnalyticsService`.
No reporting formula is duplicated from the analytics layer.

`/reports` is a React Server Component with no `use client` directive.
Authorization is resolved through `getCurrentWorkspaceContext()` outside
any `try` block. Period selection is URL-driven (search parameters only);
no browser-supplied tenant identifier can influence the workspace scope.

Performance: a baseline has been measured at the EPIC-104 reference
volume (100 clients, 50 contracts, 1000 time entries, 13 months). The
out-of-validity check issues one COUNT query per contract with in-period
consumption via `Promise.all` (concurrent, not serial). At the declared
MVP scale of 50 contracts this yields ≤ 53 DB operations per
`getContractUtilizations` call. No dedicated SQL aggregation or database
view has been introduced; the architecture permits them later if
profiling justifies it (PD-105-008 unanswered). Do not prematurely
introduce a data warehouse.

---

# 18. Billing Architecture

Billing calculations should be deterministic and centralized.

Conceptually:

```text
TimeEntry
   ↓
Contract applicability
   ↓
Billable eligibility
   ↓
Billing calculation
   ↓
Money
```

The billing calculation service must own:

- hourly calculation;
- daily calculation;
- rounding;
- currency rules.

Some of these are still open business decisions and must be finalized before implementation.

Future invoice generation should snapshot billable lines rather than continuously recalculating already-issued invoices.

---

# 19. Alert Engine

The alert engine is a deterministic rule evaluator.

Conceptually:

```text
Analytics
   ↓
Rule evaluation
   ↓
Alert
   ↓
Notification
```

Rules should be explicit and testable.

Example:

```text
ContractUtilization >= 0.80
    → CONTRACT_WARNING
```

and:

```text
ConsumedHours > ContractedHours
    → CONTRACT_EXCEEDED
```

The engine does not duplicate hour calculations.

### Implemented by EPIC-106

`AlertService.evaluateAlerts(context)` is the sole write path for alert creation and resolution. No browser can create alerts directly. AR-001 and AR-002 implemented. AR-003/AR-004 deferred (PD-106-001). Workspace isolation: every alert carries `workspaceId`; all repository queries include `workspaceId`. Evaluation is on-write (TimeEntry mutations), not scheduled (PD-106-003). Null `contractedMinutes` suppresses alert (unlimited contract — follows BR-104-011).

---

# 20. Notification Architecture

MVP:

```text
Alert
  ↓
Notification
  ↓
In-app notification center (/alerts RSC)
```

Future:

```text
Notification
 ├── In-app
 ├── Email
 └── Other channels
```

Email delivery should be an infrastructure adapter, not embedded into alert business rules.

### Implemented by EPIC-106

In-app notification center at `/alerts` (RSC). No email, Slack, or push delivery. One notification created per workspace member per alert event (MVP: single-member workspace; fan-out deferred to OBD-009 resolution). `listNotificationsForUser(workspaceId, userId)` scoped by both identifiers — no cross-tenant access. `markNotificationRead` verifies `workspaceId` + `userId` ownership server-side before update. Unread count is also projected onto the Alerts navigation badge from the authenticated layout RSC (MVP Integration).

---

# 21. Future AI Boundary

AI is deliberately outside the MVP core.

Future architecture:

```text
                 ┌──────────────────────┐
                 │     AI Interface     │
                 │                      │
                 │ intent extraction    │
                 │ response generation  │
                 └──────────┬───────────┘
                            │
                     Tool / service calls
                            │
                 ┌──────────▼───────────┐
                 │ Application Services │
                 └──────────┬───────────┘
                            │
                       Domain logic
                            │
                        PostgreSQL
```

The LLM should not:

- directly access PostgreSQL;
- execute arbitrary SQL;
- calculate authoritative financial figures;
- bypass authorization;
- mutate business data without controlled application commands.

The AI layer may request structured operations such as:

```text
getMonthlyHours()
getClientRevenue()
getContractUtilization()
getUnbilledAmount()
```

and then explain the results.

---

# 22. External Integration Boundary

External integrations are adapters.

Future examples:

```text
integrations/
├── invoicing/
├── email/
├── calendar/
└── ai/
```

The domain must not depend directly on provider-specific SDKs.

Example:

```text
Domain/Application
       ↓
InvoicingPort
       ↓
ProviderAdapter
       ↓
External Provider
```

This is particularly important for Italian electronic invoicing because provider choice should not become a domain dependency.

---

# 23. Security Architecture

Security requirements include:

- secure authentication;
- secure session management;
- server-side authorization;
- workspace isolation;
- input validation;
- protected secrets;
- HTTPS in production;
- safe error handling;
- no sensitive data in application logs;
- dependency vulnerability monitoring;
- database backups;
- auditability for sensitive business changes.

### Critical invariant

Never trust:

```text
workspaceId
userId
clientId
contractId
```

from browser input as proof of authorization.

The server resolves and validates ownership.

---

# 24. Error Handling

Errors should be separated into:

### Domain errors

Expected business violations.

Examples:

```text
ContractNotFound
InvalidContractPeriod
InvalidDuration
ClientArchived
UnauthorizedWorkspaceAccess
```

### Application errors

Use-case failures.

### Infrastructure errors

Database, network or provider failures.

The UI receives safe, user-oriented error messages.

Internal stack traces, SQL details and infrastructure metadata must not be exposed to users.

---

# 25. Observability

MVP observability should remain lightweight.

Minimum:

- structured server logs;
- error logging;
- request correlation where useful;
- deployment logs;
- database error monitoring.

Future:

- metrics;
- distributed tracing;
- performance dashboards.

No observability platform should be introduced unless operational needs justify it.

---

# 26. Testing Architecture

Testing follows the architecture.

## Unit tests

Focus on deterministic domain/application logic:

- duration;
- money;
- contract applicability;
- billing calculations;
- utilization;
- alert rules.

## Integration tests

Focus on:

- Prisma/PostgreSQL persistence;
- workspace isolation;
- repository behavior;
- application services;
- authentication integration where appropriate.

## E2E tests

Focus on complete user workflows:

```text
Register
→ Create Client
→ Create Contract
→ Add Time
→ View Dashboard
→ Trigger Alert
→ View Report
```

Foundation E2E currently covers authentication, first-workspace onboarding, and the authenticated shell gate. Those journeys require `TEST_DATABASE_URL`. The remaining MVP steps above are later product work, not a missing Foundation suite.

## Principle

Do not use E2E tests to replace unit tests for deterministic business rules.

---

# 27. Deployment Architecture

MVP production target (D-001): **Vercel**.

```text
                    Internet
                       │
                       ▼
                     Vercel
                       │
                 Next.js app
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        PostgreSQL            Gmail SMTP
                           (password reset)
```

Recorded Vercel configuration (`vercel.json`):

- framework: Next.js
- install: `pnpm install --frozen-lockfile`
- build: `prisma generate`, `prisma migrate deploy`, then `pnpm build`

Local production-like runtime remains `pnpm build` then `pnpm start`. Hosted deployment requires a Vercel project, production environment variables, and a hosted PostgreSQL `DATABASE_URL`. Those are external. This repository does not invent a production hostname.

The exact hosting provider for PostgreSQL remains deferred.

Candidate managed PostgreSQL providers include:

- Prisma Postgres;
- Neon;
- Supabase;
- other managed PostgreSQL providers.

The application should remain portable at the PostgreSQL level.

---

# 28. Environment Strategy

At minimum:

```text
development
test
preview
production
```

Secrets must be environment-specific. Never commit real values. Never prefix these names with `NEXT_PUBLIC_`.

Required production (set on Vercel; values are external — this repository does not invent them):

```text
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
```

Optional (all environments). Unset in production → production mode when `NODE_ENV=production`:

```text
AUTH_EMAIL_DELIVERY
```

Local / test (never set on Vercel):

```text
TEST_DATABASE_URL
```

E2E-only (Playwright `pnpm start`; never set on Vercel):

```text
AUTH_E2E_RUNTIME
```

Only the secrets required by the current release should exist.

AI credentials should not be introduced into MVP environments if AI is not enabled.

---

# 29. Repository Architecture

Proposed repository:

```text
freelance-os/
│
├── README.md
├── MASTER_PLAN.md
├── CHANGELOG.md
│
├── docs/
│   ├── product-vision.md
│   ├── domain-model.md
│   ├── architecture.md
│   ├── storage.md
│   ├── testing-strategy.md
│   └── ux-principles.md
│
├── docs/epics/
│   ├── EPIC-001/
│   ├── EPIC-002/
│   └── ...
│
├── src/
│   ├── app/
│   ├── features/
│   ├── components/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── lib/
│
├── prisma/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── ...
```

The repository is the persistent engineering memory of the project.

---

# 30. Dependency Rules

The following dependency directions are mandatory:

```text
UI
 ↓
Application
 ↓
Domain

Infrastructure
 ───────────────→ Application / Domain contracts
```

Forbidden examples:

```text
Domain → Prisma
Domain → React
Domain → Next.js
Domain → browser APIs

UI → Prisma
UI → direct database access
```

Feature code may use application services but must not bypass authorization and business rules.

---

# 31. Architectural Decision Records

Significant architectural decisions should be recorded as ADRs.

Initial candidates:

```text
ADR-001 Modular Monolith
ADR-002 PostgreSQL
ADR-003 Prisma as persistence adapter
ADR-004 Next.js App Router
ADR-005 Workspace-based multi-tenancy (canonical in §5.2, §11, §12)
ADR-006 Authentication strategy (canonical in §11 and docs/storage.md §12)
ADR-007 Analytics as shared application capability
ADR-008 AI as external application adapter
```

ADRs should record:

- context;
- decision;
- alternatives;
- rationale;
- consequences.

---

# 32. Technology Stack Baseline

| Layer | Decision |
|---|---|
| Language | TypeScript |
| Web framework | Next.js |
| UI | React |
| UI foundation | shadcn/ui |
| Styling | Tailwind CSS |
| Validation | Zod |
| Database | PostgreSQL |
| ORM / data access | Prisma |
| Authentication | Better Auth 1.7.4 |
| OAuth | Google |
| Unit testing | Vitest 4.1.11 |
| E2E testing | Playwright 1.63.0 |
| Package manager | pnpm 10.22.0 |
| Deployment | Vercel |
| Email | Gmail SMTP for password-reset delivery |
| AI | External LLM provider, future release |

Foundation pins currently in use: Next.js 15.5.25, React 19.1.0, TypeScript 5.9.3, Prisma 6.19.3, Better Auth 1.7.4, PostgreSQL 17.

---

# 33. Architecture Risks

## R-001 — Over-engineering

Risk: introducing abstractions that are not justified by the domain size.

Mitigation: modular monolith, pragmatic boundaries, abstraction only where it protects a real responsibility.

## R-002 — Business logic leaking into UI

Risk: calculations duplicated across components.

Mitigation: application/domain services as the source of truth.

## R-003 — Workspace isolation defects

Risk: cross-tenant data access.

Mitigation: server-side workspace context, integration tests and explicit authorization boundaries.

## R-004 — Historical billing corruption

Risk: contract changes modify old data semantics.

Mitigation: explicit contract applicability and domain tests.

## R-005 — Reporting divergence

Risk: dashboard and reports calculate different numbers.

Mitigation: shared analytics/application calculation services.

## R-006 — AI coupling

Risk: introducing an LLM into core business logic.

Mitigation: AI remains an adapter over deterministic application services.

## R-007 — Premature integration complexity

Risk: implementing e-invoicing or other integrations before the core domain is stable.

Mitigation: external integration boundary and later release.

---

# 34. Architectural Acceptance Criteria

The architecture baseline is accepted when:

- module responsibilities are explicit;
- domain logic is independent of infrastructure;
- workspace isolation is explicit;
- authentication and authorization are separated;
- Prisma is isolated from the domain layer;
- dashboard and reporting share calculation services;
- alert rules do not duplicate analytics calculations;
- billing rules have a clear application/domain boundary;
- future integrations have explicit adapter boundaries;
- AI has an explicit non-authoritative boundary;
- testing responsibilities map to architectural layers;
- deployment architecture is sufficient for MVP;
- major architectural decisions have recorded rationale.

---

# 35. Deferred Architecture Decisions

The following are intentionally not frozen yet:

- exact PostgreSQL hosting provider;
- production hostname / Vercel project;
- custom sending domain (Gmail SMTP is used without a purchased domain);
- database schema/index design;
- audit-log implementation;
- holiday/vacation architecture;
- invoice aggregate design;
- AI provider and tool-calling architecture;
- advanced caching strategy.

These decisions belong to the appropriate later design phase and must not be invented during unrelated implementation work.

---

# 36. Next Engineering Phase

The next architecture artifact is:

**`docs/storage.md`**

It will translate the domain model into the persistence model:

- tables/entities;
- primary keys;
- foreign keys;
- indexes;
- uniqueness constraints;
- temporal/contract constraints;
- workspace isolation;
- monetary representation;
- duration representation;
- migration strategy;
- audit considerations;
- Prisma mapping.

After `storage.md`, the next baseline artifact should be:

**`docs/testing-strategy.md`**

Only after these foundations are stable should the project move to `MASTER_PLAN.md` and Epic planning.

