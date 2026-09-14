# EPIC-102 — Contracts

## 1. Epic Identity

**Epic:** EPIC-102  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E02 — Contract Management  
**Objective:** Contracts  
**Status:** COMPLETE — PASS WITH FINDINGS  
**Depends on:** EPIC-002 — Database & Persistence; EPIC-003 — Authentication; EPIC-004 — Workspace; EPIC-005 — Testing & CI Foundation; EPIC-006 — UI Foundation; EPIC-101 — Clients  
**Next Epic:** Time Tracking (`MASTER_PLAN.md` §13 R1-E03)  
**Canonical sources:** `MASTER_PLAN.md` §12 R1-E02; `docs/product-vision.md` F-030–F-033; `docs/domain-model.md` §3.4 / §4 / §7 / BR-002 / BR-003 / BR-006; `docs/storage.md` §7 / §13 / §31 / §32; `docs/architecture.md` §5.4 / §6 / §24; `docs/testing-strategy.md` §2.5 / §6

```text
PLANNING COMPLETE
IMPLEMENTATION COMPLETE
ENGINEERING REVIEW: PASS WITH FINDINGS
PRODUCTION READINESS: NO
READY FOR R1-E03
```

Reviewed commits:

```text
P102-01 feat(contracts): add contract application services
P102-02 feat(contracts): add authenticated contract management ui
28a0204a649a5e2de9104dcd022253bd15431b92
test(contracts): cover isolation and contract journeys
```

Phase 4 is documentation and Engineering Review only. Review:
`docs/epics/EPIC-102/engineering-review.md`.

Do not invent EPIC-007 or a Contract status model. Do not treat this Epic as a persistence redesign. Contract persistence already exists from EPIC-002. Client Management already exists from EPIC-101 and must not be silently redesigned.

This document is the only planning artifact for EPIC-102. Do not create additional planning files.

---

## 2. Status

```text
PLANNING COMPLETE
IMPLEMENTATION COMPLETE
ENGINEERING REVIEW: PASS WITH FINDINGS
PRODUCTION READINESS: NO
```

Phase statuses:

```text
P102-01 COMPLETE
P102-02 COMPLETE
P102-03 COMPLETE
P102-04 COMPLETE
FINAL VERDICT: PASS WITH FINDINGS
```

Phase 4 synchronized canonical documentation and recorded the Engineering Review.

This document remains the historical plan. Scope decisions, non-goals, proposed OBDs, and inherited findings are unchanged.

`MASTER_PLAN.md` is synchronized in Phase 4 with implemented reality. Production validation/certification has not occurred and is not this Epic’s exit.

---

## 3. Objective

Introduce workspace-scoped contract management so a client can have sequential historical commercial agreements, validity remains unambiguous, and later Time Tracking can attach work to an explicit contract.

From `MASTER_PLAN.md` R1-E02, this Epic establishes:

- create contract
- edit contract where permitted
- contract history
- validity dates
- hourly billing
- daily billing
- rate
- currency
- monthly contracted hours
- payment terms
- overlap validation
- historical contract visibility

Product outcomes from `docs/product-vision.md`:

- **F-030** — create a contract with client, validity dates, billing model, rate, monthly contracted hours, and payment terms
- **F-031** — billing models `HOURLY` and `DAILY` only
- **F-032** — a client can have multiple contracts over time
- **F-033** — the system can identify the contract valid on a given date; full TimeEntry recording remains R1-E03

`Client` is customer identity. `Contract` is commercial conditions over a validity interval. This Epic must not merge them.

A member can create and maintain contracts in the authorized workspace without bypassing workspace isolation.

This Epic does **not** grant production readiness.

---

## 4. Dependencies

| Dependency | Status | Role for this Epic |
| --- | --- | --- |
| EPIC-002 | Complete — PASS WITH FINDINGS | `Contract` model, `[validFrom, validTo)`, exclusion constraint, `ContractRepository`, overlap tests |
| EPIC-003 | Complete — PASS WITH FINDINGS | Better Auth session; protected `(app)` boundary |
| EPIC-004 | Complete — PASS WITH FINDINGS | `WorkspaceContext`, `getCurrentWorkspaceContext()`, membership isolation, workspace currency/timezone |
| EPIC-005 | Complete — PASS | Vitest, isolated PostgreSQL, Playwright, CI gates |
| EPIC-006 | Complete — PASS | AppShell, Field/Input/Label/Card/Alert, page/state primitives, `/contracts` placeholder |
| EPIC-101 | Complete — PASS | Workspace-scoped clients; create/list/detail/edit/archive; `/clients` product surface |
| `getCurrentWorkspaceContext()` | Implemented | Trusted workspace id for every contract operation |
| `getServerAuthSession()` | Implemented | Trusted user id for Server Actions |
| `ClientRepository` | Implemented | Client existence, status, and ownership checks |
| `ContractRepository` | Implemented except `updateContract` and workspace-wide `listContracts` | Persistence port; Phase 1 completes it |
| `createRepositories()` / `runInTransaction()` | Implemented | Infrastructure wiring |
| `getAuthorizedWorkspace()` | Implemented | Workspace currency/timezone for form defaults and derived “today” |

Do not add a new authorization API. Do not add a client-side workspace store.

---

## 5. Current Architecture / Context

Inspected: `MASTER_PLAN.md`, `docs/product-vision.md`, `docs/domain-model.md`, `docs/architecture.md`, `docs/storage.md`, `docs/testing-strategy.md`, EPIC-101 plan and engineering review, EPIC-002 / EPIC-004 / EPIC-005 / EPIC-006 reviews, `prisma/schema.prisma`, contract exclusion migration, `ContractRepository`, client application/UI patterns, existing tests, `README.md`, `CHANGELOG.md`.

### 5.1 Already implemented — do not rebuild

**Persistence**

- Prisma `Contract` with required `workspaceId`, `clientId`, `validFrom`, `billingModel`, `rate` (`Decimal(19,4)`), `currency` (`CHAR(3)`), timestamps
- Optional `validTo`, `monthlyContractedMinutes`, `paymentTermsDays`, `paymentTermsNote`
- `BillingModel` enum: `HOURLY` | `DAILY` only. `MONTHLY_FIXED` is not in the schema
- `@@unique([workspaceId, id])`, `@@unique([workspaceId, clientId, id])`
- Indexes `(workspaceId, clientId, validFrom)` and `(workspaceId, clientId, validTo)`
- Composite FK `Contract(workspaceId, clientId) → Client(workspaceId, id)` `onDelete: Restrict`
- Composite unique keys required by `TimeEntry(workspaceId, clientId, contractId)`
- SQL `CHECK (rate > 0)`
- SQL exclusion `Contract_client_validity_no_overlap` on `(workspaceId, clientId, daterange(validFrom, validTo, '[)'))`
- `btree_gist` already enabled
- `NULL validTo` is an unbounded open-ended interval
- `ContractRepository`: `createContract`, `getContract`, `listContractsForClient` (ordered by `validFrom` asc), `findContractCoveringDate`
- No `updateContract`
- No workspace-wide `listContracts`
- No physical `deleteContract`
- No `Contract.status` column
- Persistence integration already covers create, adjacent contracts, overlap rejection, open-ended collision, and cross-client / cross-workspace non-collision
- `TimeEntry.contractId` is required (F-P2-004). This Epic must not make it optional

