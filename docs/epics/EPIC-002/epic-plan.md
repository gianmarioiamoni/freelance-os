# EPIC-002 — Database & Persistence

## 1. Epic Identity

**Epic:** EPIC-002  
**Release:** Release 0 — Foundation  
**Objective:** Database & Persistence Foundation  
**Status:** In Progress (Phase 3 complete)  
**Depends on:** EPIC-001 — Foundation / Repository  
**Next Epic:** EPIC-003 — Authentication

---

## 2. Objective

Establish the persistent-data foundation required by FreelanceOS before business functionality is implemented.

This Epic introduces:

- PostgreSQL;
- Prisma;
- the initial application-owned persistence schema;
- migration strategy;
- development database setup;
- seed infrastructure;
- repository/data-access boundaries;
- structural workspace isolation;
- temporal contract integrity;
- exact duration and monetary representations;
- integration tests for the most important persistence invariants.

The result must be a persistence layer that later Epics can safely use for Clients, Contracts, Time Tracking, Analytics, Alerts and Notifications.

This Epic does **not** implement those business features.

---

## 3. Source of Truth

Implementation must follow these documents in priority order:

1. `MASTER_PLAN.md`
2. `docs/architecture.md`
3. `docs/storage.md`
4. `docs/domain-model.md`
5. `docs/testing-strategy.md`
6. this Epic Plan

Where implementation details are ambiguous, do not silently invent business rules. Preserve the documented open decisions and record technical findings or ADRs where appropriate.

---

## 4. Context

EPIC-001 established:

- Next.js / React / TypeScript application;
- App Router;
- application shell;
- Tailwind/shadcn foundation;
- Vitest;
- Playwright smoke testing;
- local quality commands;
- CI quality gates.

EPIC-001 is certified as:

```text
PASS WITH FINDINGS
READY FOR EPIC-002
```

The repository is therefore ready to introduce persistence.

---

## 5. Architectural Baseline

FreelanceOS remains a **Modular Monolith**.

Logical architecture:

```text
Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure
```

Persistence belongs to the Infrastructure boundary.

Expected dependency direction:

```text
Presentation
    ↓
Application
    ↓
Domain
    ↑
Infrastructure
    ↓
PostgreSQL / Prisma
```

The Domain layer must not import Prisma.

The UI must not access Prisma directly.

Application/domain code must not depend on Prisma-specific models where an abstraction is required by the architecture.

---

## 6. Epic Scope

### In Scope

- PostgreSQL development database;
- Prisma installation and configuration;
- Prisma schema;
- application-owned persistence models;
- migrations;
- development seed;
- repository interfaces/boundaries;
- Prisma repository implementations/adapters;
- workspace-scoped persistence;
- foreign-key integrity;
- indexes;
- uniqueness constraints;
- contract validity constraints;
- duration representation;
- monetary representation;
- migration verification;
- representative integration tests;
- clean-database setup;
- persistence documentation synchronization;
- relevant ADRs.

### Out of Scope

Do not implement:

- authentication;
- Better Auth;
- login;
- registration;
- Google OAuth;
- session management;
- workspace UI;
- client CRUD;
- contract CRUD;
- time-entry UI;
- dashboard;
- reports;
- billing workflows;
- alerts engine;
- notifications UI;
- AI;
- e-invoicing;
- production database provisioning;
- production deployment;
- business-facing API endpoints;
- full E2E business workflows.

A database model may exist for entities needed by the storage architecture even when their application features belong to later Epics. Persistence implementation is not the same as implementing their user-facing functionality.

---

# 7. Persistence Model

The initial application-owned storage model is based on `docs/storage.md`.

Expected core entities:

```text
Workspace
WorkspaceMember
Client
Contract
TimeEntry
WorkspaceSettings
Alert
Notification
```

Authentication storage remains outside application-owned persistence and will be integrated in EPIC-003.

Do not create authentication tables manually unless explicitly required by the selected authentication library and documented architecture.

---

## 7.1 Workspace

Purpose:

Represent the tenant/isolation boundary.

Expected concepts:

- `id`
- `name`
- `timezone`
- `currency`
- `createdAt`
- `updatedAt`

