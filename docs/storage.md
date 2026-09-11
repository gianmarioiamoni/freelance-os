# FreelanceOS --- Storage Architecture

**Status:** Implemented — EPIC-002 complete\
**Document:** `docs/storage.md`\
**Scope:** Release 0 Foundation + Release 1 MVP\
**Canonical format:** Markdown

------------------------------------------------------------------------

## 1. Purpose

This document defines the persistence architecture for FreelanceOS.

It translates the domain model and application architecture into a
concrete relational storage design while preserving the core
architectural principles:

-   PostgreSQL as the system of record.
-   Prisma as the application data-access layer.
-   Explicit workspace isolation.
-   Historical correctness for contracts and time entries.
-   Exact representation of money and durations.
-   Business invariants enforced at the strongest practical layer.
-   Database migrations as the only controlled schema-evolution
    mechanism.
-   Authentication persistence owned by the authentication
    infrastructure rather than by business modules.

This document is intentionally focused on **storage concerns**. UI
behavior, complete API contracts, and implementation-level component
details belong elsewhere.

## Implementation status

EPIC-002 is complete (Phases 1–5). Implemented:

- local PostgreSQL development database;
- Prisma 6 configuration;
- server-only Prisma Client lifecycle under Infrastructure;
- Prisma Migrate pipeline;
- application-owned models: Workspace, WorkspaceMember, Client,
  Contract, TimeEntry, WorkspaceSettings, Alert, Notification;
- workspace-scoped foreign keys, uniqueness, and documented indexes;
- integer-minute duration and NUMERIC(19,4) monetary rate;
- CHECK constraints for duration, rate, and settings thresholds;
- PostgreSQL exclusion constraint for contract validity overlap;
- composite workspace FKs for optional Alert/Notification references;
- workspace-scoped repository interfaces and Prisma implementations;
- deterministic development seed (`pnpm db:seed`).

Authentication tables remain outside this schema.

Phase 4 adds persistence integration tests against an isolated
PostgreSQL database (`TEST_DATABASE_URL`, default name
`freelanceos_test`) created from committed Prisma migrations
(`pnpm test:db:migrate`, never `db push`). Run them with
`pnpm test:integration`. CI starts PostgreSQL 17, applies the
migration chain, and fails if migrations or persistence tests fail.

Phase 5 certified this document against the implemented storage
layer. Review: `docs/epics/EPIC-002/engineering-review.md`.

`Alert.clientId` and `Alert.contractId` are independently optional
workspace-scoped FKs. The database does not prove they refer to the
same client; that remains an application/domain responsibility
(F-P3-002).

------------------------------------------------------------------------

# 2. Storage Principles

## 2.1 Relational model

FreelanceOS uses a relational model because the core domain is highly
relational:

``` text
Workspace
   │
   ├── Members
   │
   ├── Clients
   │      │
   │      └── Contracts
   │              │
   │              └── Time Entries
   │
   ├── Alerts
   │
   └── Notifications
```

The database must preserve referential integrity rather than relying
exclusively on application code.

------------------------------------------------------------------------

## 2.2 Workspace is the isolation boundary

Every application-owned business record belongs to exactly one
workspace.

This is a fundamental multi-tenancy rule:

``` text
User
  ↓
WorkspaceMember
  ↓
Workspace
  ↓
Business data
```

A browser-provided `workspaceId` is never sufficient authorization.

The server determines the authenticated user's active workspace and
verifies membership before executing a business operation.

------------------------------------------------------------------------

## 2.3 Historical correctness

FreelanceOS must not rewrite historical financial or operational meaning
when a client changes commercial conditions.

Therefore:

-   `Client` represents customer identity.
-   `Contract` represents commercial conditions over a validity
    interval.
-   `TimeEntry` records the contract context applicable to the work.

A historical time entry must remain associated with the contract under
which it was recorded, even if a newer contract is subsequently created.

This is why `TimeEntry` stores an explicit `contractId` rather than
resolving the contract dynamically every time a report is generated.

------------------------------------------------------------------------

## 2.4 Exact durations

Time durations are stored as **integer minutes**.

Example:

``` text
90 minutes = 1h 30m
```

Do not store working time as floating-point hours.

Forbidden:

``` text
hours = 1.5
```

Preferred:

``` text
durationMinutes = 90
```

Conversion to hours is a presentation/calculation concern.

------------------------------------------------------------------------

## 2.5 Exact monetary values

Money must not be stored using floating-point database types.

Use PostgreSQL `NUMERIC` through Prisma `Decimal`.

Recommended MVP representation:

``` text
NUMERIC(19,4)
```

with a separate ISO-4217 three-character currency code.

This provides exact decimal arithmetic while leaving room for rates that
require more than two decimal places.

