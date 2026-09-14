# EPIC-103 — Engineering Review

**Epic:** EPIC-103 — Time Tracking  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E03 — Time Tracking  
**Reviewed commits:**

```text
P103-01
934d202
feat(time-tracking): add TimeEntry application services and validation

P103-02
ba1c597
feat(time-tracking): add authenticated time tracking UI and forms

P103-03
2e67759
test(time-tracking): add integration tests and E2E journey
```

Phase 4 is documentation and Engineering Review only. No application, schema, route, authentication, workspace, CI, or test-architecture change was added in this review.

---

## 1. Executive Summary

EPIC-103 completes workspace-scoped Time Tracking. It does not start Analytics & Dashboard.

Phase 1 added the TimeEntry application services, contract-eligibility and contract-validity services, input validation, TimeEntry domain errors, and the repository operations `listTimeEntriesForPeriod`, `updateTimeEntry`, and `deleteTimeEntry`. Phase 2 replaced the `/time-tracking` placeholder with the authenticated daily view, weekly timesheet, create form, and edit form including delete. Phase 3 added TimeEntry lifecycle and workspace-isolation integration tests plus the Playwright time-tracking journey. Phase 4 synchronizes documentation with that implemented state.

One real application defect was found and corrected during P103-03: the three TimeEntry Server Actions called `redirect()` inside `try`/`catch`, so the `NEXT_REDIRECT` control-flow error was intercepted by the error handler and a false application error was returned after a successful create, update, or delete. That defect is recorded as F-103-001 with its corrective implementation. It is resolved.

Two behavioral limitations remain open and are not fixed by this review: the daily and weekly lists join time entries against ACTIVE clients only, so entries for archived clients are not visible in those views even though the application layer keeps them readable and editable (F-103-002); and the contract `select` uses `defaultValue`, so stale contract selection after changing client or work date is unverified (F-103-003).

P102-F-001 remains OPEN. TimeEntry stores `contractId` and no commercial snapshot, so later commercial Contract edits can still change the interpretation of historical entries. EPIC-103 did not introduce snapshots or versioning.

```text
VERDICT: PASS WITH FINDINGS
EPIC ENGINEERING COMPLETION: YES
PRODUCTION READINESS: NO
READY FOR R1-E04
```

EPIC-103 closes Time Tracking engineering work only. Analytics & Dashboard, inherited findings, proposed OBDs, formal UX Review, and production validation/certification remain required. P103-03 validation of the implemented journey is not production validation and is not production certification.

---

## 2. Scope Delivered

Verified against `MASTER_PLAN.md` §13 R1-E03, `docs/epics/EPIC-103/epic-plan.md`, `docs/architecture.md` §5.5, `docs/domain-model.md` §8 / BR-002 / BR-003 / BR-004, `docs/storage.md`, `docs/testing-strategy.md` §25, the Phase 1–3 implementation, and the current repository.

| Area | Planned | Implemented | Verified |
| --- | --- | --- | --- |
| Workspace-scoped TimeEntry create | Yes | Yes | Yes |
| Read — single entry | Yes | Yes | Yes |
| Read — daily list | Yes | Yes | Yes |
| Read — weekly timesheet | Yes | Yes | Yes |
| Update — mutable fields only | Yes | Yes | Yes |
| Delete — hard delete | Yes | Yes | Yes |
| Client-first selection | Yes | Yes | Yes |
| Contract selection restricted to the client | Yes | Yes | Yes |
| Contract validity `[validFrom, validTo)` at create | Yes | Yes | Yes |
| Open-ended contract (`validTo = null`) | Yes | Yes | Yes |
| Archived-client create rejection | Yes | Yes | Yes |
| Archived-client existing-entry read/edit (application layer) | Yes | Yes | Yes |
| Archived-client existing-entry visibility in daily/weekly lists | Yes | No — F-103-002 | Yes |
| `workDate` immutable after creation | Yes | Yes | Yes |
| `clientId` immutable after creation | Yes | Yes | Yes |
| `contractId` immutable after creation | Yes | Yes | Yes |
| Duration stored as integer minutes | Yes | Yes | Yes |
| Duration bounds 1–1440 minutes | Yes | Yes | Yes |
| Future work dates permitted | Yes | Yes | Yes |
| Duplicate entries permitted | Yes | Yes | Yes |
| Server Actions / RSC / application-service boundary | Yes | Yes | Yes |
| Foreign Client / Contract / TimeEntry fail closed | Yes | Yes | Yes |
| Isolation integration coverage | Yes | Yes | Yes |
| Playwright E2E journey | Yes | Yes | Yes |
| Prisma schema / migration | Forbidden | Unchanged | Yes |
| TimeEntry archive / soft delete / status field | Forbidden | Absent | Yes |
| Rate or billing calculation | Forbidden | Absent | Yes |
| Forecasting / revenue estimation | Forbidden | Absent | Yes |
| Timer / stopwatch | Forbidden | Absent | Yes |
| Calendar view, copy-previous-entry | Deferred (post-UX-review) | Absent | Yes |
| Entry detail route `/time-tracking/[timeEntryId]` | Optional ("if justified") | Not added | Yes |
| Production readiness | Forbidden | Not claimed | Yes |