**Authorization**

- `(app)` layout calls `getCurrentWorkspaceContext()`
- Workspace id comes from session membership, never from the browser
- Path/query `workspaceId` is not authorization
- `WorkspaceMember.role` is persist-and-attach only (OBD-009)

**Clients**

- ACTIVE list, archived view, create, detail, edit, archive
- Archived clients remain editable (proposed OBD-015 implementation default)
- No unarchive
- Client archive does not inspect contracts
- Client detail has no contract history section
- Proposed OBD-015 explicitly deferred contract/time-entry selection rules

**UI**

- `/contracts` is a placeholder with stable `h1` “Contracts”
- Navigation already includes Contracts; `isNavigationItemActive` treats `/contracts/*` as active
- Playwright shell journey currently asserts `/clients` after Dashboard, not the Contracts heading. Keep list `h1` **Contracts** anyway
- EPIC-006 primitives: `PageHeader`, `PageContent`, `Field`, `Input`, `Label`, `Card`, `Alert`, `EmptyState`, `LoadingState`, `ErrorState`, `Button`

**Testing / CI**

- Unit: Vitest Node. No jsdom / RTL / axe
- Integration: isolated `TEST_DATABASE_URL`, migrate-only, no `db push`, no truncation framework
- Playwright: `TEST_DATABASE_URL`, unique emails, CI = `pnpm dev` + one worker (EPIC-003 F-004)
- Zod is documented as a candidate and is **not** a dependency. Client and workspace validation use parse functions

**Gaps this Epic closes**

- `updateContract` persistence operation
- workspace-wide `listContracts`
- contract application services and input validation, including overlap and interval rules
- authenticated list / detail / create / edit UI
- client-detail contract history
- application-level isolation and one contract E2E journey
- documentation that `/contracts` is a product surface, not a placeholder

---

## 6. Scope

### In scope

- workspace-scoped contract create, read, update, and list
- `updateContract` and `listContracts` on the existing repository port and Prisma implementation
- application services that accept only server-resolved `WorkspaceContext`
- boundary validation of user-controlled contract fields
- application-level overlap validation with user-facing errors
- database exclusion constraint remains the final integrity boundary
- derived applicability for display (`current` / `scheduled` / `ended`) without a stored status
- `findContractCoveringDate` exposed as an application read for F-033 display
- authenticated UI at `/contracts` and nested contract routes
- contract history on client detail (F-032 / the contract-history part of F-022)
- empty, loading, error, validation, and not-found states using EPIC-006 primitives
- Server Actions for mutations; server-rendered reads
- unit, integration, and targeted E2E coverage described in §16
- Phase 4 documentation sync and `docs/epics/EPIC-102/engineering-review.md`

### Out of scope

See §7.

---

## 7. Explicit Non-Goals

Do not implement:

- invoicing, payments, e-invoicing, or invoice snapshots
- time tracking UI, timesheets, calendar, or TimeEntry create/edit/delete
- dashboard, analytics, utilization, reporting, alerts, or notifications
- billing amount calculation, daily-rate partial-day rules, or monetary rounding policy
- `MONTHLY_FIXED` or any billing model beyond `HOURLY` / `DAILY`
- a `Contract.status` / archive / closure enum
- physical contract deletion
- contract templates, electronic signatures, import/export, search, pagination, or saved views
- Prisma schema redesign, new Contract columns, or `db push`
- making `TimeEntry.contractId` optional (F-P2-004 stays open)
- rate versioning, commercial-field snapshots, or a contract revision table
- blocking or changing Client archive because contracts exist
- unarchive / restore of clients
- OWNER vs MEMBER permission differences (OBD-009)
- audit log (OBD-008)
- invitations, workspace switcher, or a contract `WorkspaceProvider`
- redesign of Better Auth, workspace resolution, Client Management, or CI
- jsdom, React Testing Library, `@axe-core/playwright`, a second test database strategy, or test truncation
- fixing EPIC-002 / EPIC-003 / EPIC-004 findings or G-004
- closing OBD-001 through OBD-012
- promoting proposed OBD-013 / OBD-014 / OBD-015 into `MASTER_PLAN.md`
- production validation, UX review, or production certification
- `engineering-review.md` before Phase 4
- `qa-report.md`, `ux-review.md`, or `production-validation.md`

---

## 8. Domain Rules

`Client` identifies **who** the customer is. `Contract` identifies **how** the relationship is commercially governed during a validity interval. `TimeEntry` will later reference both through an explicit `contractId` (`docs/domain-model.md` §4, BR-002, BR-003, BR-006, BR-012).

### 8.1 Ownership

- a Contract belongs to exactly one Client
- a Contract belongs to exactly one Workspace
- `clientId` is selected at create and is immutable afterwards
- `workspaceId` is never accepted from the browser
- the selected Client must belong to the authorized workspace
- a foreign or missing `clientId` is not-found / inaccessible, not a leak

### 8.2 Validity

Validity is a half-open interval:

```text
[validFrom, validTo)
```

Rules:

- `validFrom` is required
- `validTo` is optional
- `validTo = NULL` means open-ended / unbounded
- if `validTo` is present, it must be strictly after `validFrom`
- `[D, D)` is invalid (`InvalidContractPeriod`)
- `validTo` itself is not included in the interval
- adjacent intervals are valid: `[2026-01-01, 2026-07-01)` then `[2026-07-01, ∞)`

Example from `docs/storage.md`:

```text
validFrom = 2026-01-01
validTo   = 2026-07-01
```

means valid from 1 January through 30 June.

Business dates are calendar dates (`DATE`), not timestamps.

### 8.3 Overlap

For one client inside one workspace, two contracts must not overlap.

```text
VALID
  [2026-01-01, 2026-07-01)
  [2026-07-01, ∞)

INVALID
  [2026-01-01, 2026-07-01)
  [2026-06-15, ∞)
```

Application validation must reject overlap before persistence and return a user-facing error.

The existing PostgreSQL exclusion constraint remains the final integrity boundary. Prisma cannot express it. Do not recreate or drop it.

On update, overlap checks exclude the contract being edited.

### 8.4 Billing

| Field | Rule |
| --- | --- |
| `billingModel` | required; `HOURLY` or `DAILY` only |
| `rate` | required; `NUMERIC(19,4)` / Prisma `Decimal`; must be `> 0` |
| `currency` | required ISO-4217 alphabetic code; stored on the contract |
| `monthlyContractedMinutes` | optional; integer minutes; `null` means no monthly limit |
| `paymentTermsDays` | optional non-negative integer; pragmatic Net-N representation |
| `paymentTermsNote` | optional free text for non-standard language |

Do not implement billing calculation. OBD-001 (daily-rate semantics) and OBD-002 (rounding) remain open. Storing `DAILY` plus a positive rate is allowed; interpreting partial days is not this Epic.