The exact rounding policy remains a business decision and must be
centralized in the billing/domain layer.

------------------------------------------------------------------------

# 3. Core Entities

The MVP persistence model contains these application-owned entities:

  Entity                Purpose
  --------------------- --------------------------------------------
  `Workspace`           Tenant/business workspace
  `WorkspaceMember`     User membership and workspace role
  `Client`              Customer master data
  `Contract`            Commercial conditions for a client
  `TimeEntry`           Work performed for a client/contract
  `Alert`               Deterministic operational/business warning
  `Notification`        User-facing notification/read state
  `WorkspaceSettings`   Workspace-level operational defaults

Authentication entities such as users, sessions, accounts, and
verification records are managed by the authentication provider/library
and are not treated as ordinary business-domain tables in this document.

------------------------------------------------------------------------

# 4. Entity: Workspace

## Purpose

Represents the tenant boundary of the application.

## Fields

  Field         Type             Constraints   Notes
  ------------- ---------------- ------------- -----------------------------------
  `id`          UUID/string ID   PK            Stable identifier
  `name`        VARCHAR          NOT NULL      Workspace display name
  `timezone`    VARCHAR          NOT NULL      IANA timezone, e.g. `Europe/Rome`
  `currency`    CHAR(3)          NOT NULL      Default ISO-4217 currency
  `createdAt`   TIMESTAMP        NOT NULL      Creation timestamp
  `updatedAt`   TIMESTAMP        NOT NULL      Last update timestamp

## Constraints

``` text
PK(id)
```

The workspace timezone is important because reporting periods, work
dates, alert periods, and monthly boundaries must be interpreted
consistently.

------------------------------------------------------------------------

# 5. Entity: WorkspaceMember

## Purpose

Associates an authenticated user with a workspace.

This entity is application-owned even though the user identity is owned
by the authentication infrastructure.

## Fields

  Field           Type             Constraints     Notes
  --------------- ---------------- --------------- ---------------------
  `workspaceId`   UUID/string ID   FK              Workspace
  `userId`        Auth user ID     FK/logical FK   Better Auth user
  `role`          ENUM/string      NOT NULL        MVP role model
  `createdAt`     TIMESTAMP        NOT NULL        Membership creation

## Constraints

``` text
PRIMARY KEY (workspaceId, userId)
```

This prevents duplicate membership.

The role model should remain intentionally small in MVP. A likely
initial role set is:

``` text
OWNER
MEMBER
```

More granular permissions are deferred.

------------------------------------------------------------------------

# 6. Entity: Client

## Purpose

Stores customer master data.

A client is an identity, not a commercial agreement.

## Fields

  Field           Type             Constraints   Notes
  --------------- ---------------- ------------- ----------------------------
  `id`            UUID/string ID   PK            Stable identifier
  `workspaceId`   UUID/string ID   FK            Tenant boundary
  `companyName`   VARCHAR          NOT NULL      Legal/display company name
  `vatNumber`     VARCHAR          NULL          VAT number
  `taxCode`       VARCHAR          NULL          Tax/fiscal identifier
  `address`       TEXT             NULL          Full address for MVP
  `contactName`   VARCHAR          NULL          Primary contact
  `email`         VARCHAR          NULL          Contact email
  `phone`         VARCHAR          NULL          Contact phone
  `notes`         TEXT             NULL          Internal notes
  `status`        ENUM/string      NOT NULL      `ACTIVE` / `ARCHIVED`
  `createdAt`     TIMESTAMP        NOT NULL      Creation timestamp
  `updatedAt`     TIMESTAMP        NOT NULL      Last update timestamp

## Constraints

At minimum:

``` text
PK(id)
FK(workspaceId → Workspace.id)
```

The application must not physically delete a client when historical
records exist.

Archiving is the normal lifecycle operation.

------------------------------------------------------------------------

# 7. Entity: Contract

## Purpose

Represents a client's commercial conditions during a defined validity
interval.

This entity is central to historical correctness.

## Fields

  ----------------------------------------------------------------------------------
  Field                        Type              Constraints       Notes
  ---------------------------- ----------------- ----------------- -----------------
  `id`                         UUID/string ID    PK                Stable identifier

  `workspaceId`                UUID/string ID    FK                Tenant boundary

  `clientId`                   UUID/string ID    FK                Owning client

  `validFrom`                  DATE              NOT NULL          Inclusive start

  `validTo`                    DATE              NULL              Exclusive end

  `billingModel`               ENUM/string       NOT NULL          `HOURLY` /
                                                                   `DAILY`

  `rate`                       NUMERIC(19,4)     NOT NULL          Monetary rate

  `currency`                   CHAR(3)           NOT NULL          Contract currency

  `monthlyContractedMinutes`   INTEGER           NULL              Contracted
                                                                   monthly capacity

  `paymentTermsDays`           INTEGER           NULL              e.g. 30

  `paymentTermsNote`           TEXT              NULL              Non-standard
                                                                   terms

  `createdAt`                  TIMESTAMP         NOT NULL          Creation
                                                                   timestamp

  `updatedAt`                  TIMESTAMP         NOT NULL          Last update
                                                                   timestamp
  ----------------------------------------------------------------------------------