`/time-tracking` is now a product surface. Dashboard, Reports, Alerts, and Settings remain placeholders.

---

## 3. Scope Compliance

**Verdict:** PASS

In scope and present:

- create, get, list-for-date, list-for-period, update (mutable fields), delete (hard)
- contract eligibility and contract-validity services
- authenticated `(app)` routes `/time-tracking`, `/time-tracking/new`, `/time-tracking/[timeEntryId]/edit`
- application services under `src/application/time-entries/`
- feature folder `src/features/time-entries/`
- repository completion (`listTimeEntriesForPeriod`, `updateTimeEntry`, `deleteTimeEntry`)

Out of scope and absent:

- invoicing, rate calculation, revenue estimation, utilization, forecasting
- dashboard widgets, reporting, export, advanced filtering
- timers, stopwatch, background tracking, calendar integration, time blocking
- bulk entry, templates, entry duplication shortcuts, offline capability
- team time tracking, approval workflows, period closure, audit logging
- `TimeEntry` archive state, `archivedAt`, or status field
- Prisma schema or migration change
- `qa-report.md`, `ux-review.md`, `production-validation.md`

Two planned MASTER_PLAN §13 scope lines were intentionally not implemented: `calendar view` and `copy previous entry if retained after UX review`. The latter is explicitly conditional on UX Review, which has not occurred. The former is recorded as deferred, not as delivered.

The optional entry-detail route was not added. The edit page carries read-only client, contract, and work-date context plus the delete affordance, so a separate detail route was not justified.

---

## 4. Architecture

**Verdict:** PASS

```text
Server Action / RSC
  → application service
  → domain validation / errors
  → TimeEntryRepository / ClientRepository / ContractRepository
  → Prisma infrastructure
```

Confirmed:

- pages and feature modules do not import Prisma
- workspace resolution remains server-side via `getCurrentWorkspaceContext()`
- browser-supplied `workspaceId` is never authorization
- existing Client / Contract / Workspace patterns are reused
- Zod was not added; validation follows the established parse/validate-function pattern
- no new framework or dependency was added

| Operation | Location |
| --- | --- |
| `createTimeEntry` | `src/application/time-entries/create-time-entry.ts` |
| `getTimeEntry` | `src/application/time-entries/get-time-entry.ts` |
| `listTimeEntriesForDate` / `listTimeEntriesForPeriod` | `src/application/time-entries/list-time-entries.ts` |
| `updateTimeEntry` | `src/application/time-entries/update-time-entry.ts` |
| `deleteTimeEntry` | `src/application/time-entries/delete-time-entry.ts` |
| `isContractValidForDate` / `validateContractForTimeEntry` / `getEligibleContracts` | `src/application/time-entries/contract-validation.ts` |
| `validateDuration` / `validateTimeEntryInput` / `validateUpdateTimeEntryInput` | `src/application/time-entries/time-entry-input.ts` |

Mutations: `createTimeEntryAction`, `updateTimeEntryAction`, `deleteTimeEntryAction`. Reads: RSC loaders in `src/features/time-entries/load-time-entries.ts`. Session, workspace context, and repository construction are centralized in `src/features/time-entries/authenticated-time-entry-context.ts`, matching the Client / Contract feature pattern.

The planned `ValidationResult`-returning `validateContractForDate` shape was implemented as a throwing `validateContractForTimeEntry` that returns the resolved `ContractRecord`. This matches the existing repository-wide domain-error convention rather than introducing a second validation idiom. Recorded as an implementation deviation, not a defect.

`ClientContractSelector.tsx` is the original client-island implementation. No state-management refactor was retained.

---

## 5. Domain Correctness

**Verdict:** PASS

Immutable-field rule, as finalized and as implemented:

| Field | Create | Update | Enforcement |
| --- | --- | --- | --- |
| `workDate` | Accepted | Rejected — immutable | Excluded from `UpdateTimeEntryInput`; `updateTimeEntry` never forwards it; repository `data` block cannot set it |
| `clientId` | Accepted and validated | Rejected — immutable | Excluded from `UpdateTimeEntryInput`; edit UI renders read-only text |
| `contractId` | Accepted and validated | Rejected — immutable | Excluded from `UpdateTimeEntryInput`; edit UI renders read-only text |
| `durationMinutes` | Accepted | Permitted | `validateUpdateTimeEntryInput` → `validateDuration` |
| `description` | Accepted, optional | Permitted, nullable | `validateUpdateTimeEntryInput` |
| `billable` | Accepted | Permitted | `validateUpdateTimeEntryInput` |
| `workspaceId`, `userId`, `id`, `createdAt` | Server-resolved | Not exposed | Not present in `UpdateTimeEntryInput` |

