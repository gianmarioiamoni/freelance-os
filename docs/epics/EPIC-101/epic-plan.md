# EPIC-101 — Clients

## 1. Epic Identity

**Epic:** EPIC-101  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E01 — Client Management  
**Objective:** Clients  
**Status:** COMPLETE — PASS  
**Depends on:** EPIC-002 — Database & Persistence; EPIC-003 — Authentication; EPIC-004 — Workspace; EPIC-005 — Testing & CI Foundation; EPIC-006 — UI Foundation  
**Next Epic:** Contract Management (`MASTER_PLAN.md` §12 R1-E02)  
**Canonical sources:** `MASTER_PLAN.md` §11 R1-E01; `docs/product-vision.md` F-020–F-024; `docs/domain-model.md` §3.3 / §4.1 / BR-005; `docs/storage.md` §6 / §19

```text
PLANNING COMPLETE
IMPLEMENTATION COMPLETE
ENGINEERING REVIEW: PASS
PRODUCTION READINESS: NO
READY FOR R1-E02
```

Reviewed commits:

```text
d54b353f6ae55e0b122720f38bb98fe8c317f557
feat(clients): add client application services

3206d5245f6766cec5027b8da5ed4e446beb1275
feat(clients): add authenticated client management ui

bd181de83e2c9d496ec67d7d891c58ee78f1e6dc
test(clients): cover isolation and client journeys
```

Phase 4 is documentation and Engineering Review only. Review:
`docs/epics/EPIC-101/engineering-review.md`.

Do not invent EPIC-007. Do not treat this Epic as a persistence redesign. Client persistence already exists from EPIC-002.

This document is the only planning artifact for EPIC-101. Do not create additional planning files.

---

## 2. Status

```text
PLANNING COMPLETE
IMPLEMENTATION COMPLETE
ENGINEERING REVIEW: PASS
PRODUCTION READINESS: NO
```

Phases 1–3 implemented client application services, authenticated UI, isolation tests, and the client E2E journey. Phase 4 synchronized canonical documentation and recorded the Engineering Review.

This document remains the historical plan. Scope decisions, non-goals, proposed OBDs, and inherited findings are unchanged.

`MASTER_PLAN.md` is synchronized in Phase 4 with implemented reality. Production validation/certification has not occurred.

---

## 3. Objective

Introduce workspace-scoped client/customer master-data management so later product Epics can attach contracts and time entries to a stable customer identity.

From `MASTER_PLAN.md` R1-E01, this Epic establishes:

- create client
- edit client
- list clients
- client detail
- archive client
- historical visibility for archived clients
- client search/filter only where this plan justifies it for MVP

Product outcomes from `docs/product-vision.md`:

- **F-020** — create client master data
- **F-021** — client list, limited to fields this Epic can truthfully show
- **F-022** — client detail, limited to master data this Epic owns
- **F-023** — edit client master data
- **F-024** — archive rather than delete

`Client` is customer identity. `Contract` is commercial conditions over time. This Epic must not merge them.

A member can create and maintain clients in the authorized workspace without bypassing workspace isolation.

This Epic does **not** grant production readiness.

---

## 4. Dependencies

| Dependency | Status | Role for this Epic |
| --- | --- | --- |
| EPIC-002 | Complete — PASS WITH FINDINGS | `Client` model, indexes, `ClientRepository`, isolation tests |
| EPIC-003 | Complete — PASS WITH FINDINGS | Better Auth session; protected `(app)` boundary |
| EPIC-004 | Complete — PASS WITH FINDINGS | `WorkspaceContext`, `getCurrentWorkspaceContext()`, membership isolation |
| EPIC-005 | Complete — PASS | Vitest, isolated PostgreSQL, Playwright, CI gates |
| EPIC-006 | Complete — PASS | AppShell, Field/Input/Label/Card/Alert, page/state primitives, `/clients` placeholder |
| `getCurrentWorkspaceContext()` | Implemented | Trusted workspace id for every client operation |
| `getServerAuthSession()` | Implemented | Trusted user id for Server Actions |
| `ClientRepository` | Implemented except `updateClient` | Persistence port; Phase 1 adds update |
| `createRepositories()` / `runInTransaction()` | Implemented | Infrastructure wiring |

Do not add a new authorization API. Do not add a client-side workspace store.

---

## 5. Current Architecture / Context

Inspected: `MASTER_PLAN.md`, `docs/product-vision.md`, `docs/domain-model.md`, `docs/architecture.md`, `docs/storage.md`, `docs/testing-strategy.md`, EPIC-006 plan and engineering review, `prisma/schema.prisma`, existing workspace/auth/UI/persistence code, existing tests, `README.md`, `CHANGELOG.md`.

### 5.1 Already implemented — do not rebuild

**Persistence**