## Validity semantics

Contract validity uses a half-open interval:

``` text
[validFrom, validTo)
```

Therefore:

``` text
validFrom = 2026-01-01
validTo   = 2026-07-01
```

means the contract is valid from January 1 through June 30.

A `NULL` `validTo` means:

``` text
valid indefinitely into the future
```

This convention avoids ambiguity at contract boundaries.

------------------------------------------------------------------------

## Contract overlap rule

For a given client, two active contracts must not overlap in time.

Conceptually:

``` text
Client A

Contract 1: [2026-01-01, 2026-07-01)
Contract 2: [2026-07-01, ∞)

VALID
```

but:

``` text
Contract 1: [2026-01-01, 2026-07-01)
Contract 2: [2026-06-15, ∞)

INVALID
```

The strongest implementation is a PostgreSQL exclusion constraint using
a date range.

Because Prisma does not model every PostgreSQL-specific constraint
directly, the migration may need a reviewed raw SQL statement.

Application validation must also check for overlap to provide a useful
user-facing error.

Database enforcement remains the final integrity boundary.

Phase 3 implements this as:

``` text
EXCLUDE USING gist (
  workspaceId WITH =,
  clientId WITH =,
  daterange(validFrom, validTo, '[)') WITH &&
)
```

`btree_gist` is required so UUID equality can participate in the GiST
exclusion. `daterange(..., '[)')` preserves `[validFrom, validTo)`.
`validTo = NULL` becomes an unbounded range (open-ended contract).

------------------------------------------------------------------------

# 8. Entity: TimeEntry

## Purpose

Records work performed.

## Fields

  Field               Type             Constraints     Notes
  ------------------- ---------------- --------------- ------------------------
  `id`                UUID/string ID   PK              Stable identifier
  `workspaceId`       UUID/string ID   FK              Tenant boundary
  `userId`            Auth user ID     FK/logical FK   User who recorded work
  `clientId`          UUID/string ID   FK              Client
  `contractId`        UUID/string ID   FK              Contract context
  `workDate`          DATE             NOT NULL        Business date
  `durationMinutes`   INTEGER          NOT NULL        Positive duration
  `description`       TEXT             NULL            Work description
  `billable`          BOOLEAN          NOT NULL        Billable/non-billable
  `createdAt`         TIMESTAMP        NOT NULL        Creation timestamp
  `updatedAt`         TIMESTAMP        NOT NULL        Last modification

## Core constraints

``` text
durationMinutes > 0
```

Phase 3 enforces this with a PostgreSQL CHECK constraint.

and:

``` text
workspaceId + clientId
workspaceId + contractId
workspaceId + userId
```

must resolve to records belonging to the same workspace.

This prevents accidental cross-tenant relationships.

------------------------------------------------------------------------

## Why `contractId` is explicit

Do not derive the contract solely from:

``` text
clientId + workDate
```

at reporting time.

Suppose:

``` text
January–June:
€500/day

July onward:
€550/day
```

A time entry from June must continue to use the first contract even
after the second contract exists.

Explicit `contractId` makes that historical association durable.

------------------------------------------------------------------------

## Billable vs non-billable

`billable` is independent of the contract's billing model.

This allows:

``` text
Contract: HOURLY
TimeEntry: billable = true
```

and:

``` text
Contract: HOURLY
TimeEntry: billable = false
```

The precise treatment of non-billable time for contractual capacity
consumption remains a business decision and must be centralized in the
domain rules.

For MVP, the storage model supports both without embedding that policy
into the database.

------------------------------------------------------------------------

# 9. Entity: WorkspaceSettings

## Purpose

Stores workspace-level operational defaults.

## Fields

  ---------------------------------------------------------------------------------------
  Field                             Type              Constraints       Notes
  --------------------------------- ----------------- ----------------- -----------------
  `workspaceId`                     UUID/string ID    PK/FK             One settings
                                                                        record per
                                                                        workspace

  `timezone`                        VARCHAR           NOT NULL          Default timezone

  `currency`                        CHAR(3)           NOT NULL          Default currency

  `contractWarningPercent`          INTEGER           NOT NULL          Default
                                                                        threshold, MVP 80

  `monthlyCapacityWarningPercent`   INTEGER           NOT NULL          Default capacity
                                                                        threshold

  `createdAt`                       TIMESTAMP         NOT NULL          Creation
                                                                        timestamp

  `updatedAt`                       TIMESTAMP         NOT NULL          Last modification
  ---------------------------------------------------------------------------------------