Do not invent a payment-term catalog (OBD-010). Use the existing two fields.

Do not invent multi-currency conversion (OBD-011). Store the contract currency explicitly. The create form defaults to `Workspace.currency`.

Do not implement rollover/expiry (OBD-012).

### 8.5 Monthly contracted hours

The product language is hours. Persistence is `monthlyContractedMinutes` (EPIC-002).

Application conversion:

```text
hours → minutes = hours × 60
```

The converted value must be an integer number of minutes. Reject values that do not convert exactly.

Empty / omitted → `null` (no monthly limit). Reject `0` and negative minutes as invalid input. This is technical hygiene, not a resolution of BR-008 / OBD-012.

Display converts minutes back to hours for the form and detail views.

### 8.6 Historical correctness

`TimeEntry.contractId` is the durable association (`docs/storage.md` §8). A later sequential contract does not rebind earlier entries.

`TimeEntry` does **not** snapshot rate, billing model, currency, or payment terms. Editing those fields on a Contract changes the commercial record that existing TimeEntries would read.

Domain guidance (`docs/domain-model.md` §7.4): a new validity interval should normally represent a new contract rather than mutating historical conditions.

This Epic does not invent versioning. See §8.8 and proposed OBD-016.

### 8.7 Client relationship

Established:

- BR-005: archiving a client preserves historical contracts
- EPIC-101: clients are not deleted; archived clients remain readable
- EPIC-101: client archive does not inspect contracts
- proposed OBD-015: archived-client selectability for contracts was deferred

Not established as accepted product policy:

- whether a new contract may be created for an archived client
- whether an existing contract of an archived client remains editable
- whether client archive should be blocked when a current contract exists

**Implementation defaults until the Product Owner decides.** These do not close OBD-015 and do not add a MASTER_PLAN OBD.

| Situation | Default | Why |
| --- | --- | --- |
| Read contracts of an archived client | Allowed | BR-005 historical visibility |
| Create a contract for an archived client | Rejected (`ClientArchived`) | `docs/architecture.md` §24 lists `ClientArchived`; new commercial agreements attach to the operating set |
| Edit an existing contract of an archived client | Allowed | Same correction rationale EPIC-101 used for archived-client master-data edits |
| Client selector on create | ACTIVE clients only | Operating set; archived clients remain reachable through existing contracts |
| Client archive when contracts exist | Unchanged | Redesigning EPIC-101 archive is out of scope |

Preselect `clientId` from `/contracts/new?clientId=` only as a form convenience. Authorization is still workspace scope plus server-side Client lookup. Ignore the query if the client is missing, foreign, or archived.

### 8.8 Edit permissions

`MASTER_PLAN.md` says “edit contract where permitted.” Existing architecture does not define a mutation matrix.

| Field | After create |
| --- | --- |
| `id` | immutable |
| `workspaceId` | immutable; never writable from input |
| `clientId` | immutable |
| `validFrom` / `validTo` | editable; re-validate period and overlap |
| `billingModel` / `rate` / `currency` | editable |
| `monthlyContractedMinutes` | editable |
| `paymentTermsDays` / `paymentTermsNote` | editable |

No TimeEntry UI exists yet, so the historical-mutation risk is latent. Implementation default: allow commercial-field edits. Do not add snapshots. Record proposed OBD-016. Do not silently destroy the `TimeEntry.contractId` association; this Epic does not rewrite TimeEntries.

### 8.9 TimeEntry constraint inherited

F-P2-004 remains: `TimeEntry.contractId` is required, so non-billable work without a contract cannot be stored. This Epic must not redesign that. Applicability and TimeEntry recording belong to R1-E03.

---

## 9. Lifecycle

The current model does **not** establish a contract status/lifecycle enum. Do not invent `ACTIVE` / `ARCHIVED` / `CLOSED` for Contract.

Lifecycle is the validity interval plus derived applicability.

```text
create → persisted commercial interval
edit commercial fields / dates → same row, re-validated
set validTo → interval becomes bounded
leave validTo null → open-ended
```

There is no archive action, no unarchive, and no delete.

### 9.1 Derived applicability

Using the workspace calendar date `today` (workspace timezone, not server local time):

| Label | Rule |
| --- | --- |
| Scheduled | `validFrom > today` |
| Current | `validFrom <= today` and (`validTo` is null or `validTo > today`) |
| Ended | `validTo` is present and `validTo <= today` |

These labels are presentation only. They are not persisted and are not authorization.

F-033 “activation” is this derivation plus `findContractCoveringDate`. It is not a user-toggled status.

### 9.2 Closure

Closing a contract means setting `validTo`. That is an edit, not a separate lifecycle command.

### 9.3 History

“Contract history” means sequential non-overlapping contracts for one client (F-032), not an audit log. OBD-008 remains open.

---

## 10. Data Model / Persistence Impact

No Prisma schema change. No migration. No `db push`.

| Topic | Decision |
| --- | --- |
| New tables | None |
| New columns | None |
| New enums | None — `BillingModel` already exists |
| New indexes | None |
| Overlap | Existing `Contract_client_validity_no_overlap`; do not recreate |
| Rate CHECK | Existing `Contract_rate_positive`; do not recreate |
| `updateContract` | Application/repository only |
| `listContracts` | Application/repository only |
| Delete | Not added |
| `TimeEntry.contractId` | Remains required |

`UpdateContractInput` is new TypeScript only. It must not include `workspaceId` or `clientId`.

Existing composite FKs stay untouched. Do not weaken `onDelete: Restrict`.

If implementation discovers a proven schema defect, stop and document it. Do not “fix” F-P2-004 or add `MONTHLY_FIXED` as cleanup.

---

## 11. Workspace / Security Boundary

Every contract operation uses the server-resolved workspace:

```text
Better Auth session
  → getCurrentWorkspaceContext()
  → context.workspaceId
  → application service
  → ContractRepository(workspaceId, …)
  → ClientRepository(workspaceId, …) where ownership must be checked
```

Rules:

- never trust a form, path, query, or cookie `workspaceId` as authorization
- `contractId` and `clientId` in path/query/form are resource ids, not tenant grants
- `getContract(context.workspaceId, contractId)` returning `null` is not-found for both missing ids and foreign-workspace ids
- creating a contract for a client that is missing or belongs to another workspace is not-found / inaccessible
- do not reveal that a contract or client exists in another workspace
- any workspace member may create, view, and edit contracts; do not interpret `role` (OBD-009)
- non-members never reach `(app)` contract routes; application services still scope every query by `workspaceId`
- no client-side workspace store, switcher, or `WorkspaceProvider`

Identifier substitution must fail closed in integration tests (see §16).

---

## 12. Application Architecture

Follow the existing modular monolith:

```text
Server Action / RSC
  → application service
  → domain validation / errors
  → ContractRepository / ClientRepository ports
  → Prisma infrastructure
```

Server Actions and pages must not call Prisma.

### 12.1 Application operations

Place under `src/application/contracts/`:

| Operation | Behavior |
| --- | --- |
| `createContract` | validate → load client in workspace → reject archived client → overlap check → `repository.createContract` |
| `listContracts` | list by workspace |
| `listContractsForClient` | list by workspace + client; missing/foreign client → not-found |
| `getContract` | get by workspace + id; `null` → not-found |
| `updateContract` | validate → load contract → load client → overlap check excluding self → `repository.updateContract`; missing row → not-found |
| `getContractCoveringDate` | wrap `findContractCoveringDate` after client ownership check |

`workspaceId` comes from `WorkspaceContext`, not from the input DTO.

Single-row writes do not require a multi-repository transaction unless a later phase proves one is necessary. Overlap is checked in-process, then the database constraint enforces it.

Map `ConstraintViolationError` from the exclusion constraint to the same user-facing overlap error as application validation. Do not leak Prisma / SQL.

### 12.2 Validation style

Do **not** add Zod. Match client/workspace parse functions.

Reuse the existing ISO-4217 catalog used by workspace creation (`Intl.supportedValuesOf("currency")`). Do not invent a second currency source.

### 12.3 Errors

Add `src/domain/contract-errors.ts` (names may vary slightly):

- invalid field input
- invalid contract period
- overlapping contract
- contract not found in the authorized workspace
- client archived (create only, per §8.7)

Reuse `ClientNotFoundError` when the selected client is missing or foreign. Reuse `RecordNotFoundError` / `ConstraintViolationError` from persistence where the repository already throws them. Map to user-safe errors at the application/UI boundary.

### 12.4 Features

`src/features/contracts/` owns Server Actions, forms, and feature components. It may import application services, client read services, and UI primitives. It must not import Prisma or the Better Auth server instance except through existing session helpers already used by client/workspace actions.

Client detail may render a contracts section by calling contract application services. That is composition, not a Client/Contract merge.

### 12.5 Repository completion

`ContractRepository` remains the persistence port. Prisma stays in `src/infrastructure/persistence/contract-repository.ts`.

Phase 1 adds:

```text
listContracts(workspaceId): Promise<ContractRecord[]>
updateContract(workspaceId, contractId, input): Promise<ContractRecord>
```

Implementation rules:

- `updateMany` / `findFirst` scoped by `{ id, workspaceId }`
- zero rows → `RecordNotFoundError("Contract", contractId)`
- do not update `workspaceId` or `clientId`
- map through the existing `mapContract` helper
- `listContracts` is workspace-scoped; recommended order `validFrom` desc, then `createdAt` desc
- `listContractsForClient` keeps existing `validFrom` asc

Do not add `deleteContract`. Do not query `contract.findUnique({ where: { id } })` without `workspaceId`.

`create-first-workspace` unit stubs must gain the new port methods when the port changes.

---

## 13. Routes

Replace the `/contracts` placeholder. Keep `h1` text **Contracts** on the list.

| Route | Purpose |
| --- | --- |
| `/contracts` | workspace contract list with derived applicability labels |
| `/contracts/new` | create form; optional `?clientId=` preselect |
| `/contracts/[contractId]` | detail |
| `/contracts/[contractId]/edit` | edit form |

Unknown or foreign `contractId` → `(app)` `not-found`. Do not add a REST resource API.

No archived/closed query filter. There is no stored status. Historical visibility is the full list plus client-detail history.

Do not add `/contracts?status=`. That pattern is Client-specific.

### 13.1 Client surfaces

| Surface | Change |
| --- | --- |
| `/clients/[clientId]` | add contract history for that client; link to create when the client is ACTIVE |
| `/clients` list | unchanged — do not add an active-contract column in this Epic |

F-021 “active contract and current-period hours” remains incomplete. Hours belong to R1-E03. The active-contract list column is deferred to avoid redesigning the EPIC-101 client list. Client-detail history satisfies F-032 and the contract-history part of F-022.

### 13.2 Navigation

Keep the existing Contracts nav item. Do not add destinations. Nested contract routes already activate Contracts via `isNavigationItemActive`.

---

## 14. UI Behavior

### 14.1 Presentation

- `PageHeader` / `PageContent`
- `Card` for list items, detail sections, and client-detail history
- `Field` + `Input` + `Label` + `Alert` for forms
- native `<input type="date">` for validity dates
- native `<select>` for client and billing model
- `EmptyState`, `LoadingState`, `ErrorState`
- existing `Button`
- do not add shadcn Table, Dialog, Dropdown, DataTable, DatePicker, or a new Select primitive unless a later phase proves a Foundation primitive cannot do the job

### 14.2 List

Columns / fields for MVP:

- client company name
- derived applicability label (`Current` / `Scheduled` / `Ended`) as text, not color alone
- validity interval (`validFrom` → `validTo` or “Open-ended”)
- billing model
- rate + currency

No utilization, hours consumed, or alerts.

Empty list: `EmptyState` with a create action. If the workspace has no ACTIVE clients, the empty copy must send the user to create a client first.

### 14.3 Detail

Show:

- client name (link to `/clients/[clientId]`)
- derived applicability
- `validFrom` / `validTo` (open-ended when null)
- billing model
- rate and currency
- monthly contracted hours (from minutes)
- payment terms days and note
- created/updated if useful
- edit action

No delete. No archive confirmation. No time-entry or invoice sections.

### 14.4 Create / edit fields

| Field | Control |
| --- | --- |
| Client | native select of ACTIVE clients; locked/preselected when arriving from client detail; omitted/disabled on edit because `clientId` is immutable |
| Valid from | required date |
| Valid to | optional date; empty means open-ended |
| Billing model | `HOURLY` / `DAILY` |
| Rate | decimal input |
| Currency | ISO-4217; default workspace currency on create |
| Monthly contracted hours | optional decimal hours |
| Payment terms (days) | optional integer |
| Payment terms note | optional textarea |

Validation errors stay field-associated. Overlap and invalid period are form-level or field-associated, never raw constraint text.

### 14.5 Client detail history

On `/clients/[clientId]`, list that client’s contracts in existing repository order (`validFrom` asc). Each item links to contract detail. ACTIVE clients get a “New contract” action to `/contracts/new?clientId=`.

Do not add hours, revenue, or utilization panels.

### 14.6 Transport

- reads: RSC calling application services
- mutations: Server Actions in `src/features/contracts/`, same session pattern as client actions
- no SWR/React Query requirement for this Epic

---

## 15. Validation

Boundary validation before persistence.

| Field | Rule |
| --- | --- |
| `clientId` | required on create; UUID shape may be checked; must resolve to a workspace client; archived → `ClientArchived`; not accepted on update |
| `validFrom` | required calendar date `YYYY-MM-DD` |
| `validTo` | optional calendar date; empty → `null`; if present, must be `> validFrom` |
| `billingModel` | required; `HOURLY` or `DAILY` |
| `rate` | required; parse as decimal string; `> 0`; at most 4 decimal places; must fit `NUMERIC(19,4)`; do not silently round (OBD-002) |
| `currency` | required; trim; uppercase; must be in the workspace ISO-4217 catalog |
| `monthlyContractedHours` | optional; empty → `null`; if present, `hours × 60` must be a positive integer |
| `paymentTermsDays` | optional; empty → `null`; if present, integer `>= 0` |
| `paymentTermsNote` | optional; trim; empty → `null`; max 4000 |
| `workspaceId` | not accepted from the client |
| `id` | path id for update/get only; UUID shape may be checked; authorization is still workspace scope |