Contract validity is `[validFrom, validTo)`:

- `workDate < validFrom` rejected
- `validTo === null` open-ended and accepted
- `workDate < validTo` required for finite contracts; `validTo` is exclusive
- validation runs on create only, which is correct because `workDate`, `clientId`, and `contractId` cannot change on update; no revalidation path is reachable

Contract ownership: `validateContractForTimeEntry` loads the client and the contract through workspace-scoped repositories, rejects a contract whose `clientId` does not match the submitted client, and rejects a missing client as `ClientArchivedError` so that a nonexistent identifier and an archived client are indistinguishable to the caller.

Duration: integer minutes only, `1..1440` inclusive, non-integer / zero / negative / over-24h rejected as `InvalidDurationError`. The form collects hours and minutes and converts to minutes server-side. No floating-point hours are persisted.

Date semantics: `workDate` is a calendar date (`@db.Date`) parsed as `YYYY-MM-DDT00:00:00.000Z`. No timezone model was introduced. Midnight-crossing work is not representable (OBD-003 remains open).

Billable: stored flag only. `contractId` remains required for `billable = false` entries (F-P2-004 preserved).

---

## 6. Product Decisions

**Verdict:** PASS — all four decisions are reflected accurately in the implementation.

The Epic plan numbers six product decisions (`PD-103-001` … `PD-103-006`). Phase handoff notes refer to a four-decision short list with different numbers. Both refer to the same decisions. The Epic plan numbering is canonical; the mapping is recorded here and in the Epic plan to prevent divergence (F-103-004).

| Decision | Epic-plan ID | Short-list ID | Implemented behavior | Evidence |
| --- | --- | --- | --- | --- |
| Hard delete in MVP | PD-103-001 | PD-103-001 | `deleteTimeEntry` performs `db.timeEntry.delete` scoped by `{ id, workspaceId }`. No `archivedAt`, no status field, no migration. | integration delete lifecycle; E2E delete |
| `workDate` immutable | PD-103-002 | — | Excluded from `UpdateTimeEntryInput`; edit UI read-only | unit + integration immutability tests; E2E edit form |
| `clientId` / `contractId` immutable | PD-103-003 | — | Excluded from `UpdateTimeEntryInput`; edit UI read-only | unit + integration immutability tests; E2E edit form |
| Future TimeEntry dates permitted | PD-103-004 | PD-103-002 | No upper date bound in `validateTimeEntryInput`; only contract validity applies | integration create with future date |
| Duplicate entries permitted | PD-103-005 | PD-103-003 | No uniqueness rule at application or database level for `(contract, date)` | integration duplicate create |
| Client-first selection | PD-103-006 | PD-103-004 | `ClientContractSelector` holds client state, disables the contract `select` until a client is chosen, and filters contracts by client and work-date validity | E2E client-first selection |

Overlapping entries remain unvalidated by design (user responsibility in MVP).

---

## 7. Historical Correctness

**Verdict:** PASS WITH FINDINGS

What Time Tracking preserves:

- `TimeEntry.clientId`, `TimeEntry.contractId`, and `TimeEntry.workDate` cannot be changed after creation, so a saved entry cannot be silently re-attributed to a different client, contract, or date
- integer-minute duration storage without floating-point drift
- `userId` and `workspaceId` are server-resolved and never accepted from the client

What Time Tracking still cannot guarantee — **P102-F-001, OPEN:**

`TimeEntry` stores `contractId` and no snapshot of rate, billing model, currency, monthly hours, or payment terms. Editing those Contract fields still changes the commercial record that existing entries would later be read against. EPIC-103 did not add snapshots, versioning, or a revision table, and did not lock commercial edits. The temporary proposed-OBD-016 default is unchanged.

This is not resolved by the immutability rule. Immutability protects the *association*; it does not protect the *commercial terms* the association points at.

Do not resolve P102-F-001 in a later Epic by silently adding snapshots unless the Product Owner accepts a design.

---

## 8. Persistence

**Verdict:** PASS

```text
NO SCHEMA CHANGE
NO MIGRATION
NO prisma db push
```

`TimeEntry` remains the EPIC-002 model. Phase 1 added the TypeScript-only `UpdateTimeEntryInput` (`durationMinutes?`, `description?`, `billable?`) plus three repository operations.

| Operation | Implementation |
| --- | --- |
| `listTimeEntriesForPeriod` | `findMany` scoped by `workspaceId` with `workDate` between `startDate` and `endDate` inclusive, ordered `workDate` asc then `createdAt` asc |
| `updateTimeEntry` | `update` scoped by `{ id, workspaceId }`; `data` is built by conditional spread so only supplied mutable fields are written |
| `deleteTimeEntry` | `delete` scoped by `{ id, workspaceId }` — hard delete |