Threshold values should be validated:

``` text
0 < threshold <= 100
```

Phase 3 enforces this on `contractWarningPercent` and
`monthlyCapacityWarningPercent`. There is no contract-level
`warningThreshold` field in the current schema.

The default contract warning threshold is intended to be **80%**,
subject to product/business confirmation.

Contract-level overrides may be added later if needed.

------------------------------------------------------------------------

# 10. Entity: Alert

## Purpose

Represents a deterministic business or operational condition.

Examples:

``` text
Contract utilization reached 80%
Contract utilization exceeded 100%
Monthly capacity reached warning threshold
Monthly capacity exceeded
```

Alerts are not the same thing as notifications.

## Fields

  -----------------------------------------------------------------------------
  Field                Type              Constraints       Notes
  -------------------- ----------------- ----------------- --------------------
  `id`                 UUID/string ID    PK                Stable identifier

  `workspaceId`        UUID/string ID    FK                Tenant

  `type`               ENUM/string       NOT NULL          Alert category

  `severity`           ENUM/string       NOT NULL          Warning/error/info

  `clientId`           UUID/string ID    NULL/FK           Related client

  `contractId`         UUID/string ID    NULL/FK           Related contract

  `periodStart`        DATE              NULL              Relevant period

  `periodEnd`          DATE              NULL              Relevant period

  `deduplicationKey`   VARCHAR           NOT NULL          Prevent repeated
                                                           alert creation

  `createdAt`          TIMESTAMP         NOT NULL          Creation

  `resolvedAt`         TIMESTAMP         NULL              Resolution timestamp
  -----------------------------------------------------------------------------

## Deduplication

The system should avoid creating the same logical alert repeatedly.

A deterministic key can encode the relevant dimensions:

``` text
workspace + alert type + contract + period
```

For example:

``` text
workspace:123
contract:456
CONTRACT_WARNING
2026-07
```

A unique constraint on the appropriate deduplication scope should
enforce this.

Exact alert lifecycle semantics remain an application/domain concern.

------------------------------------------------------------------------

# 11. Entity: Notification

## Purpose

Represents the user-facing delivery/read state of an alert or other
system message.

## Fields

  Field           Type             Constraints     Notes
  --------------- ---------------- --------------- -------------------
  `id`            UUID/string ID   PK              Stable identifier
  `workspaceId`   UUID/string ID   FK              Tenant
  `userId`        Auth user ID     FK/logical FK   Recipient
  `alertId`       UUID/string ID   NULL/FK         Source alert
  `type`          ENUM/string      NOT NULL        Notification type
  `title`         VARCHAR          NOT NULL        Display title
  `body`          TEXT             NOT NULL        Display message
  `readAt`        TIMESTAMP        NULL            Unread when null
  `createdAt`     TIMESTAMP        NOT NULL        Creation

Notifications are presentation/read-state records. They do not replace
the underlying business condition represented by an alert.

------------------------------------------------------------------------

# 12. Authentication Storage Boundary

Authentication is an infrastructure concern.

The selected authentication system is expected to manage records for:

``` text
User
Session
Account
Verification
```

The exact schema is intentionally not duplicated in this document
because it is coupled to the pinned Better Auth implementation/version.

Application-owned records reference the authentication user identifier.

Conceptually:

``` text
Better Auth
    │
    └── User
          │
          └── WorkspaceMember
                 │
                 └── Business data
```

Do not create a second application-level user identity unless a future
requirement explicitly justifies it.

------------------------------------------------------------------------

# 13. Foreign-Key Strategy

Where practical, application-owned relationships should include
`workspaceId` in the relationship so that the database can enforce
tenant consistency.

For example:

``` text
TimeEntry
  workspaceId
  clientId

        ↓

Client
  workspaceId
  id
```

The relationship can be enforced through a composite unique key and
composite foreign key:

``` text
Client UNIQUE(workspaceId, id)

TimeEntry FK(workspaceId, clientId)
    → Client(workspaceId, id)
```

The same pattern applies to:

``` text
Contract
TimeEntry
WorkspaceMember
Alert
Notification
```

This provides a database-level guard against records accidentally
referencing entities from another workspace.

Prisma cannot declare an optional composite FK that reuses a required
`workspaceId`. Phase 3 therefore keeps the simple Prisma FKs for
`Alert.clientId`, `Alert.contractId`, and `Notification.alertId`, and
adds matching composite FKs in SQL:

``` text
Alert(workspaceId, clientId) → Client(workspaceId, id)
Alert(workspaceId, contractId) → Contract(workspaceId, id)
Notification(workspaceId, alertId) → Alert(workspaceId, id)
```