- Prisma `Client` with `companyName`, optional `vatNumber`, `taxCode`, `address`, `contactName`, `email`, `phone`, `notes`, required `status` (`ACTIVE` / `ARCHIVED`), timestamps
- `@@unique([workspaceId, id])`, indexes `(workspaceId, status)` and `(workspaceId, companyName)`
- No uniqueness on company name, VAT, or tax code
- Composite FKs from `Contract` and `TimeEntry` already require `Client(workspaceId, id)`
- `ClientRepository`: `createClient`, `getClient`, `listClients(workspaceId, status?)`, `archiveClient`
- `listClients` already orders by `companyName` ascending
- `createClient` defaults `status` to `ACTIVE`
- No `updateClient` port
- No physical `deleteClient`
- Persistence integration already covers create, list-by-status, archive, and cross-workspace `getClient` / `listClients` isolation

**Authorization**

- `(app)` layout calls `getCurrentWorkspaceContext()`
- Workspace id comes from session membership, never from the browser
- Path/query `workspaceId` is not authorization
- `WorkspaceMember.role` is persist-and-attach only (OBD-009)

**UI**

- `/clients` is a placeholder with stable `h1` “Clients”
- Navigation already includes Clients; `isNavigationItemActive` treats `/clients/*` as active
- Playwright shell journey asserts that `h1` and must remain green
- Auth/onboarding E2E only asserts `/clients` redirects, not placeholder copy

**Testing / CI**

- Unit: Vitest Node. No jsdom / RTL / axe
- Integration: isolated `TEST_DATABASE_URL`, migrate-only, no `db push`, no truncation framework
- Playwright: `TEST_DATABASE_URL`, unique emails, CI = `pnpm dev` + one worker (EPIC-003 F-004)
- Zod is documented as a candidate and is **not** a dependency. Workspace validation uses parse functions.

**Gaps this Epic closes**

- `updateClient` persistence operation
- client application services and input validation
- authenticated list / detail / create / edit / archive UI
- application-level isolation and one client E2E journey
- documentation that `/clients` is a product surface, not a placeholder

---

## 6. Scope

### In scope

- workspace-scoped client create, read, update, list, and archive
- `updateClient` on the existing repository port and Prisma implementation
- application services that accept only server-resolved `WorkspaceContext`
- boundary validation of user-controlled client fields
- authenticated UI at `/clients` and nested client routes
- default list of `ACTIVE` clients, plus a way to view `ARCHIVED` clients
- empty, loading, and error states using EPIC-006 primitives
- Server Actions for mutations; server-rendered reads
- unit, integration, and targeted E2E coverage described in §16
- Phase 4 documentation sync and `docs/epics/EPIC-101/engineering-review.md`

### Out of scope

See §7.

---

## 7. Explicit Non-Goals

Do not implement:

- contract create/edit/list/history, billing model, rates, validity, or overlap rules
- time entries, timesheets, hours, utilization, or billing summaries on the client list or detail
- F-021 “active contract and current-period hours”
- F-022 “active contract, contract history, hours and billing summary”
- merging Client and Contract
- physical client deletion
- Prisma schema redesign, new Client columns, uniqueness migrations, or `db push`
- VAT / tax-code country format engines
- structured address parts (street, city, postal code, country)
- multiple contacts per client
- free-text search, user-controlled sort, pagination, or saved views
- client import/export, tags, attachments, or activity timeline
- unarchive / restore, unless a later OBD forces it into a later Epic
- OWNER vs MEMBER permission differences (OBD-009)
- audit log (OBD-008)
- invitations, workspace switcher, or a client `WorkspaceProvider`
- redesign of Better Auth, workspace resolution, or CI
- jsdom, React Testing Library, `@axe-core/playwright`, a second test database strategy, or test truncation
- fixing EPIC-002 / EPIC-003 / EPIC-004 findings or G-004
- closing OBD-001 through OBD-012
- production validation, UX review, or production certification
- `engineering-review.md` before Phase 4
- `qa-report.md`, `ux-review.md`, or `production-validation.md`

---

## 8. Domain Behavior

`Client` identifies **who** the customer is. `Contract` identifies **how** the relationship is commercially governed. `TimeEntry` will later reference both. Historical correctness depends on this split (`docs/domain-model.md` §4.1, BR-005, BR-012).

### 8.1 Lifecycle

```text
create → ACTIVE
edit master data → remains current status
archive → ARCHIVED
```

Archive is the normal lifecycle end. It is not deletion. Historical contracts, time entries, alerts, and reports that later Epics add must remain attachable to the same `Client.id`.

### 8.2 Create

- `companyName` is required after trim
- optional fields may be omitted
- status is always `ACTIVE`
- ignore any client-supplied `status` or `workspaceId`

### 8.3 Edit

- master-data fields may change
- `id` and `workspaceId` never change
- status does not change through edit
- archived clients remain readable; whether they remain editable is proposed OBD-015
- **Implementation default until OBD-015 is decided:** archived clients may be edited so identity corrections remain possible. This does not close OBD-015.