Overlap is a domain rule, not a field format rule. Check after the selected client is known.

Do not unique-check anything beyond the existing exclusion constraint.

---

## 16. State Behavior

| State | Behavior |
| --- | --- |
| Loading | `(app)/loading.tsx` already renders `LoadingState`. Contract pages may rely on it. Do not add a second global spinner system. |
| Empty contract list | `EmptyState` with create action, or create-client guidance when no ACTIVE clients exist |
| Empty client contract history | `EmptyState` that does not look like a product failure |
| Validation error | field-associated message via `Field`; form stays populated |
| Overlap / invalid period | user-safe message; form stays populated |
| Contract not found | `not-found` for GET; user-safe error for mutations |
| Unexpected server error | existing `(app)/error.tsx`; no Prisma / stack traces |
| Cross-workspace id | same as not found |
| Archived client on create | user-safe rejection; do not create |

Do not use color alone for applicability. Show the word Current, Scheduled, or Ended.

---

## 17. Testing Strategy

Use the existing pyramid. Do not add a framework.

| Level | Command | EPIC-102 use |
| --- | --- | --- |
| Unit | `pnpm test` | parse functions; interval/overlap rules; application services with fake repositories |
| Integration | `pnpm test:integration` | `updateContract` / `listContracts`; overlap; client ownership; workspace isolation |
| E2E | `pnpm test:e2e` | one authenticated contract journey; keep existing auth/onboarding/shell/client tests |

### 17.1 Unit

- valid create/update input
- missing `validFrom`
- `validTo <= validFrom` rejected
- open-ended `validTo` accepted
- invalid rate (`<= 0`, excess scale, non-numeric)
- billing model other than `HOURLY` / `DAILY` rejected
- monthly hours that do not convert to integer minutes rejected
- currency not in ISO-4217 rejected
- adjacent intervals accepted; overlapping intervals rejected
- boundary dates: `validTo` not included; `validFrom` included
- create for archived client rejected
- create ignores supplied `workspaceId`
- update cannot change `clientId`
- get/update of unknown id → not-found
- services call repositories with the context `workspaceId` only
- `ConstraintViolationError` maps to the overlap application error

Do not unit-test billing calculations (OBD-001 / OBD-002). Do not unit-test utilization (OBD-012).

### 17.2 Integration

- `updateContract` persists allowed fields and cannot change workspace or client
- `listContracts` never returns another workspace’s contracts
- get/update with a foreign `contractId` fails as not-found
- create with a foreign `clientId` fails as not-found / inaccessible
- identifier substitution cannot update a foreign contract
- application overlap rejection
- database exclusion still rejects overlapping inserts/updates
- adjacent and open-ended cases remain consistent with EPIC-002 tests
- existing persistence, auth, workspace, and client isolation tests remain green

Do not truncate the test database. Do not point tests at `freelance_os`.

Historical-correctness integration in this Epic:

- updating a contract does not rewrite `TimeEntry.contractId` rows (none are created by this UI)
- creating a later sequential contract leaves the earlier contract row unchanged
- `findContractCoveringDate` still resolves boundary dates after an update of an unrelated later contract

Full TimeEntry historical journeys belong to EPIC-103.

### 17.3 E2E

Reuse `tests/e2e/helpers/first-workspace.ts`.

One journey is enough:

```text
register → create workspace → create ACTIVE client
  → /contracts empty
  → create contract (client, validFrom, open-ended validTo, HOURLY, rate, currency)
  → see it on the list as Current
  → open detail
  → edit rate and set validTo
  → detail / list show the new values
  → create a second adjacent contract for the same client
  → both appear
  → overlapping create is rejected
```

Do not E2E every optional field or every validation message.

Preserve:

- `tests/e2e/app-shell.spec.ts` — `h1` “Clients” on `/clients`; list `h1` “Contracts” if that route is later asserted
- `tests/e2e/onboarding.spec.ts`
- `tests/e2e/auth.spec.ts`
- existing client journey

Do not add `/workspace-unavailable` E2E (G-004). Do not switch Playwright to `next start`. Do not add axe/jsdom/RTL.

---

## 18. Accessibility

Inherit the EPIC-006 / EPIC-101 baseline. Do not claim WCAG certification.

| Requirement | Expectation |
| --- | --- |
| Headings | list `h1` “Contracts”; create/edit/detail use a single `h1` |
| Labels | every control has an accessible name via `Field` / `Label` |
| Errors | associated with the control (`aria-invalid` / `aria-describedby`) |
| Keyboard | create, edit, list, and client-history links operable without a pointer |
| Focus | existing `focus-visible` tokens |
| Applicability / billing | text labels, not color alone |
| Skip link / shell | unchanged |
| Empty/error | text / `role="status"` or `role="alert"` as the primitives already do |

Manual UX review remains a later lifecycle stage.

---

## 19. Observability

OBD-008 remains open. This Epic does **not** add an audit log, activity feed, or change history.

No new metrics or tracing requirement. Persist `createdAt` / `updatedAt` only.

If a later audit decision requires actor identity, that is a future change. Do not add `createdBy` / `updatedBy` columns here.

Security rules inherited from EPIC-101:

- server-side authorization only
- no `workspaceId` from the browser as authority
- no Prisma on the client
- do not log session tokens or contract commercial data to application logs
- identical not-found for missing and foreign ids
- validate and bound inputs
- do not weaken production Better Auth rate limits
- do not add `UNIQUE(userId)` or otherwise “fix” F-004-001
- Server Actions must re-read the session; do not accept `userId` from the form

---

## 20. Phases

Four phases. One objective each. One commit each. New Cursor chat per phase.

Persistence already exists, so there is no schema-foundation phase.

```text
Phase 1 — Contract application services and repository completion
Phase 2 — Authenticated contract UI
Phase 3 — Isolation, integration, and E2E validation
Phase 4 — Documentation and Engineering Review
```

Phase IDs: P102-01 … P102-04.

No phase may start the next phase’s work.

---

## 21. Phase Details and Acceptance Criteria

### Phase 1 — Contract application services and repository completion

**Phase ID:** P102-01  
**Cursor chat:** NEW CHAT  
**Commit:** `feat(contracts): add contract application services`

**Entry conditions:** this plan accepted; no Phase 2 UI work.

**Objective**

Complete the application/domain boundary for workspace-scoped contract write/read, including the missing `updateContract` and workspace-wide `listContracts` persistence operations.

**Scope**

- `UpdateContractInput` and repository `updateContract` / `listContracts`
- parse functions for contract write input, dates, rate, currency, hours conversion, payment terms
- overlap / interval helpers
- application services in §12.1
- domain errors in §12.3
- unit tests in §17.1
- expand create-first-workspace repository stubs

**Likely files / modules**