PostgreSQL `MATCH SIMPLE` skips the composite FK when the optional id
is NULL. When the optional id is present, the referenced row must
belong to the same workspace.

------------------------------------------------------------------------

# 14. Primary Keys

Use generated opaque identifiers rather than business values as primary
keys.

Recommended MVP approach:

``` text
UUID
```

or the equivalent stable ID strategy supported by the selected
Prisma/database setup.

Do not use:

``` text
VAT number
company name
email
date
```

as primary keys.

Business values can change; identifiers should not.

------------------------------------------------------------------------

# 15. Indexing Strategy

Indexes should support the actual application query patterns.

## Workspace indexes

All workspace-scoped tables should have an index beginning with:

``` text
workspaceId
```

where useful.

------------------------------------------------------------------------

## Client indexes

Recommended:

``` text
Client(workspaceId, status)
Client(workspaceId, companyName)
```

Potential later index:

``` text
Client(workspaceId, vatNumber)
```

if VAT lookup becomes a common workflow.

------------------------------------------------------------------------

## Contract indexes

Recommended:

``` text
Contract(workspaceId, clientId)
Contract(workspaceId, clientId, validFrom)
Contract(workspaceId, clientId, validTo)
```

The exact set should be validated against query plans once real
reporting queries exist.

------------------------------------------------------------------------

## TimeEntry indexes

Time entries are the highest-volume business table in MVP.

Recommended:

``` text
TimeEntry(workspaceId, workDate)
TimeEntry(workspaceId, clientId, workDate)
TimeEntry(workspaceId, contractId, workDate)
TimeEntry(workspaceId, userId, workDate)
```

These support:

-   daily view
-   weekly timesheet
-   monthly dashboard
-   client reports
-   contract utilization
-   user-specific history

Avoid creating indexes speculatively beyond the actual query patterns.

------------------------------------------------------------------------

## Alert indexes

Recommended:

``` text
Alert(workspaceId, createdAt)
Alert(workspaceId, resolvedAt)
Alert(workspaceId, type)
```

------------------------------------------------------------------------

## Notification indexes

Recommended:

``` text
Notification(workspaceId, userId, createdAt)
Notification(workspaceId, userId, readAt)
```

This supports:

-   notification center
-   unread count
-   recent notifications

------------------------------------------------------------------------

# 16. Uniqueness Constraints

Recommended uniqueness rules:

### Workspace membership

``` text
UNIQUE(workspaceId, userId)
```

### Workspace settings

``` text
PRIMARY KEY(workspaceId)
```

### Alert deduplication

Use a unique constraint on the logical deduplication dimensions required
by the alert type.

### Contract overlap

Use a PostgreSQL exclusion constraint or equivalent database-level
mechanism.

Do **not** use a simple unique constraint on:

``` text
clientId
```

because multiple historical contracts are explicitly supported.

------------------------------------------------------------------------

# 17. Temporal Data Rules

FreelanceOS contains two distinct notions of time:

### Business dates

Used for:

-   work dates
-   contract validity
-   reporting periods

These should use PostgreSQL `DATE`.

### Timestamps

Used for:

-   creation
-   modification
-   notification state
-   alert lifecycle

These should use timezone-aware timestamps.

Conceptually:

``` text
workDate      → DATE
validFrom     → DATE
validTo       → DATE

createdAt     → TIMESTAMPTZ
updatedAt     → TIMESTAMPTZ
readAt        → TIMESTAMPTZ
resolvedAt    → TIMESTAMPTZ
```

This avoids introducing time-of-day ambiguity into business concepts
that are inherently date-based.

------------------------------------------------------------------------

# 18. Contract-to-TimeEntry Integrity

When creating a billable time entry, the application must verify:

1.  The client belongs to the current workspace.
2.  The contract belongs to the current workspace.
3.  The contract belongs to the selected client.
4.  The contract is valid for `workDate`.
5.  The user belongs to the workspace.
6.  The duration is positive.
7.  The billing rules permit the entry.

The database should enforce the structural relationships.

The application/domain layer should enforce the business semantics.

------------------------------------------------------------------------

# 19. Deletion Strategy

Historical operational data should be preserved.

## Client

Prefer:

``` text
ACTIVE → ARCHIVED
```

rather than physical deletion.

## Contract

Contracts should normally remain stored because historical time entries
reference them.

A contract may become inactive by reaching its `validTo` date.

## TimeEntry

MVP may support deletion from the normal UI, but deletion rules after
billing/period closure are unresolved.

This is tracked as an open business decision.

## Alert

Alerts may be resolved but should not normally be physically deleted.

## Notification

Notifications may eventually have retention rules, but no deletion
policy is required for MVP.

------------------------------------------------------------------------

# 20. Transactions

Operations that change multiple related records must use database
transactions where atomicity matters.