### 8.4 Archive

- `ACTIVE` → `ARCHIVED` via `archiveClient` only
- idempotent archive of an already archived client is acceptable (result remains `ARCHIVED`)
- no unarchive in this Epic
- archived clients remain in the workspace and appear when the archived view is requested

### 8.5 List

- default: `ACTIVE`, ordered by `companyName` ascending (existing repository behavior)
- archived view: `listClients(workspaceId, "ARCHIVED")`
- “all statuses” is unnecessary for MVP if both views exist
- no search box

### 8.6 Future workflows

Contracts and time entries are not implemented here. This Epic must not invent selection rules for archived clients in those workflows. That is proposed OBD-015.

Do not render empty contract/hours panels that imply those features exist.

### 8.7 Duplicates

The database does not unique-constrain company name, VAT, or tax code. Duplicate policy is proposed OBD-013. **Implementation default:** allow duplicates. Do not add a uniqueness migration to “be safe.”

---

## 9. Data Model Impact

No Prisma schema change. No migration. No `db push`.

| Topic | Decision |
| --- | --- |
| New tables | None |
| New columns | None |
| New enums | None — `ClientStatus` exists |
| New indexes | None — `(workspaceId, vatNumber)` stays a later candidate (`docs/storage.md`) |
| Uniqueness | None added |
| `updateClient` | Application/repository only; updates existing nullable/required columns |
| Delete | Not added |

`UpdateClientInput` is new TypeScript only. It must not include `workspaceId` or `status`.

Existing composite FKs stay untouched. Do not weaken `onDelete: Restrict`.

---

## 10. Authorization / Workspace Isolation

Every client operation uses the server-resolved workspace:

```text
Better Auth session
  → getCurrentWorkspaceContext()
  → context.workspaceId
  → application service
  → ClientRepository(workspaceId, …)
```

Rules:

- never trust a form, path, query, or cookie `workspaceId` as authorization
- `clientId` in the path is a resource id, not a tenant grant
- `getClient(context.workspaceId, clientId)` returning `null` is not-found for both missing ids and foreign-workspace ids
- do not reveal that a client exists in another workspace
- any workspace member may create, view, edit, and archive clients; do not interpret `role`
- non-members never reach `(app)` client routes; application services still scope every query by `workspaceId`
- no client-side workspace store, switcher, or `WorkspaceProvider`

Identifier substitution must fail closed in integration tests (see §16).

---

## 11. Application / Service Boundaries

Follow the existing modular monolith:

```text
Server Action / RSC
  → application service
  → domain validation / errors
  → ClientRepository port
  → Prisma infrastructure
```

Server Actions and pages must not call Prisma.

### 11.1 Application operations

Place under `src/application/clients/`:

| Operation | Behavior |
| --- | --- |
| `createClient` | validate → `repository.createClient(workspaceId, input)` with implicit ACTIVE |
| `listClients` | list by workspace and optional status |
| `getClient` | get by workspace + id; `null` → not-found error |
| `updateClient` | validate → `repository.updateClient`; missing row → not-found |
| `archiveClient` | `repository.archiveClient`; missing row → not-found |

`workspaceId` comes from `WorkspaceContext`, not from the input DTO.

Single-row writes do not require a multi-repository transaction. Do not invent ceremony.

### 11.2 Validation style

Do **not** add Zod. Match workspace parse functions (`parseWorkspaceCreationInput`).

### 11.3 Errors

Add `src/domain/client-errors.ts` (names may vary slightly):

- invalid field input
- client not found in the authorized workspace

Reuse `RecordNotFoundError` from persistence where the repository already throws it. Map to a user-safe not-found at the application/UI boundary. Do not leak Prisma errors.

### 11.4 Features

`src/features/clients/` owns Server Actions, forms, and feature components. It may import application services and UI primitives. It must not import Prisma or the Better Auth server instance except through existing session helpers already used by workspace actions.

---

## 12. Repository / Persistence Boundaries

`ClientRepository` remains the persistence port. Prisma stays in `src/infrastructure/persistence/client-repository.ts`.

Phase 1 adds:

```text
updateClient(workspaceId, clientId, input): Promise<ClientRecord>
```

Implementation rules:

- `updateMany` / `findFirst` scoped by `{ id, workspaceId }` (same pattern as `archiveClient`)
- zero rows → `RecordNotFoundError("Client", clientId)`
- do not update `workspaceId` or `status`
- map through the existing `mapClient` helper

Do not add `deleteClient`. Do not query `client.findUnique({ where: { id } })` without `workspaceId`.

Existing `createClient`, `getClient`, `listClients`, and `archiveClient` stay. Expand them only if a proven bug appears.

`create-first-workspace` unit stubs must gain `updateClient` when the port changes.

---

## 13. UI Architecture and Routes

Replace the `/clients` placeholder. Keep `h1` text **Clients** on the list so `tests/e2e/app-shell.spec.ts` stays valid.