- `src/domain/repositories.ts`
- `src/domain/persistence-types.ts`
- `src/domain/contract-errors.ts`
- `src/application/contracts/`
- `src/infrastructure/persistence/contract-repository.ts`
- `tests/unit/application/contracts/`
- `tests/unit/application/workspace/create-first-workspace.test.ts`

**Non-goals**

- routes, forms, Server Actions
- Playwright
- schema/migration
- TimeEntry services
- Client archive behavior changes

**Implementation constraints**

- no Zod
- no Prisma from application/domain
- no browser `workspaceId`
- `clientId` immutable on update
- archived client rejected on create
- overlap checked in application; existing SQL exclusion remains
- OBD-001–012 and inherited findings remain open

**Tests**

`pnpm test` for new/updated unit tests. Run `pnpm test:integration` only if the repository port change requires existing persistence tests to compile. Do not add the Phase 3 isolation/E2E suite here.

**Validation commands**

```text
pnpm test
pnpm lint
```

**Acceptance criteria**

- create/list/get/update/list-by-client/covering-date are testable without UI
- update cannot change workspace or client
- overlap and invalid periods fail in application code
- archived-client create fails
- no route or placeholder change
- OBD-001–012 and inherited findings remain open

**Expected outcome**

Application/domain/persistence completion only. `/contracts` remains a placeholder.

**Required final Cursor report**

Phase id, files changed, tests run (counts only), whether UI was touched (must be no), residual risks. Do not start Phase 2.

---

### Phase 2 — Authenticated contract UI

**Phase ID:** P102-02  
**Cursor chat:** NEW CHAT  
**Commit:** `feat(contracts): add authenticated contract management ui`

**Entry conditions:** Phase 1 complete.

**Objective**

Replace the `/contracts` placeholder with authenticated list, detail, create, and edit flows, and add contract history on client detail.

**Scope**

- routes in §13
- Server Actions calling Phase 1 services after `getCurrentWorkspaceContext()` / session checks
- forms and feature components in `src/features/contracts/`
- client-detail contract history
- empty / validation / not-found states
- browser verification of the main flows

**Likely files / modules**

- `src/app/(app)/contracts/`
- `src/features/contracts/`
- `src/app/(app)/clients/[clientId]/page.tsx`
- `src/features/clients/ClientDetail.tsx` only as needed for history composition

**Reuse**

Phase 1 services; EPIC-006 primitives; EPIC-101 session/loader patterns; `getCurrentWorkspaceContext`; `getServerAuthSession`; `getAuthorizedWorkspace` for currency/timezone.

**Non-goals**

- Playwright expansion (Phase 3)
- client-list redesign
- dashboard / time tracking
- new UI libraries
- schema changes

**Implementation constraints**

- list `h1` remains “Contracts”
- client `h1` behavior on `/clients` remains “Clients”
- no Dialog/Table/DatePicker library
- no Prisma in features/pages
- create requires an ACTIVE client
- edit does not offer client reassignment
- verify in the browser: create, list, detail, edit, client history, empty list, validation error, overlap error, unknown id
- existing shell E2E selectors that depend on `h1` “Clients” must still be true after this phase even if the full E2E suite is Phase 3’s gate

**Tests**

None beyond keeping unit/integration from Phase 1 green if touched. Do not add jsdom. Playwright belongs to Phase 3.

**Validation commands**

```text
pnpm lint
pnpm test
```

plus browser verification of the flows in §14.

**Acceptance criteria**

- `/contracts` is no longer a placeholder
- a member can create, view, and edit a contract
- client detail shows that client’s contracts
- archived clients are not selectable for create
- unknown/foreign contract ids render not-found
- AppShell is unchanged

**Expected outcome**

Authenticated Contract Management UI on the existing shell.

**Required final Cursor report**

Routes added, browser flows verified, leftover placeholder risk, confirmation that Playwright was not expanded here. Do not start Phase 3.

---

### Phase 3 — Isolation, integration, and E2E validation

**Phase ID:** P102-03  
**Cursor chat:** NEW CHAT  
**Commit:** `test(contracts): cover isolation and contract journeys`

**Entry conditions:** Phase 2 complete.

**Objective**

Prove workspace isolation, client/contract ownership, overlap enforcement, and the core user journey under the existing CI contract.

**Scope**

- integration tests in §17.2
- one Playwright journey in §17.3
- adjust existing E2E only if a Phase 2 UI detail breaks a documented assertion (prefer keeping `h1` “Clients” and `h1` “Contracts”)

**Likely files / modules**

- `tests/integration/application/contracts/` or persistence tests extended for `updateContract` / `listContracts`
- `tests/e2e/contracts.spec.ts`
- existing E2E helpers only if reuse requires a small extension

**Reuse**

Phase 1–2; `TEST_DATABASE_URL`; first-workspace E2E helper; EPIC-005 CI contract.

**Non-goals**

- changing CI workers, `next start`, or database isolation
- `/workspace-unavailable` E2E
- axe / jsdom / RTL
- closing inherited findings
- TimeEntry journeys

**Implementation constraints**

- isolation tests must attempt read/update of a foreign contract and expect denial/not-found
- isolation tests must attempt create with a foreign `clientId` and expect denial/not-found
- overlap must be proven at application and database levels
- do not truncate
- do not point E2E at `freelance_os`
- run E2E with the locked CI contract when asserting the suite (`CI=true`, one worker)

**Tests**

```text
pnpm test
pnpm test:integration
CI=true pnpm test:e2e
```

**Validation commands**

The three commands above, plus `pnpm lint`.

**Acceptance criteria**

- foreign identifiers are inaccessible
- overlap cannot be persisted
- the create → edit → sequential second contract journey passes
- existing auth, onboarding, shell, and client journeys remain green
- CI conventions unchanged

**Expected outcome**

Isolation and journey evidence sufficient for Engineering Review.

**Required final Cursor report**

Test counts (unit / integration / e2e), failures if any, confirmation that CI conventions were not changed. Do not start Phase 4 implementation of product code.

---

### Phase 4 — Documentation and Engineering Review

**Phase ID:** P102-04  
**Cursor chat:** NEW CHAT  
**Commit:** `docs: complete EPIC-102 engineering review`

**Entry conditions:** Phases 1–3 complete.

**Objective**

Synchronize affected documentation with implemented reality and produce the Engineering Review. This is **not** Production Certification.

**Scope**

Create `docs/epics/EPIC-102/engineering-review.md` and update only documents that this Epic actually changed:

- `MASTER_PLAN.md` — current phase, R1-E02 status, next work R1-E03
- `docs/architecture.md` — contracts module implemented; `/contracts` product surface
- `docs/testing-strategy.md` — contract unit/integration/E2E evidence
- `docs/storage.md` — only if repository operations/docs now mismatch reality
- `docs/domain-model.md` — only if implemented defaults must be recorded without closing OBDs
- `README.md` / `CHANGELOG.md` — status / unreleased notes
- this plan’s status block

**Non-goals**

- application, schema, or test-architecture changes
- closing OBDs or prior findings
- promoting proposed OBDs into the MASTER_PLAN table unless the Product Owner already accepted them
- production validation/certification
- UX review document