Examples:

### Create contract

Potentially:

``` text
validate client
→ validate contract overlap
→ create contract
```

### Record time

Potentially:

``` text
validate workspace membership
→ validate client
→ validate contract
→ create time entry
→ evaluate alert condition
→ create/update alert
→ create notification
```

Whether alert generation occurs synchronously in the same transaction or
through an application workflow should be decided during implementation.

The important invariant is that the system must not expose a partially
committed business operation.

------------------------------------------------------------------------

# 21. Billing Data Strategy

MVP does not create a complete invoice lifecycle.

Instead, billing calculations derive from:

``` text
TimeEntry
    +
Contract
    +
Billing rules
```

For an hourly contract:

``` text
billableMinutes
→ billableHours
→ rate
→ amount
```

For a daily contract:

``` text
billable work
→ daily-rate rule
→ amount
```

The database stores the source facts.

It should not store duplicated calculated totals unless there is a
demonstrated performance requirement.

This avoids stale derived values.

------------------------------------------------------------------------

# 22. Reporting and Aggregation

Reports should calculate from normalized source data.

Primary sources:

``` text
TimeEntry
Contract
Client
```

Examples:

### Monthly hours

``` text
SUM(TimeEntry.durationMinutes)
WHERE workDate is inside month
```

### Client hours

``` text
GROUP BY clientId
```

### Contract utilization

``` text
contract-consumed minutes
/
monthlyContractedMinutes
```

### Estimated revenue

Derived through the billing domain/application service.

For MVP, prefer correct query/service calculations over premature
materialized reporting tables.

If performance later becomes a real issue, aggregation strategies can be
introduced without changing the domain model.

------------------------------------------------------------------------

# 23. Alert Storage Strategy

Alerts are derived from deterministic rules.

Example:

``` text
contract utilization >= 80%
```

produces:

``` text
Alert(type = CONTRACT_WARNING)
```

and:

``` text
contract utilization >= 100%
```

produces:

``` text
Alert(type = CONTRACT_EXCEEDED)
```

The database stores the resulting state.

It does not contain business calculations such as:

``` text
"80% means warning"
```

Those rules belong in the domain/application layer and may use values
from `WorkspaceSettings`.

------------------------------------------------------------------------

# 24. Prisma Mapping

Prisma is the persistence adapter used by the infrastructure layer.

Conceptually:

``` text
Domain
   ↑
Application
   ↑
Repository interfaces
   ↑
Prisma repositories
   ↑
PostgreSQL
```

The domain layer must not import Prisma types.

Avoid:

``` text
Domain → Prisma.Decimal
Domain → PrismaClient
Domain → Prisma models
```

Instead, translate persistence representations at the infrastructure
boundary.

Phase 3 repository ports live in `src/domain/repositories.ts`. Prisma
implementations live under `src/infrastructure/persistence/`. Writes
that must be atomic use `runInTransaction` in Infrastructure. All
application-facing reads/writes take an explicit `workspaceId` except
workspace creation and `getWorkspaceById`.

------------------------------------------------------------------------

# 25. Prisma Schema Organization

The Prisma schema should represent:

-   scalar fields
-   relations
-   indexes
-   ordinary unique constraints
-   ordinary foreign keys

Database-specific features that Prisma cannot express adequately may be
introduced through reviewed SQL migrations.

Examples:

``` text
PostgreSQL exclusion constraints
advanced indexes
database-specific expressions
```

These must be documented so that the Prisma schema and actual database
schema do not silently diverge.

------------------------------------------------------------------------

# 26. Migration Strategy

Prisma Migrate is the canonical schema-evolution mechanism.

Principles:

1.  Every schema change is versioned.
2.  Every migration is committed to Git.
3.  Production schema changes are applied through migrations.
4.  Manual production changes are forbidden except for controlled
    incident recovery.
5.  Generated migrations must be reviewed.
6.  Raw SQL inside migrations must be documented.
7.  Destructive migrations require explicit review.
8.  Seed data must be deterministic and development-only unless
    explicitly designed otherwise.

Migration lifecycle:

``` text
Change Prisma schema
        ↓
Generate migration
        ↓
Review SQL
        ↓
Apply locally
        ↓
Run tests
        ↓
Commit migration
        ↓
CI validation
        ↓
Deploy migration
```

------------------------------------------------------------------------

# 27. Seed Data

Development seed data should provide a small but realistic workspace:

``` text
1 workspace
2 users
3 clients
3–5 contracts
20–50 time entries
several alert states
notifications
```

The seed should cover:

-   active and archived client
-   historical contracts
-   hourly contract
-   daily contract
-   billable entries
-   non-billable entries
-   threshold warning
-   exceeded threshold
-   empty/current periods

Seed data must never be required for production correctness.