### 13.1 Routes

| Route | Purpose |
| --- | --- |
| `/clients` | ACTIVE list; control to open archived view |
| `/clients?status=archived` | ARCHIVED list (filter only, not authorization) |
| `/clients/new` | create form |
| `/clients/[clientId]` | detail |
| `/clients/[clientId]/edit` | edit form |

Unknown or foreign `clientId` → `(app)` `not-found`. Do not add a REST resource API.

### 13.2 Presentation

- `PageHeader` / `PageContent`
- `Card` for list items and detail sections
- `Field` + `Input` + `Label` + `Alert` for forms
- `EmptyState`, `LoadingState`, `ErrorState`
- existing `Button`
- native links or a native `<select>` for the archived view
- do not add shadcn Table, Dialog, Dropdown, DataTable, or a new Select primitive unless a later phase proves a Foundation primitive cannot do the job
- archive: labeled button on detail plus in-page confirmation using existing `Alert` + submit, not a new dialog library

List columns for MVP: company name, status. Optional contact email if it stays secondary and does not imply a data table. No contract or hours columns.

Detail: master-data fields, status, created/updated if useful, archive action for ACTIVE clients. No contract/hours sections.

Create/edit fields: company name, VAT, tax code, address, contact name, email, phone, notes.

### 13.3 Navigation

Keep the existing Clients nav item. Do not add destinations. Nested client routes already activate Clients via `isNavigationItemActive`.

### 13.4 Transport

- reads: RSC calling application services
- mutations: Server Actions in `src/features/clients/`, same session pattern as `createFirstWorkspaceAction`
- no SWR/React Query requirement for this Epic

---

## 14. Validation Rules

Boundary validation before persistence.

| Field | Rule |
| --- | --- |
| `companyName` | required; trim; length 1–255 |
| `vatNumber` | optional; trim; empty → `null`; no country/format engine |
| `taxCode` | optional; trim; empty → `null`; no format engine |
| `address` | optional; trim; empty → `null`; max 4000 |
| `contactName` | optional; trim; empty → `null`; max 255 |
| `email` | optional; trim; empty → `null`; if present, reject if it does not contain a single `@` with non-empty sides |
| `phone` | optional; trim; empty → `null`; max 50; no E.164 engine |
| `notes` | optional; trim; empty → `null`; max 4000 |
| `status` | not accepted from the client on create/update |
| `workspaceId` | not accepted from the client |
| `id` | path id for update/archive/get only; UUID shape may be checked; authorization is still workspace scope |

Email format is technical hygiene, not an OBD. VAT/tax semantics are proposed OBD-014.

Do not unique-check name or VAT in application code while OBD-013 is open.

---

## 15. Error / Empty / Loading Behavior

| State | Behavior |
| --- | --- |
| Loading | `(app)/loading.tsx` already renders `LoadingState`. Client pages may rely on it. Do not add a second global spinner system. |
| Empty ACTIVE list | `EmptyState` with a clear create action |
| Empty ARCHIVED list | `EmptyState` that does not look like a product failure |
| Validation error | field-associated message via `Field`; form stays populated |
| Client not found | `not-found` for GET; user-safe error for mutations |
| Unexpected server error | existing `(app)/error.tsx`; no Prisma / stack traces |
| Archive confirmation | explicit confirm control; no silent archive |
| Cross-workspace id | same as not found |

Do not use color alone for status. Show the word Active or Archived.

---

## 16. Testing Strategy

Use the existing pyramid. Do not add a framework.

| Level | Command | EPIC-101 use |
| --- | --- | --- |
| Unit | `pnpm test` | parse functions; application services with fake repositories |
| Integration | `pnpm test:integration` | `updateClient` persistence; application isolation; archive/edit scoped by workspace |
| E2E | `pnpm test:e2e` | one authenticated client journey; keep existing auth/onboarding/shell tests |

### 16.1 Unit

- valid create/update input
- missing/blank `companyName`
- optional blanks become `null`
- invalid email rejected
- create ignores supplied status
- get/update/archive of unknown id → not-found
- services call the repository with the context `workspaceId` only

### 16.2 Integration

- `updateClient` persists allowed fields and cannot change workspace
- update/archive/get with a foreign `clientId` fails as not-found
- list in workspace B never returns workspace A clients
- identifier substitution cannot update or archive a foreign client
- existing persistence, auth, and workspace isolation tests remain green

Do not truncate the test database. Do not point tests at `freelance_os`.

### 16.3 E2E

Reuse `tests/e2e/helpers/first-workspace.ts`.

One journey is enough:

```text
register → create workspace → /clients empty
  → create client with company name
  → see it on the ACTIVE list
  → open detail
  → edit company name
  → archive
  → ACTIVE list empty
  → archived view shows the client
```

Do not E2E every optional field or every validation message.

Preserve:

- `tests/e2e/app-shell.spec.ts` — `h1` “Clients” on `/clients`
- `tests/e2e/onboarding.spec.ts` — `/clients` auth/onboarding redirects
- `tests/e2e/auth.spec.ts`

Do not add `/workspace-unavailable` E2E (G-004). Do not switch Playwright to `next start`. Do not add axe/jsdom/RTL.

---

## 17. Accessibility Considerations

Inherit the EPIC-006 baseline. Do not claim WCAG certification.

| Requirement | Expectation |
| --- | --- |
| Headings | list `h1` “Clients”; create/edit/detail use a single `h1` |
| Labels | every control has an accessible name via `Field` / `Label` |
| Errors | associated with the control (`aria-invalid` / `aria-describedby`) |
| Keyboard | create, edit, archive, and list links operable without a pointer |
| Focus | existing `focus-visible` tokens |
| Status | text label, not color alone |
| Skip link / shell | unchanged |
| Empty/error | text / `role="status"` or `role="alert"` as the primitives already do |

Manual UX review remains a later lifecycle stage.

---

## 18. Security Considerations

- server-side authorization only
- no `workspaceId` from the browser as authority
- no Prisma on the client
- do not log session tokens, passwords, or reset secrets (existing auth rule)
- client notes/email/phone are tenant data; do not write them to application logs
- identical not-found for missing and foreign ids
- validate and bound string lengths
- do not weaken production Better Auth rate limits
- do not add `UNIQUE(userId)` or otherwise “fix” F-004-001
- Server Actions must re-read the session; do not accept `userId` from the form

---

## 19. Observability / Audit Implications

OBD-008 remains open. This Epic does **not** add an audit log, activity feed, or change history.

No new metrics or tracing requirement. Persist `createdAt` / `updatedAt` only.

If a later audit decision requires actor identity, that is a future change. Do not add `createdBy` / `updatedBy` columns here.

---

## 20. Phases

Four phases. One objective each. One commit each. New Cursor chat per phase.

Persistence already exists, so there is no schema-foundation phase.

```text
Phase 1 — Client application services and repository completion
Phase 2 — Authenticated client UI
Phase 3 — Isolation, integration, and E2E validation
Phase 4 — Documentation and Engineering Review
```

Phase IDs: P101-01 … P101-04.

No phase may start the next phase’s work.

---

## 21. Phase Details and Acceptance Criteria

### Phase 1 — Client application services and repository completion

**Phase ID:** P101-01  
**Cursor chat:** NEW CHAT  
**Commit expected:** YES  
**Entry conditions:** this plan exists; engineering review of the plan has approved implementation; no EPIC-101 application services yet.

#### Objective

Complete the application/domain boundary for workspace-scoped client write/read/archive, including the missing `updateClient` persistence operation.

#### Scope

- `UpdateClientInput` and `ClientRepository.updateClient`
- infrastructure `updateClient` scoped by workspace
- parse/validate helpers
- domain client errors
- application services listed in §11.1
- unit tests for parse + services
- integration coverage for `updateClient` persistence
- update workspace unit stubs that implement `ClientRepository`

#### Files / areas likely affected

- `src/domain/repositories.ts`
- `src/domain/persistence-types.ts`
- `src/domain/client-errors.ts`
- `src/application/clients/*`
- `src/infrastructure/persistence/client-repository.ts`
- `tests/unit/application/clients/*`
- `tests/unit/application/workspace/create-first-workspace.test.ts`
- `tests/integration/persistence/repositories.test.ts`

#### Dependencies

Existing `ClientRepository`, `WorkspaceContext`, persistence helpers, workspace parse-function pattern.

#### Explicit exclusions

- no UI, routes, or Server Actions
- no Prisma schema / migration
- no Zod
- no uniqueness rules
- no E2E
- no documentation rewrite
- no contract or time-entry behavior

#### Implementation expectations

- `workspaceId` only from trusted context
- create always ACTIVE
- update cannot change status or workspace
- archive remains the only status transition
- no `any`
- functions, not classes

#### Tests required

- unit: validation and service behavior in §16.1
- integration: `updateClient` success and foreign-workspace miss
- existing persistence/isolation tests stay green