**Implementation constraints**

Documentation describes what was implemented. Do not describe planned behavior as done if a phase skipped it.

**Tests**

None new. Cite Phase 3 evidence. Re-run gates if the review asserts them.

**Validation commands**

Re-run Phase 3 gates only if the review claims they pass.

**Acceptance criteria**

- documents no longer describe `/contracts` as a placeholder
- Engineering Review exists and does not claim production readiness
- MASTER_PLAN next epic is Time Tracking
- OBD-001–012 remain open
- inherited findings remain open
- proposed OBD-016 is not silently treated as accepted product policy

**Expected outcome**

Engineering Complete for Contract Management, not Production Certified.

**Required final Cursor report**

Review verdict, documents updated, production-readiness statement (NO), next recommended step (engineering review already in-document; next Epic only if verdict is PASS / PASS WITH FINDINGS).

---

## 22. Commit Messages

```text
Release 1
  → EPIC-102
    → planning commit
    → Phase 1 commit
    → Phase 2 commit
    → Phase 3 commit
    → Phase 4 commit
```

One phase = one commit. Planning is this documentation commit only.

| Step | Commit |
| --- | --- |
| Planning | `docs: establish EPIC-102 contracts plan` |
| P102-01 | `feat(contracts): add contract application services` |
| P102-02 | `feat(contracts): add authenticated contract management ui` |
| P102-03 | `test(contracts): cover isolation and contract journeys` |
| P102-04 | `docs: complete EPIC-102 engineering review` |

Do not combine phases. Do not implement during planning.

---

## 23. Engineering Review Requirements

A plan review is required **before Phase 1**.

An implementation Engineering Review is required in **Phase 4** as `docs/epics/EPIC-102/engineering-review.md`.

The Phase 4 review must assess:

- architecture
- domain correctness (`[validFrom, validTo)`, overlap, Client ≠ Contract)
- persistence (no unjustified schema drift; exclusion constraint still present)
- security / workspace isolation
- Client/Contract ownership integrity
- historical correctness treatment and remaining risk
- testing
- UX / accessibility baseline (not certification)
- documentation synchronization
- inherited findings
- new findings
- production readiness = NO

Verdict vocabulary: `PASS` / `PASS WITH FINDINGS` / `FAIL`.

Engineering Complete is **not** Production Certified.

Production validation/certification is outside this Epic.

---

## 24. Documentation Synchronization

| When | What |
| --- | --- |
| Planning | this file only |
| Phases 1–3 | no canonical doc rewrite |
| Phase 4 | `MASTER_PLAN.md`, architecture, testing strategy, storage/domain only if affected, README/CHANGELOG as needed, this plan status, engineering review |

`MASTER_PLAN.md` §49 updates after Epic completion and change of next work. That happens in Phase 4, not now.

Do not create extra planning or issue-explanation documents.

Do not write proposed OBDs into `MASTER_PLAN.md` unless the Product Owner accepts them.

---

## 25. Findings / Inherited Findings

Carry forward. Do not silently close.

| ID | Item | Disposition |
| --- | --- | --- |
| F-004-001 | Concurrent first-workspace creation can yield two memberships | Open. Out of scope. |
| EPIC-003 F-001 | Google/email implicit linking requires `emailVerified` | Open. Out of scope. |
| EPIC-003 F-002 | Full Google consent/callback not in CI | Open. Out of scope. |
| EPIC-003 F-003 | Production password-reset email provider unset | Open. Out of scope. |
| EPIC-003 F-004 | Playwright CI = `pnpm dev` + 1 worker | Preserve. |
| G-004 | No Playwright `/workspace-unavailable` journey | Accepted. |
| G-006 | Lint is the CI style gate; no `format:check` | Accepted. |
| G-002 | E2E uses unique emails; no truncate framework | Accepted. |
| EPIC-002 F-P3-002 | Alert client/contract pair not proven by the database | Open. Out of scope. |
| EPIC-002 F-P2-003 | `Notification.type` remains `String` | Open. Out of scope. |
| EPIC-002 F-P2-004 | `TimeEntry.contractId` is required; non-billable entries without a contract cannot be stored | Open. Do not redesign. |
| EPIC-002 F-P2-005 | Role enum is `OWNER` / `MEMBER` only | Open. Continues as OBD-009. |

EPIC-101 proposed OBD-013 / OBD-014 / OBD-015 remain proposed, not accepted MASTER_PLAN decisions.

EPIC-102 planning observations (not prior defects):

| ID | Item | Disposition |
| --- | --- | --- |
| P102-G-001 | `Contract` persistence, exclusion constraint, and create/get/list-for-client already exist | Do not recreate. Add `updateContract` and `listContracts` only. |
| P102-G-002 | `ContractRepository` has no update or workspace-wide list | Close in Phase 1. |
| P102-G-003 | No `Contract.status` exists | Do not invent one. Use derived applicability. |
| P102-F-001 | `TimeEntry` stores `contractId`, not a commercial snapshot. Editing rate / billing model / validity can change historical billing meaning if TimeEntries exist | Open finding. Proposed OBD-016. Implementation default: allow edit, do not version. |
| P102-R-001 | Replacing `/contracts` could affect future shell assertions | Keep `h1` “Contracts”. |
| P102-R-002 | Adding uniqueness, `MONTHLY_FIXED`, or a status enum “to be safe” would invent product policy | Forbidden. |
| P102-R-003 | Blocking Client archive when contracts exist would redesign EPIC-101 | Forbidden. |
| P102-R-004 | Adding Dialog/Table/DatePicker would expand the UI foundation | Forbidden unless a later phase proves necessity. |
| P102-R-005 | Query `clientId` on `/contracts/new` could be mistaken for authorization | Treat as form preselect only; server still resolves workspace and client. |

No Blocker identified at planning time.

---

## 26. Open Decisions / OBD Candidates

Preserve all MASTER_PLAN OBDs. This Epic must not resolve them.

| ID | Decision | Affects EPIC-102? | Blocks EPIC-102? |
| --- | --- | --- | --- |
| OBD-001 | Daily-rate semantics / partial days | Yes — `DAILY` is stored, not calculated | No |
| OBD-002 | Monetary rounding | Yes — rate stored as `NUMERIC(19,4)`; no rounding policy | No |
| OBD-003 | Midnight-crossing entries | No | No |
| OBD-004 | Holiday model | No | No |
| OBD-005 | Vacation/absence model | No | No |
| OBD-006 | Capacity warning threshold | No | No |
| OBD-007 | Post-closure edits/deletes | No | No |
| OBD-008 | Audit requirements | Yes — no audit log | No |
| OBD-009 | Workspace roles | Yes — any member may manage contracts | No |
| OBD-010 | Payment-term catalog | Yes — use existing days + note fields | No |
| OBD-011 | Multi-currency | Yes — store ISO-4217; default workspace currency; no conversion | No |
| OBD-012 | Contract-hour rollover/expiry | Yes — store minutes only; no utilization | No |

### Proposed new / applied OBDs

Do not write these into `MASTER_PLAN.md` unless the Product Owner accepts them.