Confirmed:

- no unscoped `findUnique({ where: { id } })` was introduced
- all three operations run through `withPersistenceErrors`
- the positive-duration CHECK constraint and the workspace-scoped composite FKs to `Client` and `Contract` are unchanged
- `TimeEntry.contractId` remains required (F-P2-004 unchanged)

The weekly loader derives its end date in application code (`startDate + 6 days`) rather than in SQL. `listTimeEntriesForPeriod` uses an inclusive `lte` end bound, which is a period query and is deliberately not the exclusive `[validFrom, validTo)` contract-interval convention. The two conventions are different by design and are documented here to prevent confusion.

---

## 9. Security / Isolation

**Verdict:** PASS

Every TimeEntry operation uses server-resolved `WorkspaceContext.workspaceId`.

Confirmed by integration tests:

- cross-workspace read, list, update, and delete denial
- foreign `clientId` on create fails closed
- foreign `contractId` on create fails closed
- a contract belonging to another client in the same workspace is rejected
- foreign `timeEntryId` on get / update / delete raises `TimeEntryNotFoundError`, indistinguishable from a nonexistent id
- a supplied `userId` or `workspaceId` in form input is not authoritative
- the hidden `workDate` field on the edit form is not used to mutate persisted state

`(app)` remains the authenticated workspace gate. Any workspace member may manage time entries; `role` is not interpreted (OBD-009). Query parameters `date`, `view`, `start`, `clientId`, and `contractId` are view state and form preselects only.

Two declared domain error classes, `WorkspaceAccessDeniedError` and `ForeignResourceAccessError`, are never thrown or referenced. Isolation is enforced by fail-closed not-found behavior instead. Recorded as F-103-005 (dead code), not a security gap.

---

## 10. UI Architecture

**Verdict:** PASS

| Route | Role |
| --- | --- |
| `/time-tracking` | daily list (default today); `?date=` selects a day; `?view=week&start=` renders the weekly timesheet; `h1` remains `Time Tracking` |
| `/time-tracking/new` | create; optional `?date=`, `?clientId=`, `?contractId=` preselect |
| `/time-tracking/[timeEntryId]/edit` | edit mutable fields; read-only client / contract / work date; delete affordance |

Server components: page shells, `TimeEntryList`, `WeeklyTimesheet`, `PageHeader`. Client islands: `TimeEntryForm` (`useActionState`), `ClientContractSelector` (client selection state), `DurationInput`, `DeleteTimeEntryForm` (two-step confirmation). Shared Field / Button / Card / Alert / EmptyState / PageHeader / PageContent primitives are reused. No Dialog, Table, DatePicker, or new Select primitive was added; the selectors are native `select` elements styled with the existing token classes.

Contract option labels present billing model, formatted rate, and validity range. This is presentation of stored Contract metadata only. No rate is multiplied by any duration anywhere in the Time Tracking surface. Weekly and daily totals are minute sums, never money.

The delete flow lives on the edit page rather than on a dedicated route, and unknown identifiers resolve through the inherited `(app)/not-found` boundary.

---

## 11. Validation / States

**Verdict:** PASS

Validation follows the established validate-function pattern. Zod was not added.

| State | Behavior |
| --- | --- |
| Empty daily list | `EmptyState` with a create action for the selected date |
| Empty weekly timesheet | per-day empty rows with a per-day quick-add link |
| No client selected | contract `select` disabled with `Select a client first` |
| No eligible contract for client + date | contract `select` renders no options |
| Field validation | field-associated message via existing `Field` (`aria-invalid` / `aria-describedby`) |
| Duration out of bounds | `Duration must be between 1 minute and 24 hours.` on the duration field |
| Contract invalid for date | `Contract is not valid for the selected work date.` on the contract field |
| Archived client on create | `Cannot create time entries for archived clients.` on the client field |
| Missing / foreign entry | `(app)/not-found` |
| Mutation failure | user-safe Alert; form values preserved; no Prisma / SQL / stack leakage |
| Route loading / error | `/time-tracking/loading.tsx`, `/time-tracking/new/loading.tsx`, `/time-tracking/[timeEntryId]/edit/loading.tsx`, `/time-tracking/error.tsx` |

An unparseable `?date=` value silently falls back to today rather than surfacing an error. Recorded as F-103-006.

---

## 12. Accessibility Baseline

**Verdict:** PASS — baseline only

This is not WCAG certification.

Present:

- single `h1` per route through `PageHeader`
- `Field` label association plus `aria-invalid` / `aria-describedby` on errors
- native `select`, `input[type=date]`, radio group, and `textarea` controls, all keyboard reachable
- duration expressed as separate hours and minutes inputs with explicit labels
- billable state exposed as text (`Billable` / `Non-billable`), not color alone
- empty states use `role="status"`
- destructive delete requires an explicit second confirmation

Not present and not claimed: automated axe assertions, screen-reader verification, keyboard date-navigation shortcuts, mobile-specific optimization. Formal UX Review is a later lifecycle activity. No `ux-review.md` was created.

---

## 13. Testing / CI Review

**Verdict:** PASS

Unit tests, lint, typecheck, and build were rerun for this review. Integration and Playwright evidence is cited from the P103-03 phase gate and was not rerun here.

| Phase | Unit | Integration | E2E | Notes |
| --- | --- | --- | --- | --- |
| P103-01 | PASS | — | — | application services, validation, repository completion |
| P103-02 | PASS | — | — | UI and Server Actions; no test expansion |
| P103-03 | 164 / 26 files | 119 / 23 files | 21 / 1 worker | lifecycle, isolation, E2E journey; F-103-001 found and fixed |
| P103-04 | 164 | 119 (cited) | 21 (cited) | this review; integration and E2E not rerun |

P103-03 quality evidence:

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (164) |
| `pnpm test:integration` | PASS (119) |
| `CI=true pnpm test:e2e` | PASS (21 tests, 1 worker) |

`164`, `119`, and `21` are suite totals after EPIC-103, not counts of newly added tests. The repository evidence does not support a per-Epic added-test split, so none is claimed. For reference, the EPIC-102 gate closed at 116 unit / 75 integration / 15 E2E.

Time Tracking coverage added by this Epic:

- unit (`tests/unit/application/time-entries/`): duration and input validation; `isContractValidForDate` boundary cases including open-ended and exclusive `validTo`; contract-ownership and archived-client rejection; application services against fake repositories; immutability of `workDate` / `clientId` / `contractId` on update
- integration (`tests/integration/time-tracking.test.ts`, `tests/integration/time-tracking-security.test.ts`): full create / read / list / update / delete lifecycle against PostgreSQL; hard-delete confirmation; daily and period queries; duplicate and future-date acceptance; archived-client read and edit permitted, create rejected; cross-workspace denial on every operation; foreign client / contract / entry identifiers failing closed; identifier substitution
- Playwright (`tests/e2e/time-tracking.spec.ts`, 6 tests): authenticated journey from sign-in through client and HOURLY-contract fixture setup, create, daily-view verification, edit, delete; contract metadata is presentation-only; weekly view and per-day quick-add use the normal creation path; browser-level workspace isolation; unknown entry identifiers resolve to not-found; edit-form immutability constraints

E2E fixture corrections applied in P103-03 — test-side only, distinct from F-103-001:

- contract creation fixtures now select Billing model `HOURLY` explicitly instead of relying on a default
- waits are deterministic URL and locator state assertions; no arbitrary timeouts or retry loops
- assertions use canonical application output (for example the contract detail rendering `75 EUR`)
- assertions match the actual `notFound()` / 404 behavior and the canonical `?date=` redirect URLs

No test was skipped or deleted. Test database isolation is preserved.

EPIC-005 CI contract remains intact:

```text
TEST_DATABASE_URL
*_test guard
freelance_os rejected
pnpm dev
CI workers: 1
PostgreSQL 17
no prisma db push
reuseExistingServer false
```

Accepted testing limitations that remain applicable: G-002 (unique E2E emails, no truncate framework), G-004 (no Playwright `/workspace-unavailable` journey), G-006 (lint is the CI style gate), EPIC-003 F-004 (one CI worker), EPIC-003 F-002 (Google consent/callback not automated).

Coverage percentages are not claimed. WCAG certification is not claimed. MVP completeness is not claimed.

---

## 14. Security Considerations

**Verdict:** PASS

- workspace isolation on every read and write
- foreign-workspace identifiers fail closed as not-found
- browser `workspaceId` and `userId` are not authorization
- Server Actions re-resolve session and workspace context before every mutation
- the hidden `workDate` field on the edit form is redirect context only and cannot mutate persisted state
- user-safe errors; no Prisma / SQL leakage
- no new secrets, auth providers, or rate-limit changes
- production Better Auth rate limits were not weakened

---

## 15. Documentation Review

**Verdict:** PASS after Phase 4 synchronization

Phase 4 updated `MASTER_PLAN.md`, `docs/architecture.md`, `docs/domain-model.md`, `docs/storage.md`, `docs/testing-strategy.md`, `docs/epics/EPIC-103/epic-plan.md`, `README.md`, and `CHANGELOG.md`, and created this review.

Documents now describe implemented time tracking. They do not claim:

- production readiness
- MVP completeness
- Analytics, Dashboard, Reporting, or billing calculation
- schema or migration change
- closure of OBD-001 through OBD-012
- promotion of proposed OBD-013 / OBD-014 / OBD-015 / OBD-016
- closure of inherited findings or P102-F-001

Two Epic-plan statements were stale relative to the finalized decisions and are corrected in this phase: `archiveTimeEntry` in the §16.1 test list and the "create → edit → archive" lifecycle wording in §26.1 / §27.2 both predate PD-103-001 hard delete.

---

## 16. Findings

### F-103-001 — `redirect()` inside `try`/`catch` returned a false error after a successful mutation

- **Severity:** High
- **Blocking:** No — resolved before phase closure
- **Status:** RESOLVED in P103-03 (`2e67759`)
- **Type:** Application defect, not a test defect
- **Description:** `createTimeEntryAction`, `updateTimeEntryAction`, and `deleteTimeEntryAction` each called `redirect()` from inside a `try` block whose `catch` mapped unrecognized errors to a generic user-facing failure. Next.js implements `redirect()` by throwing a `NEXT_REDIRECT` control-flow error. The `catch` therefore intercepted the redirect signal and returned `Unable to create the time entry.` / `Unable to update the time entry.` — or rethrew on delete — even though the database write had already succeeded. The user saw an error for an operation that had committed, and the post-save navigation never happened.
- **Detection:** Surfaced by the Playwright journey only after the E2E contract fixture was corrected to select `HOURLY` explicitly. Before that correction the failure was masked by an earlier fixture failure.
- **Corrective implementation:** `redirect()` was moved out of the `try` block in all three Server Actions, so it executes only on the success path and its thrown signal is never caught. The create and update actions redirect to `/time-tracking?date=${values.workDate}`; the delete action redirects to `/time-tracking` with the `?date=` suffix when a work date is supplied. Each site carries an explanatory comment. Error mapping for genuine domain errors is unchanged.
- **Follow-up:** No other Server Action in the repository calls `redirect()` inside `try`/`catch`. No repository-wide lint rule enforces this; the constraint is currently documented only in `docs/architecture.md`.

### F-103-002 — daily and weekly lists omit entries belonging to archived clients

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Description:** `loadClientsAndContracts()` filters clients to `status === "ACTIVE"`, and both list views enrich entries by looking the client up in that filtered set and dropping entries whose client is not found. A time entry whose client is archived after the entry was created therefore disappears from the daily and weekly views, even though the application layer still returns it and the edit route still loads and updates it. The edit page renders `Unknown Client` for the same reason.
- **Impact:** The archived-client rule "existing entries remain readable and editable" holds at the application and persistence layers (integration-proven) but is not fully honored by the presentation layer. Historical work performed for a since-archived client is not visible in the Time Tracking surface.
- **Mitigation:** Not fixed in this Epic. EPIC-103 is documentation-only in Phase 4 and no code change was made. Relevant to the proposed OBD-015 decision and to R1-E04 analytics, which must not inherit the same ACTIVE-only join.

### F-103-003 — contract selection may go stale after changing client or work date

- **Severity:** Low
- **Blocking:** No
- **Status:** Open / unverified
- **Description:** The contract `select` is uncontrolled (`defaultValue={selectedContractId}`) while its option list is recomputed from the selected client and the work date. Whether a previously chosen contract is cleared when the client or work date changes has not been verified. A stale selection would be rejected server-side by `validateContractForTimeEntry`, so this is a UX correctness question, not an integrity risk.
- **Mitigation:** Recorded as a non-blocking follow-up. No code change and no scope addition in this Epic.

### F-103-004 — product-decision numbering divergence

- **Severity:** Low
- **Blocking:** No
- **Status:** Open documentation risk, mitigated
- **Description:** The Epic plan numbers six product decisions while phase handoff notes use a four-item short list with conflicting numbers for future dates, duplicates, and client-first selection. Both describe the same accepted decisions.
- **Mitigation:** The mapping table in §6 of this review is the reconciliation, and the Epic plan now cross-references it. Epic-plan numbering is canonical.

### F-103-005 — declared but unused TimeEntry domain errors

- **Severity:** Low
- **Blocking:** No
- **Status:** Open
- **Description:** `WorkspaceAccessDeniedError` and `ForeignResourceAccessError` in `src/domain/time-entry-errors.ts` are exported but never thrown or handled. Isolation is enforced by fail-closed not-found behavior instead, which is the correct pattern. The unused classes suggest an authorization path that does not exist.
- **Mitigation:** No functional impact. Removal is a cleanup item for a later Epic.

### F-103-006 — invalid `?date=` silently falls back to today

- **Severity:** Low
- **Blocking:** No
- **Status:** Open
- **Description:** `parseDate` in `/time-tracking/page.tsx` returns the current date for a missing or unparseable value. A mistyped or stale link shows today's entries without indicating that the requested date was ignored.
- **Mitigation:** Accepted for MVP. No data-integrity impact.