Workspace is the primary persistence isolation boundary.

Every application-owned business entity that belongs to a workspace must carry an explicit `workspaceId` where specified by `docs/storage.md`.

---

## 7.2 WorkspaceMember

Purpose:

Represent membership of an authenticated user in a workspace.

Expected concepts:

- `workspaceId`
- `userId`
- `role`
- `createdAt`

Expected uniqueness:

```text
(workspaceId, userId)
```

Do not implement the full authorization model. Roles/permissions remain subject to the documented open business decision.

The persistence model must remain flexible enough for EPIC-003/EPIC-004.

---

## 7.3 Client

Purpose:

Represent the persistent identity of a customer/company.

Expected concepts include:

- workspace ownership;
- company name;
- VAT number;
- tax code;
- address/contact information;
- status;
- timestamps.

Client deletion must follow the non-destructive lifecycle defined in `docs/storage.md`.

Do not implement client UI or CRUD workflows.

---

## 7.4 Contract

Purpose:

Represent commercial conditions over a validity interval.

Expected concepts include:

- workspace ownership;
- client relationship;
- validity interval;
- billing model;
- rate;
- monthly contracted minutes/hours representation;
- payment terms;
- currency;
- timestamps;
- optional warning threshold where defined.

Contract validity follows:

```text
[validFrom, validTo)
```

where `validTo = NULL` represents an open-ended contract.

Contract overlap for the same client must be prevented according to `docs/storage.md`.

Do not silently resolve open questions about daily-rate semantics, rounding, rollover, or period closure.

---

## 7.5 TimeEntry

Purpose:

Represent recorded work.

Expected concepts:

- workspace ownership;
- user reference;
- client reference;
- explicit contract reference;
- work date;
- duration in integer minutes;
- description;
- billable flag;
- timestamps.

Duration must not be stored as floating-point hours.

The explicit `contractId` is intentional and preserves historical billing context.

The storage implementation must preserve the invariants documented in `docs/storage.md`.

---

## 7.6 WorkspaceSettings

Purpose:

Store workspace-level operational defaults/configuration.

At minimum, support the settings required by the storage architecture, such as:

- timezone;
- currency;
- default warning threshold where defined.

Do not prematurely model every future setting.

---

## 7.7 Alert

Purpose:

Persist deterministic alert state generated by future application/domain logic.

The persistence model should support:

- workspace ownership;
- alert type;
- severity;
- relevant client/contract references where applicable;
- period boundaries;
- deduplication key;
- creation/resolution state as defined by storage architecture.

Do not implement the alert engine in this Epic.

---

## 7.8 Notification

Purpose:

Persist user-facing notification/read state.

Support the storage concepts defined by `docs/storage.md`.

Do not implement notification UI or delivery infrastructure.

---

# 8. Data Representation Rules

## 8.1 Duration

Durations must be stored as integer minutes.

Do not store business durations as floating-point hours.

Example:

```text
90 minutes
```

rather than:

```text
1.5 hours
```

Conversion to display units belongs to the application/presentation boundary.

---

## 8.2 Money

Use the exact monetary representation defined in `docs/storage.md`.

The preferred baseline is PostgreSQL `NUMERIC` / Prisma `Decimal`, with explicit currency handling.

Do not use floating-point numeric types for authoritative monetary values.

Do not silently finalize unresolved rounding policy.

---

## 8.3 Dates

Business dates such as `workDate`, `validFrom` and `validTo` must preserve date semantics rather than being modeled as arbitrary timestamps.

Timestamps such as `createdAt` and `updatedAt` must preserve instant semantics.

Follow the storage document's temporal rules.

---

# 9. Workspace Isolation

Workspace isolation is a structural persistence requirement.

Review and implement:

- workspace ownership columns;
- foreign keys;
- composite relationships where appropriate;
- uniqueness constraints;
- repository scoping;
- integration tests proving cross-workspace access cannot occur through repository operations.

Do not rely on a client/browser-provided `workspaceId` as authorization.

The server/application layer must resolve and enforce workspace context.

EPIC-002 establishes the persistence primitives; EPIC-003 and EPIC-004 will establish authentication and full workspace resolution.