| Proposed ID | Question | Why it is not silently decided |
| --- | --- | --- |
| OBD-015 | Archived-client operations: editability, unarchive, and selectability for contracts and time entries | EPIC-101 deferred selection. This Epic applies a temporary create/read/edit default in §8.7. |
| OBD-016 | Whether commercial fields of a Contract may change after TimeEntries exist, or whether a new interval/version is required | BR-003 / §7.4 require historical meaning. Persistence snapshots only `contractId`, not rate. Versioning would be a new design. |

Implementation defaults while those remain open are in §8. They are temporary and must stay labeled as such in the Phase 4 review.

### Evaluated and not created as new OBDs

| Candidate | Why no new OBD |
| --- | --- |
| Contract status / archive lifecycle | Schema and domain already use validity intervals, not a status enum |
| Open-ended contracts | `validTo` nullable is already specified |
| `[validFrom, validTo)` overlap | Already specified and enforced in SQL |
| `MONTHLY_FIXED` | Explicitly deferred by product vision; not in schema |
| Payment-term catalog shape | Already OBD-010; storage already has days + note |
| Currency default | Storage already says store contract currency and use workspace default |
| Hours vs minutes | Storage already uses minutes; application conversion is technical |
| Client archive blocked by current contracts | Would redesign EPIC-101; record as out of scope, not a new OBD |
| Role-specific contract permissions | Already OBD-009 |
| Audit of contract edits | Already OBD-008 |
| F-021 active-contract column on client list | Deferred display; not a domain decision |
| Physical delete | Already rejected by Restrict FKs and BR-011 |

---

## 27. Exit Criteria

EPIC-102 is engineering-complete when:

1. A workspace member can create, view, and edit contracts in the authorized workspace.
2. Contracts remain distinct from clients and belong to exactly one client.
3. Validity uses `[validFrom, validTo)` with required `validFrom` and optional open-ended `validTo`.
4. Overlap for the same client is rejected by application validation and the existing exclusion constraint.
5. Billing models are only `HOURLY` and `DAILY`.
6. Rate, currency, optional monthly contracted hours, and pragmatic payment terms can be stored.
7. Browser-supplied `workspaceId` cannot authorize access.
8. Foreign-workspace contract or client ids cannot be read or mutated.
9. No Prisma schema or migration change was required, except if engineering review later forces a documented exception.
10. `/contracts` is a product surface; list `h1` remains “Contracts”.
11. Client archive behavior was not redesigned.
12. F-P2-004 was not “fixed” by making `TimeEntry.contractId` optional.
13. Unit, integration, and the contract E2E journey pass under existing CI rules.
14. Inherited findings and OBD-001 through OBD-012 remain open.
15. `docs/epics/EPIC-102/engineering-review.md` exists after Phase 4.
16. Production readiness is not claimed.

---

## 28. Production Readiness Statement

```text
EPIC-102 engineering completion
        ≠
production validation
        ≠
production certification
        ≠
READY FOR RELEASE
```

Completing this Epic does **not** grant production readiness.

---

## 29. Implementation Order

```text
Planning (this document)
        ↓
Engineering review of the plan
        ↓
P102-01 Contract application services and repository completion
        ↓
P102-02 Authenticated contract UI
        ↓
P102-03 Isolation, integration, and E2E validation
        ↓
P102-04 Documentation and Engineering Review
        ↓
R1-E03 — Time Tracking
```

Each implementation phase: new Cursor chat, one commit, no later-phase work.

---

## 30. Cursor Chat Protocol

Every new Cursor chat starts from zero context.

For each phase, read:

```text
MASTER_PLAN.md
docs/epics/EPIC-102/epic-plan.md
docs/architecture.md
docs/storage.md
docs/epics/EPIC-101/engineering-review.md
```

plus the files named in that phase. Do not implement later phases in the same chat.

---

## 31. Source of Truth

Implementation must follow these documents in priority order:

1. `MASTER_PLAN.md`
2. `docs/architecture.md`
3. `docs/storage.md`
4. `docs/product-vision.md`
5. `docs/domain-model.md`
6. `docs/testing-strategy.md`
7. this Epic Plan
8. `docs/epics/EPIC-101/epic-plan.md` and `docs/epics/EPIC-101/engineering-review.md` for Client Management inheritance
9. `docs/epics/EPIC-006/epic-plan.md` and `docs/epics/EPIC-006/engineering-review.md` for UI/testing inheritance
10. `docs/epics/EPIC-004/engineering-review.md` for workspace authorization
11. `docs/epics/EPIC-002/engineering-review.md` for persistence invariants

If sources conflict, do not silently pick. Record the conflict; prefer not expanding MVP scope.

Known source discrepancies:

| Source | Discrepancy | Resolution for this Epic |
| --- | --- | --- |
| F-021 / F-022 | Client list/detail include active contract, hours, and billing summary | Hours/billing remain R1-E03 / later. Client detail gets contract history only. Client list is unchanged. |
| F-033 | “Contract activation” | Derived applicability + `findContractCoveringDate`. No stored status. TimeEntry recording is R1-E03. |
| `docs/architecture.md` §6 | `getActiveContract()` | Application wrapper around existing `findContractCoveringDate`. |
| `docs/architecture.md` §7 | `ContractApplicabilityService` | Interval/overlap helpers in application/domain are enough. Do not build TimeEntry resolution here. |
| `docs/architecture.md` | Zod is a candidate | Repository uses parse functions and does not depend on Zod. Do not add Zod. |
| `docs/architecture.md` §14.2 | `src/features/contracts` is future work | Phase 2 creates that folder. |
| `MASTER_PLAN.md` R1-E02 | “contract history” | Sequential contracts and client-detail history, not an audit log. |
| Product vision F-031 | `MONTHLY_FIXED` may be reserved | Not in schema. Do not add it. |
| OBD-015 | Archived-client selection deferred | Temporary defaults in §8.7. |

---

## 32. Final Planning Gate

This planning document is complete when:

- [x] Epic identity is EPIC-102 — Contracts (R1-E02)
- [x] Status is planning-complete, implementation not started
- [x] Objective matches MASTER_PLAN Contract Management
- [x] Dependencies include completed Foundation Epics and EPIC-101
- [x] Current repository context is recorded
- [x] Scope and non-goals do not conflict
- [x] Client and Contract stay distinct
- [x] Client Management archive/delete rules are preserved
- [x] Data model impact is no schema/migration
- [x] Validity `[validFrom, validTo)` and open-ended `validTo` are explicit
- [x] Overlap prevention is explicit at application and database levels
- [x] Historical correctness is explicitly considered
- [x] Billing models are constrained to `HOURLY` / `DAILY`
- [x] Authorization uses existing workspace context
- [x] Unresolved product decisions are mapped to OBDs or proposed OBDs
- [x] Phases are independently executable
- [x] Each phase has one commit and a NEW CHAT
- [x] Phase 4 is Engineering Review, not Production Certification
- [x] Production readiness is explicitly denied
- [x] No application code, Prisma schema, or migration is changed by planning

Stop. Wait for engineering review. Do not start Phase 1 in this chat.