### F-103-P-001 — TimeEntry edit and delete are not audited (carried forward from planning)

- **Severity:** Low
- **Blocking:** No
- **Status:** Open, confirmed by implementation
- **Description:** No audit trail exists for TimeEntry mutation or hard deletion. A deleted entry leaves no record. Directly dependent on OBD-008.

### F-103-P-002 — contract selection performance with large datasets (carried forward from planning)

- **Severity:** Low
- **Blocking:** No
- **Status:** Open, confirmed and slightly broadened by implementation
- **Description:** Every `/time-tracking` render loads all workspace clients and all workspace contracts and joins them to entries in memory. This is acceptable at MVP data volumes and degrades with workspace size. No pagination, no server-side filtering, no caching.

---

## 17. Inherited Findings

These are not closed by this review. No closure is claimed without evidence.

### P102-F-001 (EPIC-102)

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Description:** TimeEntry stores `contractId`, not a commercial snapshot. Later Contract commercial edits can change the historical billing interpretation of existing entries. EPIC-103 recorded explicit immutable `contractId` / `clientId` / `workDate` but added no snapshot, so the finding is unchanged. Proposed OBD-016.

### EPIC-002 F-P2-004

- **Severity:** as previously recorded
- **Blocking:** No
- **Status:** Open
- **Description:** `TimeEntry.contractId` is required, so a non-billable entry without a contract cannot be stored. EPIC-103 preserved the requirement: contract selection is mandatory in the create form regardless of the billable flag.

### EPIC-002 F-P2-003

- **Severity:** as previously recorded
- **Blocking:** No
- **Status:** Open
- **Description:** `Notification.type` remains `String`. Out of scope.

### EPIC-002 F-P2-005

- **Severity:** as previously recorded
- **Blocking:** No
- **Status:** Open. Continues as OBD-009
- **Description:** Role enum is `OWNER` / `MEMBER` only. Any member may manage time entries.

### EPIC-002 F-P3-002

- **Severity:** as previously recorded
- **Blocking:** No
- **Status:** Open
- **Description:** The Alert client/contract pair is not proven by the database. Out of scope.

### EPIC-004 F-004-001

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open / accepted persistence limitation
- **Description:** Concurrent first-workspace creation can produce two memberships. Out of scope for EPIC-103 and unchanged by it.

### EPIC-003 F-001

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open / deferred product-security decision
- **Description:** Better Auth default Google/email implicit linking requires `emailVerified=true`. Email/password signup does not verify email.

### EPIC-003 F-002

- **Severity:** Low
- **Blocking:** No
- **Status:** Open testing limitation
- **Description:** Full Google consent/callback is not automated in CI.

### EPIC-003 F-003

- **Severity:** Medium
- **Blocking:** No for this Epic
- **Status:** Open operational dependency
- **Description:** No production password-reset email provider has been selected.

### EPIC-003 F-004

- **Severity:** Low
- **Blocking:** No
- **Status:** Open / formalized — `pnpm dev` + 1 CI worker
- **Description:** Playwright CI uses `pnpm dev` with one worker. Locked by EPIC-005.

### G-002 / G-004 / G-006

- **Severity:** Low
- **Blocking:** No
- **Status:** Accepted
- **Description:** Unique E2E emails without a truncate framework (G-002); no Playwright `/workspace-unavailable` journey (G-004); lint is the CI style gate, no `format:check` (G-006).

---

## 18. Open Business Decisions

Do not close any OBD. Do not promote proposed OBDs.

| ID | Decision | Blocks EPIC-103? | EPIC-103 relationship |
| --- | --- | --- | --- |
| OBD-001 | Daily-rate semantics / partial days | No | `DAILY` contracts are selectable; no rate or day calculation exists |
| OBD-002 | Monetary rounding | No | no monetary calculation was introduced |
| OBD-003 | Midnight-crossing entries | No | `workDate` is date-only; crossing midnight is not representable |
| OBD-004 | Holiday model | No | not modeled |
| OBD-005 | Vacation/absence model | No | not modeled |
| OBD-006 | Capacity warning threshold | No | no alerts or thresholds |
| OBD-007 | Post-closure edits/deletes | No | no period closure; edits and hard deletes are unrestricted in time |
| OBD-008 | Audit requirements | No | no audit trail — F-103-P-001 |
| OBD-009 | Workspace roles | No | any member may manage time entries |
| OBD-010 | Payment-term catalog | No | not read by Time Tracking |
| OBD-011 | Multi-currency | No | contract currency is displayed as stored; no conversion |
| OBD-012 | Contract-hour rollover/expiry | No | minutes stored; no utilization or rollover |
| — | Google/email identity linking | No | EPIC-003 F-001 |
| — | Production email provider | No | EPIC-003 F-003 |