---

# 10. Foreign-Key Strategy

Follow `docs/storage.md`.

Where practical, use relationships that structurally prevent cross-workspace references.

Examples of invariants to protect:

```text
TimeEntry.workspaceId
    must belong to the same workspace as
TimeEntry.clientId
TimeEntry.contractId
```

Similarly:

```text
Contract.workspaceId
    must match
Contract.client.workspaceId
```

The database should enforce referential integrity wherever practical rather than relying exclusively on application checks.

---

# 11. Contract Temporal Integrity

Contract validity is a core persistence invariant.

For a client, overlapping contract intervals must not be allowed.

Preferred semantics:

```text
[validFrom, validTo)
```

A robust PostgreSQL implementation may require a database-level exclusion constraint.

If Prisma cannot express the constraint directly, use a reviewed raw SQL migration.

Do not weaken the invariant merely to avoid SQL outside the Prisma schema.

Document the resulting implementation.

---

# 12. Deletion Strategy

Follow the non-destructive lifecycle defined by `docs/storage.md`.

At minimum:

- Clients should not be physically deleted when history must be preserved.
- Contract history must remain queryable.
- Time entries must preserve historical references.
- Notifications/alerts should follow their documented lifecycle.

Do not introduce cascading deletes that could destroy business history unless explicitly supported by the storage design.

---

# 13. Indexing

Create indexes based on real MVP query patterns documented in `docs/storage.md`.

Review at minimum:

- workspace-scoped queries;
- client lookups;
- contract validity queries;
- time-entry date queries;
- alert queries;
- notification queries.

Do not create indexes speculatively.

Every non-obvious index should have a clear query/use-case justification.

---

# 14. Prisma Organization

Use Prisma as the Infrastructure persistence implementation.

Expected baseline:

```text
prisma/
├── schema.prisma
├── migrations/
└── seed.*
```

Application repository abstractions should remain independent from Prisma-specific details where required by the architecture.

Prisma-generated types must not leak into Domain entities unless explicitly justified.

---

# 15. Prisma Client Lifecycle

Implement a safe Prisma client lifecycle appropriate for Next.js development.

Avoid creating an uncontrolled new Prisma client for every import/request in development.

Follow established project conventions for server-side Prisma usage.

Do not expose Prisma client code to browser/client components.

---

# 16. Repository Boundaries

Establish persistence interfaces according to the architecture.

Repositories should expose application/domain-relevant operations rather than raw Prisma CRUD methods.

Avoid generic repositories such as:

```text
findEverything()
createAnything()
updateAnything()
```

Prefer explicit operations driven by actual use cases.

However, do not create the entire future repository API in this Epic.

Implement only the persistence operations necessary to establish and verify the foundation.

---

# 17. Transactions

Use database transactions where multiple writes must be atomic.

The storage architecture identifies transactional patterns such as:

- contract creation;
- time recording.

The implementation in this Epic should establish the transaction capability and repository boundary.

Do not implement complete business workflows that belong to later Epics.

---

# 18. Migrations

Use Prisma Migrate.

Requirements:

- migrations are committed to Git;
- schema changes are reproducible;
- no manual production schema changes;
- migration SQL is reviewed;
- raw SQL is allowed where Prisma cannot express required PostgreSQL constraints;
- migration history must remain deterministic.

The database must be creatable from migrations alone.

---

# 19. Development Database

Establish a documented development database strategy.

The strategy must allow a developer to:

1. create/reset the database;
2. apply migrations;
3. seed representative data;
4. run integration tests;
5. reproduce the expected schema from a clean database.

Do not require production infrastructure.

Do not commit database credentials.

Document required environment variables in `.env.example`.

---

# 20. Seed Data

Create deterministic development seed data sufficient to demonstrate the storage model.

Seed data should include representative relationships such as:

```text
Workspace
 ├── WorkspaceMember
 ├── Client
 │    └── Contract
 │          └── TimeEntry
 ├── WorkspaceSettings
 ├── Alert
 └── Notification
```

Seed data must be:

- deterministic;
- safe to rerun where practical;
- free of real personal information;
- suitable for local development/testing.

Do not make the seed resemble production data.