The Phase 3 development seed is idempotent (fixed UUIDs + upsert),
synthetic, and invoked with `pnpm db:seed`. It creates one workspace,
two memberships with opaque auth user ids, three clients, four
contracts, eight time entries, workspace settings, two alerts, and two
notifications. It does not create Better Auth users or passwords.

------------------------------------------------------------------------

# 28. Data Validation Boundaries

Validation is intentionally distributed.

## UI

Responsible for:

-   user-friendly input constraints
-   immediate feedback
-   formatting

## Application layer

Responsible for:

-   authorization
-   use-case validation
-   orchestration
-   cross-entity rules

## Domain layer

Responsible for:

-   business invariants
-   billing rules
-   contract semantics
-   utilization calculations

## Database

Responsible for:

-   primary keys
-   foreign keys
-   uniqueness
-   non-null constraints
-   basic numeric constraints
-   temporal overlap constraints where practical

This follows the principle:

``` text
Do not rely on one layer for every invariant.
```

------------------------------------------------------------------------

# 29. Audit Considerations

Auditability is not fully defined for MVP.

Potential future requirements include:

``` text
who changed a contract
who changed a rate
who edited a time entry
who deleted an entry
when a billing period was closed
```

A future audit model could include:

``` text
AuditLog
  id
  workspaceId
  userId
  entityType
  entityId
  action
  before
  after
  createdAt
```

Do not implement this table in MVP unless the business decision is
promoted into scope.

Current open decision:

``` text
OD-008 / OBD-008 — audit requirements
```

------------------------------------------------------------------------

# 30. Period Closure and Immutability

MVP does not yet define a full billing-period closure mechanism.

This matters because a future billing workflow may require:

``` text
OPEN
→ REVIEW
→ CLOSED
```

After closure, modifications to historical time entries may need
restrictions.

Until that business rule is defined, storage must not introduce an
artificial closed-period mechanism.

The schema should remain compatible with a future closure model.

------------------------------------------------------------------------

# 31. Currency Strategy

MVP should use a workspace default currency and store the contract
currency explicitly.

Recommended:

``` text
Workspace.currency
Contract.currency
```

Time entries do not need their own currency because the monetary
interpretation comes from the associated contract.

Multi-currency reporting is deferred.

If multiple currencies become supported, analytics and billing must
explicitly define:

-   conversion source
-   conversion date
-   reporting currency
-   rounding
-   historical FX behavior

These are outside MVP.

------------------------------------------------------------------------

# 32. Payment Terms

For MVP, payment terms are represented pragmatically as:

``` text
paymentTermsDays
```

Example:

``` text
30
```

means:

``` text
Net 30
```

An optional:

``` text
paymentTermsNote
```

allows non-standard contractual language without forcing every possible
commercial term into an enum.

A richer payment-term model can be introduced later if invoice/payment
workflows require it.

------------------------------------------------------------------------

# 33. Recommended Logical Schema

The resulting high-level schema is:

``` text
┌────────────────────┐
│      Workspace     │
│────────────────────│
│ id                 │
│ name               │
│ timezone           │
│ currency           │
└─────────┬──────────┘
          │
          ├──────────────┐
          │              │
          ▼              ▼
┌────────────────┐  ┌────────────────────┐
│ WorkspaceMember│  │ WorkspaceSettings  │
│────────────────│  │────────────────────│
│ workspaceId    │  │ workspaceId        │
│ userId         │  │ timezone           │
│ role           │  │ currency           │
└────────────────┘  │ warning thresholds │
                    └────────────────────┘

          Workspace
              │
              ▼
       ┌──────────────┐
       │    Client    │
       │──────────────│
       │ id           │
       │ workspaceId  │
       │ companyName  │
       │ status       │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │   Contract   │
       │──────────────│
       │ id           │
       │ workspaceId  │
       │ clientId     │
       │ validFrom    │
       │ validTo      │
       │ billingModel │
       │ rate         │
       │ currency     │
       │ monthly mins │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │  TimeEntry   │
       │──────────────│
       │ id           │
       │ workspaceId  │
       │ userId       │
       │ clientId     │
       │ contractId   │
       │ workDate     │
       │ duration min │
       │ billable     │
       └──────────────┘

       ┌──────────────┐       ┌────────────────┐
       │    Alert     │──────▶│ Notification   │
       │──────────────│       │────────────────│
       │ workspaceId  │       │ workspaceId    │
       │ contractId   │       │ userId         │
       │ period       │       │ alertId        │
       │ type         │       │ readAt         │
       └──────────────┘       └────────────────┘
```

------------------------------------------------------------------------

# 34. Critical Invariants

The implementation must preserve these invariants.

### Tenant isolation

``` text
Every business record belongs to exactly one workspace.
```

### Membership