Proposed, not accepted, not written into `MASTER_PLAN.md`:

| Proposed ID | Question | EPIC-103 implementation default |
| --- | --- | --- |
| OBD-013 | Duplicate company name / VAT / tax code policy | unchanged from EPIC-101 |
| OBD-014 | VAT / tax-identifier country, format, requiredness | unchanged from EPIC-101 |
| OBD-015 | Archived-client editability, unarchive, and selectability | create rejected; existing entries readable and editable at the application layer but not listed in the UI views (F-103-002); archived clients excluded from create selectors |
| OBD-016 | Whether commercial fields may change after TimeEntries exist | edits still allowed; no snapshot — P102-F-001 |

Those defaults are temporary. They do not close the decisions.

---

## 19. Deferred Work

Out of scope and not started:

- R1-E04 — Analytics & Dashboard
- billing calculation, invoicing, revenue estimation, utilization, forecasting
- reporting and export
- calendar view and copy-previous-entry (conditional on UX Review)
- timers, stopwatch, bulk entry, templates, keyboard shortcuts, offline
- entry-detail route, pagination, server-side filtering, search
- period closure, approval workflows, audit log
- archived-client visibility fix in the Time Tracking views (F-103-002)
- contract-selector stale-selection verification (F-103-003)
- EPIC-002 / EPIC-003 / EPIC-004 / EPIC-102 finding remediation
- formal UX Review
- production validation
- production certification

---

## 20. Production-Readiness Limitations

EPIC-103 engineering completion is not production validation and is not production certification.

Still required before any production-ready claim:

- later product Epics starting at R1-E04 Analytics & Dashboard
- production password-reset email provider (EPIC-003 F-003)
- Google/email identity-linking decision (EPIC-003 F-001)
- resolution of the concurrent first-workspace limitation (F-004-001) by a method that does not add `UNIQUE(userId)`
- Product Owner decisions on proposed OBD-013 / OBD-014 / OBD-015 / OBD-016 and P102-F-001
- resolution or explicit acceptance of F-103-002
- formal UX Review
- production validation and production certification stages

This review does not certify WCAG conformance, production-ready authentication, production-ready multi-tenant operations, or Release readiness.

```text
EPIC-103 engineering completion
        ≠
production validation
        ≠
production certification
        ≠
READY FOR RELEASE
```

---

## 21. Epic Verdict

```text
PASS WITH FINDINGS
```

| Dimension | Result |
| --- | --- |
| Scope compliance | PASS |
| Non-goals respected | PASS |
| Architecture | PASS |
| Domain correctness | PASS |
| Product decisions (PD-103-001 … PD-103-006) | PASS |
| Immutable-field rule | PASS |
| Contract validity / archived-client rules | PASS at application layer; PASS WITH FINDINGS at UI layer — F-103-002 |
| Historical correctness | PASS WITH FINDINGS — P102-F-001 open |
| Persistence / no schema drift | PASS |
| Workspace isolation | PASS |
| Authorization | PASS |
| UI architecture | PASS |
| Validation / states | PASS |
| Accessibility baseline | PASS — not WCAG certification |
| Tests | PASS |
| CI | PASS |
| Security | PASS |
| Documentation | PASS |
| New EPIC-103 findings | F-103-001 (resolved), F-103-002, F-103-003, F-103-004, F-103-005, F-103-006, F-103-P-001, F-103-P-002 |
| Blocking findings | None |
| Epic engineering completion | YES |
| Full production readiness | NO |

Required EPIC-103 acceptance criteria are satisfied. F-103-001 was a genuine application defect, was corrected in P103-03 with the redirect moved outside the error handler, and is closed with E2E evidence. Inherited findings remain open and do not belong to this Epic as new defects.

---

## 22. Recommended Next Step

```text
READY FOR R1-E04
```

Create `docs/epics/EPIC-104/epic-plan.md` before implementation.

Treat R1-E04 as Analytics & Dashboard. Do not rebuild the Client, Contract, Time Tracking, UI, or testing/CI stack. Analytics must consume time entries through application services and must not reuse the ACTIVE-only client join that causes F-103-002. Do not close OBD-001 through OBD-012. Do not promote proposed OBD-013 / OBD-014 / OBD-015 / OBD-016. Do not fix P102-F-001 by adding snapshots unless that Epic's plan explicitly requires it. Do not fix EPIC-002, EPIC-003, or EPIC-004 findings unless that plan explicitly requires it.

---

## Review Evidence

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS (P103-04) |
| `pnpm typecheck` | PASS (P103-04) |
| `pnpm test` | PASS (164 tests / 26 files, P103-04) |
| `pnpm build` | PASS (P103-04) |
| `pnpm test:integration` | PASS (119, cited from P103-03) |
| Playwright (`CI=true`, 1 worker) | PASS (21, cited from P103-03) |