---

# 21. Integration Testing

Extend the existing test infrastructure with persistence integration tests.

The tests must cover the most important storage invariants.

At minimum, verify:

### Referential integrity

Invalid foreign-key relationships are rejected.

### Workspace isolation

Records belonging to Workspace A cannot be retrieved through Workspace B-scoped repository operations.

### Contract ownership

A contract cannot be associated with a client from another workspace.

### Contract overlap

Overlapping contract intervals for the same client are rejected.

### Historical correctness

A TimeEntry retains its explicit contract reference.

### Duration

Duration is stored/retrieved as integer minutes.

### Monetary precision

Monetary values retain exact precision according to the chosen representation.

### Non-destructive lifecycle

Required historical records remain available after archival/state changes.

Do not implement broad business behavior tests.

---

# 22. Test Database Strategy

Follow `docs/testing-strategy.md`.

Integration tests must use an isolated test database/schema strategy.

Do not run integration tests against a developer's ordinary database.

The strategy must make test state deterministic.

Prefer a disposable/resettable test database mechanism that is practical for local development and CI.

Document how it works.

---

# 23. CI Integration

Extend the existing CI quality pipeline only as required to support persistence tests.

CI must be able to:

1. provision/use the required test database;
2. apply migrations;
3. run persistence integration tests;
4. continue to run lint/typecheck/unit tests/build.

Do not introduce production deployment.

Do not redesign the existing CI unnecessarily.

If database services are needed, use the smallest maintainable CI configuration.

---

# 24. Security Considerations

At this stage, verify:

- database credentials come from environment configuration;
- secrets are not committed;
- Prisma is server-only;
- integration test credentials are isolated;
- CI secrets are not echoed;
- database connection strings are not exposed to client bundles.

Authentication and authorization remain future concerns, but the persistence foundation must not create obvious security weaknesses.

---

# 25. ADR Candidates

Evaluate the following ADRs from `docs/storage.md`:

- ADR-001 — Workspace-scoped persistence
- ADR-002 — Explicit contract reference on TimeEntry
- ADR-003 — Contract validity interval semantics
- ADR-004 — Money representation
- ADR-005 — Duration representation
- ADR-006 — Authentication ownership

Create ADR documents only where the decision is sufficiently architectural to warrant permanent recording.

Do not create ADRs merely to increase documentation volume.

---

# 26. Open Business Decisions

The following remain intentionally open and must **not** be silently resolved:

```text
OBD-001  Exact daily-rate billing semantics
OBD-002  Money rounding and currency precision
OBD-003  Entries crossing midnight
OBD-004  Holiday model
OBD-005  Vacation/absence model
OBD-006  Exact capacity warning threshold semantics
OBD-007  Editing/deleting entries after billing-period closure
OBD-008  Audit-log requirements
OBD-009  Workspace roles and permissions
OBD-010  Payment-term catalog/detail
OBD-011  Multi-currency behavior
OBD-012  Contract-hour rollover/expiry
```

Technical choices may preserve flexibility for these decisions, but do not turn them into unapproved business rules.

---

# 27. Epic Phases

## Phase 1 — Prisma & Database Bootstrap

### Objective

Introduce PostgreSQL and Prisma without implementing business repositories or application workflows.

### Scope

- Prisma dependency/configuration;
- Prisma schema baseline;
- database connection;
- environment variables;
- Prisma client lifecycle;
- migration setup;
- development database documentation.

### Acceptance

- Prisma generates successfully;
- database connection works;
- schema validates;
- first migration can be generated/applied;
- no business UI is introduced;
- no authentication is introduced.

### Expected commit

```text
feat(storage): establish postgres and prisma foundation
```

### Status

Complete. Persistence mechanism and migration pipeline are in place. Application-owned models are not implemented.

---

## Phase 2 — Core Persistence Schema

### Objective

Implement the application-owned persistence schema from `docs/storage.md`.

### Scope

Implement:

- Workspace;
- WorkspaceMember;
- Client;
- Contract;
- TimeEntry;
- WorkspaceSettings;
- Alert;
- Notification.

Implement:

- primary keys;
- foreign keys;
- workspace ownership;
- uniqueness;
- indexes;
- exact duration representation;
- exact monetary representation;
- temporal fields.

### Acceptance

- schema matches storage architecture;
- migrations apply cleanly;
- referential integrity is enforced;
- no authentication tables are manually introduced;
- open business decisions remain open.

### Expected commit

```text
feat(storage): implement core persistence schema
```

### Status

Complete. Application-owned persistence models, relations, constraints
expressible in Prisma, and the core schema migration are in place.
Contract overlap exclusion, repositories, and seed remain Phase 3.

---

## Phase 3 — Constraints, Repositories & Seed

### Objective

Establish database invariants and the Infrastructure repository boundary.

### Scope

- contract overlap enforcement;
- workspace-scoped repository interfaces;
- Prisma repository implementations;
- transaction primitives;
- deterministic seed;
- migration/constraint review.

### Acceptance

- contract overlap is prevented;
- repository operations are workspace-scoped;
- Prisma remains behind Infrastructure boundaries;
- seed is deterministic;
- no UI code imports Prisma;
- no Domain code imports Prisma.

### Expected commit

```text
feat(storage): establish persistence repositories and invariants
```

### Status

Complete. CHECK constraints, contract overlap exclusion, composite
workspace FKs for optional Alert/Notification references, repository
ports/implementations, transaction helper, and deterministic
development seed are in place.

---

## Phase 4 — Integration Testing & CI Database Gate

### Objective

Prove the persistence foundation through deterministic integration tests and CI.

### Scope

- isolated test database strategy;
- integration test fixtures;
- storage invariant tests;
- CI database service/configuration;
- migration-from-clean-database verification.

### Acceptance

At minimum:

- workspace isolation test passes;
- referential integrity tests pass;
- contract overlap test passes;
- historical contract reference test passes;
- duration precision test passes;
- monetary precision test passes;
- migrations work from a clean database;
- CI runs persistence tests successfully.

### Expected commit

```text
test(storage): verify persistence invariants
```

---

## Phase 5 — Documentation & Storage Engineering Review

### Objective

Verify that the implementation matches the storage architecture and prepare the Epic for certification.

### Scope

- synchronize `docs/storage.md`;
- document material implementation decisions;
- review ADRs;
- review dependencies;
- review migrations;
- review repository boundaries;
- run final quality gate;
- produce engineering review artifact.

### Expected review artifact

```text
docs/epics/EPIC-002/engineering-review.md
```

### Expected commit

```text
docs(storage): complete persistence engineering review
```

No new business functionality is introduced in this phase.

---

# 28. Phase Discipline

Each phase follows:

```text
Read context
    ↓
Implement one objective
    ↓
Verify
    ↓
Review diff
    ↓
One commit
    ↓
Update documentation if required
```

Rules:

- one Cursor chat per phase unless explicitly stated otherwise;
- one objective per chat;
- one phase per chat;
- one expected commit per phase;
- do not start the next phase automatically;
- do not implement future Epic functionality;
- do not silently resolve open business decisions.

---

# 29. Cursor Chat Strategy

For every Phase implementation prompt, specify whether Cursor should use:

**NEW CHAT**

when starting a new phase, to prevent context bleed and keep the objective isolated.

**CONTINUE CURRENT CHAT**

only when performing a correction or tightly coupled follow-up within the same phase.

For EPIC-002:

- Epic planning: **NEW CHAT**
- Phase 1: **NEW CHAT**
- Phase 2: **NEW CHAT**
- Phase 3: **NEW CHAT**
- Phase 4: **NEW CHAT**
- Phase 5 / Engineering Review: **NEW CHAT**

Each new chat must explicitly identify the relevant context documents.

---

# 30. Token-Saving Rules for Cursor

These rules apply to every EPIC-002 implementation prompt.

Cursor should minimize token consumption without reducing engineering quality.

### Documentation

- Read only the documents required for the current phase.
- Prefer targeted sections/searches.
- Do not repeatedly dump entire documents.
- Do not reproduce documentation in responses.

### Repository inspection

- Inspect before editing.
- Use targeted `rg`, `git diff`, `git status`, and focused file reads.
- Avoid printing large files unless necessary.