``` text
A user can act on workspace data only if they are a member of that workspace.
```

### Referential integrity

``` text
A TimeEntry cannot reference a Client or Contract from another workspace.
```

### Contract ownership

``` text
A TimeEntry.contractId must reference a contract belonging to TimeEntry.clientId.
```

### Contract validity

``` text
A billable TimeEntry must use a contract valid on TimeEntry.workDate.
```

### Duration

``` text
durationMinutes > 0
```

### Contract rates

``` text
rate > 0
```

Phase 3 enforces this with a PostgreSQL CHECK constraint.

### Historical correctness

``` text
Changing today's contract must not rewrite historical TimeEntry meaning.
```

### Non-destructive customer lifecycle

``` text
Archived clients remain available for historical reporting.
```

### Exact arithmetic

``` text
No floating-point persistence for money or duration.
```

------------------------------------------------------------------------

# 35. Open Storage-Related Decisions

The following decisions remain intentionally open and should not be
silently resolved during implementation.

  ID        Decision
  --------- ------------------------------------------------------------
  OBD-001   Exact daily-rate billing semantics, including partial days
  OBD-002   Money rounding and currency precision
  OBD-003   Entries crossing midnight
  OBD-004   Holiday model
  OBD-005   Vacation/absence model
  OBD-006   Exact capacity warning threshold semantics
  OBD-007   Editing/deleting entries after billing-period closure
  OBD-008   Audit-log requirements
  OBD-009   Workspace roles and permissions
  OBD-010   Payment-term catalog/detail
  OBD-011   Multi-currency behavior
  OBD-012   Contract-hour rollover/expiry

Storage must remain flexible enough to accommodate these decisions
without unnecessary redesign.

------------------------------------------------------------------------

# 36. ADR Candidates

The following decisions are strong candidates for Architecture Decision
Records:

### ADR-001 --- Workspace-scoped persistence

Document why every business table contains `workspaceId` and why
composite relationships are preferred where practical.

### ADR-002 --- Explicit contract reference on TimeEntry

Document why historical contract context is stored rather than
dynamically resolved.

### ADR-003 --- Contract validity interval semantics

Document the `[validFrom, validTo)` convention and overlap enforcement.

### ADR-004 --- Money representation

Document PostgreSQL `NUMERIC` + currency strategy and rounding
ownership.

### ADR-005 --- Duration representation

Document integer-minute storage.

### ADR-006 --- Authentication ownership

Document the boundary between Better Auth persistence and
application-owned workspace membership.

------------------------------------------------------------------------

# 37. Implementation Checklist

Before implementation is considered complete for storage:

-   [x] PostgreSQL database configured.
-   [x] Prisma configured.
-   [x] Prisma schema created.
-   [x] Workspace model implemented.
-   [x] Workspace membership implemented.
-   [x] Client model implemented.
-   [x] Contract model implemented.
-   [x] TimeEntry model implemented.
-   [x] Alert model implemented.
-   [x] Notification model implemented.
-   [x] WorkspaceSettings implemented.
-   [x] Workspace-scoped foreign keys reviewed.
-   [x] Contract overlap constraint implemented.
-   [x] Duration constraints implemented.
-   [x] Money precision confirmed.
-   [x] Indexes reviewed against real queries.
-   [x] Initial migration generated and reviewed.
-   [x] Seed data created.
-   [x] Migration tested from clean database.
-   [x] Migration tested against representative development data.
-   [x] Repository interfaces remain independent from Prisma.
-   [x] No UI code accesses Prisma directly.
-   [x] No domain code imports Prisma.
-   [x] Cross-workspace access tests exist.

------------------------------------------------------------------------

# 38. Definition of Done for Storage

Storage is ready for the next implementation phase when:

1.  The Prisma schema reflects this document.
2.  The database can be created from migrations alone.
3.  Referential integrity is enforced.
4.  Workspace isolation is structurally supported.
5.  Contract overlap is prevented.
6.  Historical contract references are preserved.
7.  Money and durations use exact representations.
8.  Required indexes exist for MVP query patterns.
9.  Seed data demonstrates the core domain.
10. Integration tests prove the most important storage invariants.
11. Any deviation from this document is explicitly documented.
12. Open business decisions have not been silently converted into
    technical assumptions.

------------------------------------------------------------------------

# 39. Next Step

After storage architecture, the next canonical engineering document
should be:

``` text
docs/testing-strategy.md
```

That document should define:

-   unit-test boundaries
-   domain tests
-   application/service tests
-   repository integration tests
-   authorization tests
-   workspace-isolation tests
-   database migration tests
-   E2E scenarios
-   test data strategy
-   CI quality gates

Only after storage and testing strategy are sufficiently defined should
the project move into the detailed `MASTER_PLAN.md` and Epic-level
implementation planning.
