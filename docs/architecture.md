# FreelanceOS — System Architecture

**Status:** Architecture Baseline — Draft  
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

---

## 5.3 Clients

### Responsibility

- client creation;
- client updates;
- client archival;
- client retrieval;
- client-specific summaries.

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
- estimated revenue;
- monthly summaries;
- period summaries.

The analytics layer is not a second database of truth.

It derives information from domain data.

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
- capacity warning;
- capacity exceeded.

The alert engine should consume analytics/application services rather than duplicate calculations.

---

## 5.9 Notifications

### Responsibility

- user-facing alert presentation;
- read/unread state;
- notification history;
- optional future email delivery.

Alert generation and notification delivery remain separate concepts.

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

The current Prisma documentation supports PostgreSQL and Next.js integration, including migrations and typed database access. The current Prisma 8 documentation also introduces a newer contract-first workflow; the exact Prisma version and project setup will be frozen during the Foundation phase. 

## 8.3 Repository boundary

Where business logic needs persistence, prefer application-facing repository interfaces such as:

```text
ClientRepository
ContractRepository
TimeEntryRepository
WorkspaceRepository
```

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

Email delivery is an Infrastructure boundary (`sendPasswordResetEmail`). No production email provider is selected. `AUTH_EMAIL_DELIVERY` selects `development` (acknowledge only), `test` (in-process capture for automated tests), or `production` (warn that no provider is configured and do not send). Reset tokens, reset URLs, passwords, and session tokens are never written to application logs. This is not production email delivery.

Google OAuth uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The provider is registered only when both values are present. The callback is Better Auth's catch-all handler at `/api/auth/callback/google`, derived from `BETTER_AUTH_URL` and the default `/api/auth` base path. Client code never receives the client secret.

Account linking uses Better Auth 1.7.4 defaults. Implicit linking stays enabled, but the library requires the existing local user to have `emailVerified: true` before linking a Google identity to an email/password user. Phase 2 registration does not verify email, so an existing unverified email/password account is not silently merged with a later Google sign-in for the same email. FreelanceOS does not override that library security default.

Protected application routes live in the `(app)` route group. The authenticated layout reads the Better Auth server session and redirects unauthenticated requests to `/sign-in`. Authenticated visitors to `/sign-in`, `/sign-up`, and `/forgot-password` are redirected to `/`. `/reset-password` remains reachable while authenticated so a recovery token can be completed.

Next.js 15.5.25 does not provide the `proxy.ts` request-interception convention. `middleware.ts` is deprecated by project convention and is not used. Server-side session validation in the authenticated layout is the authoritative boundary. Client auth state is a projection of that session.

## Authorization

Authorization is implemented in the application/server layer.

Conceptually:

```text
Request
  ↓
Authenticated session
  ↓
Resolve workspace membership
  ↓
Authorize operation
  ↓
Application use case
  ↓
Persistence
```

Authentication and authorization must not be treated as the same concern.

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

Current Next.js tooling supports the App Router and `src` directory setup. The exact framework version will be pinned during Foundation rather than relying on an unbounded latest version.

## 14.2 React

React provides UI composition.

The UI should be organized around product features rather than a single global component hierarchy.

Suggested structure:

```text
src/
├── app/
├── features/
│   ├── clients/
│   ├── contracts/
│   ├── time-tracking/
│   ├── dashboard/
│   ├── reporting/
│   ├── alerts/
│   └── billing/
├── components/
│   └── ui/
├── domain/
├── application/
├── infrastructure/
└── lib/
```

## 14.3 UI system

shadcn/ui is the preferred UI foundation.

It is particularly suitable because its components are open code and can be customized rather than forcing the product into a closed component-library design.

The visual system should be defined explicitly rather than relying on default component appearance.

## 14.4 Responsive design

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

Generic UI primitives remain under:

```text
components/ui/
```

Business-specific components do not belong there.

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

Reporting should be implemented as application queries/read models.

Conceptually:

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

The reporting layer must not create an independent source of truth.

For performance, dedicated SQL aggregation queries or database views may be introduced later if profiling justifies them.

Do not prematurely introduce a data warehouse.

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

The engine should not duplicate hour calculations.

---

# 20. Notification Architecture

MVP:

```text
Alert
  ↓
Notification
  ↓
In-app notification center
```

Future:

```text
Notification
 ├── In-app
 ├── Email
 └── Other channels
```

Email delivery should be an infrastructure adapter, not embedded into alert business rules.

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

## Principle

Do not use E2E tests to replace unit tests for deterministic business rules.

---

# 27. Deployment Architecture

Initial target:

```text
                    Internet
                       │
                       ▼
                  Vercel / Web
                       │
                 Next.js app
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        PostgreSQL          External services
                              (future)
```

The exact hosting provider for PostgreSQL is an implementation/deployment decision to be finalized during Foundation.

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

Secrets must be environment-specific.

Examples:

```text
DATABASE_URL
AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
EMAIL_PROVIDER_KEY
AI_PROVIDER_KEY
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
ADR-005 Workspace-based multi-tenancy
ADR-006 Authentication strategy
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
| Unit testing | Vitest candidate |
| E2E testing | Playwright candidate |
| Package manager | pnpm candidate |
| Deployment | Vercel candidate |
| Email | Delivery boundary implemented for password recovery; production provider TBD |
| AI | External LLM provider, future release |

Technology versions must be pinned during Foundation.

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
- exact Prisma major/minor version and configuration;
- exact Better Auth configuration;
- exact email provider;
- exact deployment configuration;
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