#### Validation commands

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
```

#### Acceptance criteria

- `updateClient` exists and is workspace-scoped
- application services exist and do not import Prisma
- create/list/get/update/archive are testable without UI
- no route or placeholder change
- OBD-001–012 and inherited findings remain open

#### Expected commit

```text
feat(clients): add client application services
```

#### Required final Cursor report

Phase id, files changed, tests run (counts only), whether UI was touched (must be no), residual risks. Do not start Phase 2.

---

### Phase 2 — Authenticated client UI

**Phase ID:** P101-02  
**Cursor chat:** NEW CHAT  
**Commit expected:** YES  
**Entry conditions:** Phase 1 complete.

#### Objective

Replace the `/clients` placeholder with authenticated list, detail, create, edit, and archive flows.

#### Scope

- routes in §13.1
- `src/features/clients/` forms, actions, and feature components
- Server Actions calling Phase 1 services after `getCurrentWorkspaceContext()` / session checks
- empty/error/field states from §15
- ACTIVE list + archived view
- keep list `h1` “Clients”

#### Files / areas likely affected

- `src/app/(app)/clients/page.tsx`
- `src/app/(app)/clients/**`
- `src/features/clients/**`

#### Dependencies

Phase 1 services; EPIC-006 primitives; `getCurrentWorkspaceContext`; `getServerAuthSession`.

#### Explicit exclusions

- no new shadcn Table/Dialog/DataTable
- no search, sort controls, or pagination
- no contract/hours UI
- no Prisma in features
- no Playwright expansion (Phase 3)
- no schema change
- no documentation certification

#### Implementation expectations

- RSC reads; Server Action writes
- `clientId` from the path; workspace only from context
- archive requires an explicit confirm control
- verify in the browser: create, view, edit, archive, archived view, empty list, validation error, unknown id
- existing shell E2E selectors that depend on `h1` “Clients” must still be true after this phase even if the full E2E suite is Phase 3’s gate

#### Tests required

None beyond keeping unit/integration from Phase 1 green if touched. Do not add jsdom. Playwright belongs to Phase 3.

#### Validation commands

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
```

Browser verification of the flows in §13 is required. Do not treat a single screenshot as verification.

#### Acceptance criteria

- `/clients` is no longer a placeholder
- a member can create, view, edit, and archive a client
- archived clients are reachable from the archived view
- foreign/unknown ids render not-found
- shell `h1` “Clients” remains
- no contract or time-tracking UI

#### Expected commit

```text
feat(clients): add authenticated client management ui
```

#### Required final Cursor report

Routes added, browser flows verified, leftover placeholder risk, confirmation that Playwright was not expanded here. Do not start Phase 3.

---

### Phase 3 — Isolation, integration, and E2E validation

**Phase ID:** P101-03  
**Cursor chat:** NEW CHAT  
**Commit expected:** YES  
**Entry conditions:** Phase 2 complete.

#### Objective

Prove workspace isolation and the primary client journey without weakening CI contracts.

#### Scope

- application-level isolation/integration tests in §16.2
- Playwright journey in §16.3
- adjust existing E2E only if a Phase 2 UI detail breaks a documented assertion (prefer keeping `h1` “Clients”)

#### Files / areas likely affected

- `tests/integration/application/clients/*` or equivalent under `tests/integration/`
- `tests/e2e/clients.spec.ts`
- existing E2E only if a proven conflict appears

#### Dependencies

Phase 1–2; `TEST_DATABASE_URL`; first-workspace E2E helper; EPIC-005 CI contract.

#### Explicit exclusions

- no new product features
- no jsdom / RTL / axe
- no `/workspace-unavailable` journey
- no `next start` Playwright
- no `db push` / truncation
- no documentation certification

#### Implementation expectations

- unique E2E emails (G-002)
- isolation tests must attempt read/update/archive of a foreign client and expect denial/not-found
- do not E2E every validation rule

#### Tests required

§16.2 and §16.3. Existing auth, onboarding, shell, unit, and persistence suites stay green.

#### Validation commands

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
```

#### Acceptance criteria

- foreign-workspace client operations fail closed
- the create → edit → archive journey passes
- existing Playwright suites pass
- CI database isolation rules unchanged

#### Expected commit

```text
test(clients): cover isolation and client journeys
```

#### Required final Cursor report

Test counts (unit / integration / e2e), failures if any, confirmation that CI conventions were not changed. Do not start Phase 4 implementation of product code.

---

### Phase 4 — Documentation and Engineering Review

**Phase ID:** P101-04  
**Cursor chat:** NEW CHAT  
**Commit expected:** YES  
**Entry conditions:** Phases 1–3 complete.

#### Objective

Synchronize documents with implemented client management and record the Engineering Review.

#### Scope

Update only what this Epic changed or left stale:

- `MASTER_PLAN.md` — EPIC-101 status; next work R1-E02 Contracts; MVP implementation started; no production-readiness claim
- `docs/architecture.md` — `src/features/clients` exists; `/clients` is a product surface
- `docs/testing-strategy.md` — client application/E2E additions; no MVP completeness claim
- `docs/storage.md` — only if repository behavior needs a factual note; no fake schema change
- `README.md` / `CHANGELOG.md` as needed
- `docs/epics/EPIC-101/engineering-review.md` — create here, not earlier
- this plan’s status block → implementation complete after review

#### Files / areas likely affected

Documents listed above.

#### Dependencies

Implemented Phases 1–3 and their quality-gate evidence.

#### Explicit exclusions

- `qa-report.md`, `ux-review.md`, `production-validation.md`
- closing OBDs or prior findings
- further product implementation
- proposed OBD promotion into the MASTER_PLAN OBD table unless the Product Owner already accepted them

#### Implementation expectations

Describe implemented behavior only. Re-run quality gates if the review claims they passed.

#### Tests required

None new. Cite Phase 3 evidence. Re-run gates if the review asserts them.

#### Validation commands

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
```

#### Acceptance criteria

- documents no longer describe `/clients` as a placeholder
- Engineering Review exists and does not claim production readiness
- MASTER_PLAN next epic is Contract Management
- OBD-001–012 remain open
- inherited findings remain open

#### Expected commit

```text
docs: certify EPIC-101 clients
```

#### Required final Cursor report

Review verdict, documents updated, production-readiness statement (NO), next recommended step (engineering review already in-document; next Epic only if verdict is PASS / PASS WITH FINDINGS).

---

## 22. Commit Boundaries

```text
Release 1
  → EPIC-101
    → planning commit
    → Phase 1 commit
    → Phase 2 commit
    → Phase 3 commit
    → Phase 4 commit
```

One phase = one commit. Planning is this documentation commit only.

| Step | Commit |
| --- | --- |
| Planning | `docs: establish EPIC-101 clients plan` |
| P101-01 | `feat(clients): add client application services` |
| P101-02 | `feat(clients): add authenticated client management ui` |
| P101-03 | `test(clients): cover isolation and client journeys` |
| P101-04 | `docs: certify EPIC-101 clients` |

Do not combine phases. Do not implement during planning.

---

## 23. Engineering Review Requirements

A plan review is required **before Phase 1**.

An implementation Engineering Review is required in **Phase 4** as `docs/epics/EPIC-101/engineering-review.md`.

The Phase 4 review must assess:

- Client vs Contract remain distinct
- no schema/migration drift
- workspace isolation
- authorization (no browser `workspaceId` trust)
- repository/application boundaries
- MVP scope vs F-021/F-022 deferred fields
- tests and CI contract
- accessibility baseline (not certification)
- inherited findings and OBDs still open
- production readiness = NO

Verdict: `PASS` / `PASS WITH FINDINGS` / `FAIL`.

Do not treat Phase 4 as production certification.

---

## 24. Documentation Synchronization Requirements

| When | What |
| --- | --- |
| Planning | this file only |
| Phases 1–3 | no canonical doc rewrite |
| Phase 4 | `MASTER_PLAN.md`, architecture, testing strategy, README/CHANGELOG as needed, this plan status, engineering review |

`MASTER_PLAN.md` §49 updates after Epic completion and change of next work. That happens in Phase 4, not now.

Do not create extra planning or issue-explanation documents.

---

## 25. Known Risks / Findings

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
| EPIC-002 F-P3-002, F-P2-003, F-P2-004, F-P2-005 | Persistence / role baseline findings | Open. F-P2-005 continues as OBD-009. |

EPIC-101 planning observations (not prior defects):

| ID | Item | Disposition |
| --- | --- | --- |
| P101-G-001 | `Client` persistence already exists | Do not recreate. Add `updateClient` only. |
| P101-G-002 | `ClientRepository` has no update | Close in Phase 1. |
| P101-G-003 | F-021/F-022 include contract and hours | Defer those fields. Do not fake them. |
| P101-R-001 | Status query string could be mistaken for authorization | Treat as list filter only; every query still uses context `workspaceId`. |
| P101-R-002 | Replacing `/clients` could break shell E2E | Keep `h1` “Clients”. |
| P101-R-003 | Adding uniqueness “to be safe” would close OBD-013 | Forbidden. |
| P101-R-004 | Adding Dialog/Table would expand the UI foundation | Forbidden unless a later phase proves necessity. |

No Blocker identified at planning time.

---

## 26. Open Business Decisions

Preserve all MASTER_PLAN OBDs. This Epic must not resolve them.

| ID | Decision | Affects EPIC-101? | Blocks EPIC-101? |
| --- | --- | --- | --- |
| OBD-001 | Daily-rate semantics / partial days | No | No |
| OBD-002 | Monetary rounding | No | No |
| OBD-003 | Midnight-crossing entries | No | No |
| OBD-004 | Holiday model | No | No |
| OBD-005 | Vacation/absence model | No | No |
| OBD-006 | Capacity warning threshold | No | No |
| OBD-007 | Post-closure edits/deletes | No | No |
| OBD-008 | Audit requirements | Yes — no audit log | No |
| OBD-009 | Workspace roles | Yes — any member may manage clients | No |
| OBD-010 | Payment-term catalog | No | No |
| OBD-011 | Multi-currency | No | No |
| OBD-012 | Contract-hour rollover/expiry | No | No |

### Proposed new OBDs

Do not write these into `MASTER_PLAN.md` unless the Product Owner accepts them.

| Proposed ID | Question | Why it is not silently decided |
| --- | --- | --- |
| OBD-013 | Duplicate client policy: uniqueness of company name, VAT, and/or tax code inside a workspace | Schema has no unique constraint. Enforcing one is a product rule, not a cleanup. |
| OBD-014 | VAT / tax-identifier country, format, and requiredness | Storage treats both as optional unconstrained strings. |
| OBD-015 | Archived-client operations: editability, unarchive, and future selectability for contracts and time entries | BR-005 preserves history. It does not define new-work selection or restore. |

Implementation defaults while those remain open are in §8. They are temporary and must stay labeled as such in the Phase 4 review.

### Evaluated and not created as new OBDs

| Candidate | Why no new OBD |
| --- | --- |
| Required vs optional master-data fields | `docs/storage.md` §6 and the Prisma model already require only `companyName` and `status` |
| Address structure | Storage already specifies a single TEXT field for MVP |
| Contact structure | Storage already specifies flat contact name / email / phone |
| Search / sort / pagination | Not required for MVP; status filter is justified below |
| Physical delete | Already rejected by storage and F-024 |
| Role-specific client permissions | Already OBD-009 |
| Audit of client edits | Already OBD-008 |

### Search / filter justification

`MASTER_PLAN.md` allows “client search/filter as justified by UX.”

| Capability | MVP? | Justification |
| --- | --- | --- |
| Default ACTIVE list | Yes | Normal operating set |
| ARCHIVED view | Yes | R1-E01 historical visibility; repository already filters by status |
| Company-name sort | Yes | Existing `listClients` order; not a new product control |
| Free-text search | No | No evidence of list size that requires it; `companyName` index is enough for later |
| User-controlled sort | No | Speculative |
| Pagination | No | Speculative for a single-freelancer MVP |

---

## 27. Exit Criteria

EPIC-101 is engineering-complete when:

1. A workspace member can create, view, edit, and archive clients in the authorized workspace.
2. Clients remain distinct from contracts.
3. Archived clients are retained and visible in an archived view.
4. Browser-supplied `workspaceId` cannot authorize access.
5. Foreign-workspace client ids cannot be read, updated, or archived.
6. No Prisma schema or migration change was required, except if engineering review later forces a documented exception.
7. `/clients` is a product surface; list `h1` remains “Clients”.
8. F-021/F-022 contract and hours fields were not faked.
9. Unit, integration, and the client E2E journey pass under existing CI rules.
10. Inherited findings and OBD-001 through OBD-012 remain open.
11. `docs/epics/EPIC-101/engineering-review.md` exists after Phase 4.
12. Production readiness is not claimed.

---

## 28. Production Readiness

```text
EPIC-101 engineering completion
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
P101-01 Client application services and repository completion
        ↓
P101-02 Authenticated client UI
        ↓
P101-03 Isolation, integration, and E2E validation
        ↓
P101-04 Documentation and Engineering Review
        ↓
R1-E02 — Contract Management
```

Each implementation phase: new Cursor chat, one commit, no later-phase work.

---

## 30. Implementation Chat Protocol

Every new Cursor chat starts from zero context.

For each phase, read:

```text
MASTER_PLAN.md
docs/epics/EPIC-101/epic-plan.md
docs/architecture.md
docs/epics/EPIC-006/engineering-review.md
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
8. `docs/epics/EPIC-006/epic-plan.md` and `docs/epics/EPIC-006/engineering-review.md` for UI/testing inheritance
9. `docs/epics/EPIC-004/engineering-review.md` for workspace authorization
10. `docs/epics/EPIC-002/engineering-review.md` for persistence invariants

If sources conflict, do not silently pick. Record the conflict; prefer not expanding MVP scope.

Known source discrepancy:

| Source | Discrepancy | Resolution for this Epic |
| --- | --- | --- |
| F-021 / F-022 | List/detail include contract and hours | Those depend on R1-E02 / R1-E03. Show master data and status only. |
| `docs/architecture.md` | Zod is a candidate | Repository uses parse functions and does not depend on Zod. Do not add Zod. |
| `docs/architecture.md` §14.2 | `src/features/clients` is future EPIC-101+ work | Phase 2 creates that folder. |
| `MASTER_PLAN.md` R1-E01 | “search/filter as justified by UX” | Status filter only; see §26. |

---

## 32. Final Planning Gate

This planning document is complete when:

- [x] Epic identity is EPIC-101 — Clients (R1-E01)
- [x] Status is planning-complete, implementation not started
- [x] Objective matches MASTER_PLAN Client Management
- [x] Dependencies are the completed Foundation Epics
- [x] Current repository context is recorded
- [x] Scope and non-goals do not conflict
- [x] Client and Contract stay distinct
- [x] Data model impact is no schema/migration
- [x] Authorization uses existing workspace context
- [x] Phases are independently executable
- [x] Open questions are mapped to OBDs or proposed OBDs
- [x] Production readiness is explicitly denied
- [x] No application code, Prisma schema, or migration is changed by planning

Stop. Wait for engineering review. Do not start Phase 1 in this chat.