### Implementation

- Make the smallest change satisfying the current phase.
- Do not refactor unrelated code.
- Do not add speculative abstractions.
- Do not add dependencies without justification.

### Verification

- Do not repeat passing checks when no relevant files changed.
- After a fix, rerun affected checks.
- Always perform the final required quality gate.

### Output

Final reports must be concise.

Report:

- changed files;
- important decisions;
- verification results;
- findings;
- commit hash.

Do not paste large diffs or source files.

### Hard rule

Token saving must never mean skipping:

- architecture checks;
- migration review;
- integration tests;
- security checks;
- quality gates;
- Git review;
- required documentation synchronization.

---

# 31. Definition of Done

EPIC-002 is complete only when:

- [ ] PostgreSQL development database is configured.
- [ ] Prisma is configured.
- [ ] Prisma schema reflects `docs/storage.md`.
- [ ] All application-owned storage entities are implemented.
- [ ] Workspace ownership is structurally enforced.
- [ ] Foreign-key integrity is enforced.
- [ ] Contract overlap is prevented.
- [ ] Historical contract references are preserved.
- [ ] Duration uses integer minutes.
- [ ] Monetary values use exact representation.
- [ ] Required indexes exist.
- [ ] Required uniqueness constraints exist.
- [ ] Migrations create the database from a clean state.
- [ ] Seed data is deterministic.
- [ ] Repository boundaries isolate Prisma.
- [ ] Domain code does not import Prisma.
- [ ] UI code does not import Prisma.
- [ ] Integration tests cover critical storage invariants.
- [ ] Cross-workspace access tests pass.
- [ ] CI can execute persistence tests.
- [ ] No open business decision was silently resolved.
- [ ] Documentation is synchronized.
- [ ] Engineering Review exists.
- [ ] No BLOCKER/HIGH finding remains unresolved.
- [ ] Repository is ready for EPIC-003.

---

# 32. Epic-Level Verification

At the end of the Epic, the final quality gate must include, as applicable:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

plus the documented persistence integration test command.

Migration verification must demonstrate:

```text
clean database
      ↓
migration
      ↓
schema ready
      ↓
seed
      ↓
integration tests
      ↓
PASS
```

---

# 33. Risks

### R-001 — Workspace isolation defects

Impact: severe.

Mitigation:

- workspace-scoped schema;
- composite relationships where appropriate;
- repository scoping;
- integration tests.

### R-002 — Temporal contract overlap

Impact: severe.

Mitigation:

- `[validFrom, validTo)` semantics;
- database-level constraint;
- explicit tests.

### R-003 — Historical billing corruption

Impact: high.

Mitigation:

- explicit `contractId` on TimeEntry;
- foreign-key integrity;
- historical correctness tests.

### R-004 — Floating-point money/duration errors

Impact: high.

Mitigation:

- integer minutes;
- NUMERIC/Decimal;
- precision tests.

### R-005 — Prisma leakage into domain

Impact: medium/high.

Mitigation:

- repository boundary;
- architecture review;
- import checks.

### R-006 — Migration drift

Impact: high.

Mitigation:

- Prisma Migrate;
- committed migrations;
- clean-database verification;
- CI migration execution.

### R-007 — Overengineering persistence

Impact: medium.

Mitigation:

- implement only documented storage requirements;
- avoid generic repositories;
- avoid speculative abstractions.

---

# 34. Exit Criteria

EPIC-002 exits successfully when:

```text
PostgreSQL
    ↓
Prisma
    ↓
Schema
    ↓
Migrations
    ↓
Constraints
    ↓
Repositories
    ↓
Seed
    ↓
Integration Tests
    ↓
CI
    ↓
Engineering Review
    ↓
READY FOR EPIC-003
```

The Epic must not proceed to EPIC-003 if critical persistence invariants cannot be demonstrated.

---

# 35. Next Epic

After EPIC-002 certification:

**EPIC-003 — Authentication**

EPIC-003 will introduce:

- Better Auth;
- session management;
- email/password;
- Google OAuth;
- protected server boundary;
- integration with the application-owned `WorkspaceMember` model.

EPIC-002 must not implement those concerns prematurely.
