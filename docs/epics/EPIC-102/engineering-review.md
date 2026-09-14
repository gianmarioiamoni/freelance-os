# EPIC-102 — Engineering Review

**Epic:** EPIC-102 — Contracts  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E02 — Contract Management  
**Reviewed commits:**

```text
P102-01
feat(contracts): add contract application services

P102-02
feat(contracts): add authenticated contract management ui

P102-03
28a0204a649a5e2de9104dcd022253bd15431b92
test(contracts): cover isolation and contract journeys
```

Phase 4 is documentation and Engineering Review only. No application, schema, route, authentication, workspace, CI, or test-architecture change was added in this review.

---

## 1. Executive Summary

EPIC-102 completes workspace-scoped Contract Management. It does not start Time Tracking.

Phase 1 completed application services, parse-function validation, domain errors, `updateContract`, and workspace-wide `listContracts`. Phase 2 replaced the `/contracts` placeholder with authenticated list, detail, create, and edit surfaces, and added contract history on client detail. Phase 3 added workspace isolation / integrity integration tests and the Playwright contract journey. Phase 4 synchronizes documentation with that implemented state.

P102-F-001 remains OPEN. Commercial Contract edits can change the interpretation of historical TimeEntries because TimeEntry stores `contractId` and no rate snapshot. This Epic did not introduce versioning or snapshots. That limitation is accepted for engineering completion and is not treated as a blocking defect.

```text
VERDICT: PASS WITH FINDINGS
EPIC ENGINEERING COMPLETION: YES
PRODUCTION READINESS: NO
READY FOR R1-E03
```

EPIC-102 closes Contract Management engineering work only. Time Tracking, inherited findings, proposed OBDs, formal UX Review, and production validation/certification remain required.

---

## 2. Scope Delivered

Verified against `MASTER_PLAN.md` R1-E02, `docs/epics/EPIC-102/epic-plan.md`, `docs/architecture.md`, `docs/storage.md`, `docs/testing-strategy.md`, `docs/product-vision.md` F-030–F-033, `docs/domain-model.md`, the Phase 1–3 implementation, and the current repository.

| Area | Documented | Implemented | Verified |
| --- | --- | --- | --- |
| Workspace-scoped Contract management | Yes | Yes | Yes |
| Create | Yes | Yes | Yes |
| List | Yes | Yes | Yes |
| Detail | Yes | Yes | Yes |
| Update | Yes | Yes | Yes |
| Client association | Yes | Yes | Yes |
| Archived-client create rejection | Yes | Yes | Yes |
| Archived-client existing-contract edit | Yes | Yes | Yes |
| `[validFrom, validTo)` validity | Yes | Yes | Yes |
| Open-ended `validTo` | Yes | Yes | Yes |
| Application overlap rejection | Yes | Yes | Yes |
| PostgreSQL exclusion constraint | Yes | Yes | Yes |
| `HOURLY` / `DAILY` billing | Yes | Yes | Yes |
| Rate / currency | Yes | Yes | Yes |
| Monthly contracted hours | Yes | Yes | Yes |
| Payment terms | Yes | Yes | Yes |
| Workspace-scoped repositories | Yes | Yes | Yes |
| Server Actions / RSC / application-service boundary | Yes | Yes | Yes |
| Authenticated Contract UI | Yes | Yes | Yes |
| Validation / error states | Yes | Yes | Yes |
| Client contract history | Yes | Yes | Yes |
| Isolation integration coverage | Yes | Yes | Yes |
| Playwright E2E journey | Yes | Yes | Yes |
| `Contract.status` | Forbidden | Absent | Yes |
| Prisma schema / migration | Forbidden | Unchanged | Yes |
| Rate snapshots / versioning | Forbidden | Absent | Yes |
| Time Tracking UI | Forbidden | Absent | Yes |
| Production readiness | Forbidden | Not claimed | Yes |

---

## 3. Scope Compliance

**Verdict:** PASS

In scope and present:

- create, list, get, update, list-by-client, covering-date
- authenticated `(app)` routes under `/contracts`
- application services under `src/application/contracts/`
- feature folder `src/features/contracts/`
- repository completion (`updateContract`, `listContracts`)
- client-detail contract history

Out of scope and absent:

- TimeEntry create/edit/delete UI
- invoicing, payments, utilization, billing calculation
- `MONTHLY_FIXED` or any billing model beyond `HOURLY` / `DAILY`
- `Contract.status` / archive / delete
- rate versioning or commercial-field snapshots
- Client archive redesign
- role-specific contract permissions
- audit log
- `qa-report.md`, `ux-review.md`, `production-validation.md`

`/contracts` is a product surface. Dashboard, Time Tracking, Reports, Alerts, and Settings remain placeholders.

---

## 4. Architecture

**Verdict:** PASS

```text
Server Action / RSC
  → application service
  → domain validation / errors
  → ContractRepository / ClientRepository
  → Prisma infrastructure
```

Confirmed:

- pages and feature modules do not import Prisma
- workspace resolution remains server-side via `getCurrentWorkspaceContext()`
- browser `workspaceId` is ignored as authorization
- existing Client / Workspace patterns are reused
- Zod was not added
- no new framework or dependency was added

| Operation | Location |
| --- | --- |
| `createContract` | `src/application/contracts/create-contract.ts` |
| `listContracts` | `src/application/contracts/list-contracts.ts` |
| `listContractsForClient` | `src/application/contracts/list-contracts-for-client.ts` |
| `getContract` | `src/application/contracts/get-contract.ts` |
| `updateContract` | `src/application/contracts/update-contract.ts` |
| `getContractCoveringDate` | `src/application/contracts/get-contract-covering-date.ts` |

Mutations: `createContractAction`, `updateContractAction`. Reads: RSC loaders in `src/features/contracts/load-contracts.ts`. Features import application services and existing session / repository factories. They do not import Prisma or the Better Auth server instance except through existing session helpers.

`getActiveContract()` from `docs/architecture.md` §6 is implemented as `getContractCoveringDate` wrapping `findContractCoveringDate`. A separate `ContractApplicabilityService` was not added; interval / overlap helpers live in application/domain.

---

## 5. Domain Correctness

**Verdict:** PASS

`Client` remains identity (who). `Contract` remains commercial conditions over a validity interval (how). `clientId` is selected at create and is immutable afterwards. `UpdateContractInput` does not include `workspaceId` or `clientId`.

Validity is `[validFrom, validTo)`:

- `validFrom` required
- `validTo` optional; `null` is open-ended
- `[D, D)` and inverted ranges rejected (`InvalidContractPeriodError`)
- adjacent intervals accepted
- `validFrom` included; `validTo` excluded
- overlap for the same client in the same workspace rejected in application code
- update overlap checks exclude the contract being edited
- PostgreSQL exclusion constraint remains the concurrency authority

Billing:

- `HOURLY` / `DAILY` only
- rate required, `> 0`, at most 4 decimal places
- currency required ISO-4217; create defaults to workspace currency
- monthly hours convert to integer minutes; empty → no monthly limit
- payment terms use existing days + note fields

Applicability is derived from workspace-calendar `today` (`Scheduled` / `Current` / `Ended`). No `Contract.status` exists.

---

## 6. Historical Correctness

**Verdict:** PASS WITH FINDINGS

### P102-F-001 — commercial edits can rewrite historical meaning

- **Severity:** Medium
- **Blocking:** No for EPIC-102 engineering completion
- **Status:** Open
- **Proposed OBD:** OBD-016 (not accepted product policy)

`TimeEntry` stores `contractId` and does not snapshot rate, billing model, currency, monthly hours, or payment terms. Editing those fields on a Contract changes the commercial record that existing TimeEntries would later read.

This Epic:

- does not rewrite `TimeEntry.contractId`
- does not introduce rate snapshots, versioning, or a revision table
- allows commercial-field edits after TimeEntries exist (temporary OBD-016 default)
- preserves the earlier contract row when a later sequential contract is created

Integration coverage proves the `contractId` association is stable. It does not prove that later commercial-field edits leave historical billing interpretation unchanged, because no snapshot exists.

Domain guidance (`docs/domain-model.md` §7.4 / BR-003) still prefers a new validity interval over mutating historical conditions. That guidance is not enforced as a write lock.

Do not resolve P102-F-001 in a later Epic by silently adding snapshots unless the Product Owner accepts a design.

---

## 7. Persistence

**Verdict:** PASS

```text
NO SCHEMA CHANGE
NO MIGRATION
NO prisma db push
```

`Contract` / `BillingModel` remain the EPIC-002 model. Phase 1 added TypeScript-only `UpdateContractInput` plus repository `updateContract` and `listContracts`. Writes use `updateMany` / `findFirst` scoped by `{ id, workspaceId }`. Zero rows → `RecordNotFoundError`. No unscoped `findUnique({ where: { id } })` exists.

Confirmed:

- overlap remains database-enforced (`Contract_client_validity_no_overlap`)
- Contract ↔ Client ownership remains the composite FK `onDelete: Restrict`
- `TimeEntry.contractId` remains required (F-P2-004 unchanged)
- `listContracts` is workspace-scoped (`validFrom` desc, `createdAt` desc)
- `listContractsForClient` remains `validFrom` asc

---

## 8. Security / Isolation

**Verdict:** PASS

Every contract operation uses server-resolved `WorkspaceContext.workspaceId`.

Confirmed by integration tests:

- cross-workspace list / read / update denial
- foreign Client create denial
- foreign Contract get / update denial
- identifier substitution fails closed as not-found
- supplied `workspaceId` on create/update is ignored
- `clientId` cannot be reassigned on update
- concurrent overlapping creates fail at the persistence boundary and map to `OverlappingContractError`

`(app)` remains the authenticated workspace gate. Any workspace member may manage contracts. `role` is not interpreted (OBD-009). Query `clientId` on `/contracts/new` is a form preselect only.

---

## 9. OBD-015 / OBD-016 Temporary Defaults

Verified against implementation. These remain temporary. They are not accepted MASTER_PLAN policy.

| Proposed ID | Temporary default | Implementation |
| --- | --- | --- |
| OBD-015 | Create for archived Client rejected; existing contracts remain readable/editable | `ClientArchivedError` on create; update loads the existing client and does not reject `ARCHIVED` |
| OBD-016 | Commercial-field edits after TimeEntries exist are allowed; no versioning/snapshotting | `updateContract` persists allowed commercial fields; no snapshot table |

Client archive behavior from EPIC-101 is unchanged. Create selectors use ACTIVE clients only.

---

## 10. UI Architecture

**Verdict:** PASS

| Route | Role |
| --- | --- |
| `/contracts` | workspace list; `h1` remains `Contracts` |
| `/contracts/new` | create; optional `?clientId=` preselect |
| `/contracts/[contractId]` | detail |
| `/contracts/[contractId]/edit` | edit; client reassignment omitted |

List, detail, and page headers are server components. `ContractForm` is the client island (`useActionState`). Shared Field / Button / Card / Alert / EmptyState / PageHeader primitives are reused. No Dialog, Table, DatePicker, or new Select primitive was added.

Client detail composes `ClientContractHistory`. ACTIVE clients get a create action. The client list was not redesigned.

---

## 11. Validation / States

**Verdict:** PASS

Validation matches workspace parse functions. Zod was not added.

| State | Behavior |
| --- | --- |
| Empty contract list | `EmptyState`; create-client guidance when no ACTIVE clients exist |
| Empty client history | `EmptyState` that is not a product failure |
| Field validation | Field-associated message via existing `Field` |
| Overlap / invalid period | user-safe message; form stays populated |
| Missing / foreign contract | `(app)/not-found` |
| Mutation failure | user-safe Alert; no Prisma / SQL / stack |
| Route loading / error | inherited `(app)/loading.tsx` and `error.tsx` |

---

## 12. Accessibility Baseline

**Verdict:** PASS — baseline only

This is not WCAG certification.

Present:

- list `h1` remains `Contracts`; create / edit / detail use a single `h1`
- Field label association, `aria-invalid` / `aria-describedby` on errors
- applicability as text (`Current` / `Scheduled` / `Ended`), not color alone
- keyboard-reachable links and submit actions
- empty states use `role="status"`

Formal UX Review is a later lifecycle activity. No `ux-review.md` was created.

The previously reported Cursor/browser hydration overlay remains classified as tooling instrumentation. Repository evidence does not show an application defect.

---

## 13. Testing / CI Review

**Verdict:** PASS

Phase-gate evidence cited from P102-03. This review did not rerun the implementation suite.

| Phase | Unit | Integration | E2E | Notes |
| --- | --- | --- | --- | --- |
| P102-01 | PASS | — | — | application services + repository completion |
| P102-02 | PASS | — | — | browser flows verified; no Playwright expansion |
| P102-03 | 116 / 23 files | 75 / 21 files | 15 / 1 worker | isolation + contract journey |
| P102-04 | 116 | 75 | 15 | this review; suite not rerun |

P102-03 quality evidence:

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (116 / 23 files) |
| `pnpm test:integration` | PASS (75 / 21 files) |
| `CI=true pnpm test:e2e` | PASS (15 tests, 1 worker) |

No current validation failure was observed. No new test finding is manufactured.

Contract coverage added by this Epic:

- unit: parse functions; interval / overlap / applicability; application services with fake repositories
- integration: repository `updateContract` / `listContracts`; application isolation; foreign client/contract denial; identifier substitution; archived-client defaults; overlap at application and database levels; TimeEntry `contractId` stability
- Playwright: empty list → create client → create contract → list / detail → edit → sequential adjacent contract → overlap rejection → unknown id not-found

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

Accepted testing limitations that remain applicable:

- G-002: E2E uses unique emails on the isolated `*_test` database; no E2E truncate framework
- G-004: no Playwright `/workspace-unavailable` journey
- G-006: lint is the CI style gate; no `format:check`
- EPIC-003 F-004: one CI worker is the formalized contract
- EPIC-003 F-002: full Google consent/callback is not automated in CI

Coverage percentages are not claimed. WCAG certification is not claimed. MVP completeness is not claimed.

---

## 14. Security Considerations

**Verdict:** PASS

- workspace isolation on every read and write
- foreign-workspace ids fail closed as not-found
- browser `workspaceId` is not authorization
- query `clientId` is a preselect only
- Server Actions re-resolve session and workspace context
- user-safe errors; no Prisma / SQL leakage
- no new secrets, auth providers, or rate-limit changes
- production Better Auth rate limits were not weakened

---

## 15. Documentation Review

**Verdict:** PASS after Phase 4 synchronization

Phase 4 updated stale status in `MASTER_PLAN.md`, `docs/architecture.md`, `docs/testing-strategy.md`, `docs/storage.md`, `docs/domain-model.md`, `docs/epics/EPIC-102/epic-plan.md`, `README.md`, and `CHANGELOG.md`.

Documents now describe implemented contract management. They do not claim:

- production readiness
- MVP completeness
- Time Tracking
- schema or migration change
- closure of OBD-001 through OBD-012
- promotion of proposed OBD-013 / OBD-014 / OBD-015 / OBD-016
- closure of inherited findings or P102-F-001

---

## 16. Findings

P102-F-001 remains the only new EPIC-102 finding. Inherited findings remain open and are not closed by this review.

### P102-F-001

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open
- **Description:** TimeEntry stores `contractId`, not a commercial snapshot. Editing rate / billing model / validity can change historical billing meaning if TimeEntries exist. Temporary OBD-016 default allows the edit.

### EPIC-004 F-004-001

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open / accepted persistence limitation
- **Description:** Concurrent first-workspace creation can produce two memberships. Out of scope for EPIC-102.

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
- **Blocking:** No for this epic
- **Status:** Open operational dependency
- **Description:** Production password-reset email provider has not been selected.

### EPIC-003 F-004

- **Severity:** Low
- **Blocking:** No
- **Status:** Open / formalized — `pnpm dev` + 1 CI worker
- **Description:** Playwright CI uses `pnpm dev` with one worker because `next start` rate limits collide across auth journeys. EPIC-005 locked this contract. It is not a new defect.

### G-004

- **Severity:** Low
- **Blocking:** No
- **Status:** Accepted
- **Description:** No Playwright `/workspace-unavailable` journey. Unit and integration remain the baseline.

### G-006

- **Severity:** Low
- **Blocking:** No
- **Status:** Accepted
- **Description:** Lint is the CI style gate; no `format:check`.

### G-002

- **Severity:** Low
- **Blocking:** No
- **Status:** Accepted
- **Description:** E2E uses unique emails; no truncate framework.

### EPIC-002 F-P3-002

- **Severity:** as previously recorded
- **Blocking:** No
- **Status:** Open
- **Description:** Alert client/contract pair is not proven by the database. Out of scope.

### EPIC-002 F-P2-003

- **Severity:** as previously recorded
- **Blocking:** No
- **Status:** Open
- **Description:** `Notification.type` remains `String`. Out of scope.

### EPIC-002 F-P2-004

- **Severity:** as previously recorded
- **Blocking:** No
- **Status:** Open
- **Description:** `TimeEntry.contractId` is required; non-billable entries without a contract cannot be stored. This Epic did not redesign that.

### EPIC-002 F-P2-005

- **Severity:** as previously recorded
- **Blocking:** No
- **Status:** Open. Continues as OBD-009
- **Description:** Role enum is `OWNER` / `MEMBER` only.

No Blocker or High findings. No new finding beyond P102-F-001.

---

## 17. Open Business Decisions

Do not close any OBD. Do not promote proposed OBDs.

| ID | Decision | Blocks EPIC-102? |
| --- | --- | --- |
| OBD-001 | Daily-rate semantics / partial days | No — `DAILY` is stored, not calculated |
| OBD-002 | Monetary rounding | No — rate stored as `NUMERIC(19,4)`; no rounding policy |
| OBD-003 | Midnight-crossing entries | No |
| OBD-004 | Holiday model | No |
| OBD-005 | Vacation/absence model | No |
| OBD-006 | Capacity warning threshold | No |
| OBD-007 | Post-closure edits/deletes | No |
| OBD-008 | Audit requirements | No — no audit log |
| OBD-009 | Workspace roles | No — any member may manage contracts |
| OBD-010 | Payment-term catalog | No — existing days + note fields |
| OBD-011 | Multi-currency | No — ISO-4217 stored; no conversion |
| OBD-012 | Contract-hour rollover/expiry | No — minutes stored; no utilization |
| — | Google/email identity linking | No — EPIC-003 F-001 |
| — | Production email provider | No — EPIC-003 F-003 |

Proposed, not accepted, not written into `MASTER_PLAN.md`:

| Proposed ID | Question | Implementation default |
| --- | --- | --- |
| OBD-013 | Duplicate company name / VAT / tax code policy | Duplicates allowed (EPIC-101) |
| OBD-014 | VAT / tax-identifier country, format, requiredness | Optional unconstrained strings (EPIC-101) |
| OBD-015 | Archived-client editability, unarchive, and selectability for contracts and time entries | Create rejected; existing contracts readable/editable; no unarchive |
| OBD-016 | Whether commercial fields may change after TimeEntries exist | Edits allowed; no versioning/snapshotting |

Those defaults are temporary. They do not close the decisions.

---

## 18. Deferred Work

Out of scope and not started:

- R1-E03 — Time Tracking
- F-021 current-period hours and client-list active-contract column
- billing calculation, utilization, invoicing
- `MONTHLY_FIXED`
- contract versioning / rate snapshots
- unarchive / physical delete
- workspace switcher or multi-workspace administration
- OWNER / MEMBER permission semantics
- EPIC-002 / EPIC-003 / EPIC-004 finding remediation
- formal UX Review
- production validation
- production certification

---

## 19. Production-Readiness Limitations

EPIC-102 engineering completion is not production certification.

Still required before any production-ready claim:

- later product Epics starting at R1-E03 Time Tracking
- production password-reset email provider (F-003)
- Google/email identity-linking decision (F-001)
- resolution of the concurrent first-workspace limitation (F-004-001) by a method that does not add `UNIQUE(userId)`
- Product Owner decisions on proposed OBD-013 / OBD-014 / OBD-015 / OBD-016 and P102-F-001
- formal UX Review
- production validation and production certification stages

This review does not certify WCAG conformance, production-ready authentication, production-ready multi-tenant operations, or Release readiness.

```text
EPIC-102 engineering completion
        ≠
production validation
        ≠
production certification
        ≠
READY FOR RELEASE
```

---

## 20. Epic Verdict

```text
PASS WITH FINDINGS
```

| Dimension | Result |
| --- | --- |
| Scope compliance | PASS |
| Architecture | PASS |
| Domain correctness | PASS |
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
| New EPIC-102 findings | P102-F-001 |
| Blocking findings | None |
| Epic engineering completion | YES |
| Full production readiness | NO |

Required EPIC-102 acceptance criteria are satisfied. Quality gates passed under the locked CI contract in P102-03. Inherited findings remain open and do not belong to this Epic as new defects.

---

## 21. Recommended Next Step

```text
READY FOR R1-E03
```

Create `docs/epics/EPIC-103/epic-plan.md` before implementation.

Treat R1-E03 as Time Tracking. Do not rebuild the Contract, Client, UI, or testing/CI stack. Do not close OBD-001 through OBD-012. Do not promote proposed OBD-013 / OBD-014 / OBD-015 / OBD-016 unless the Product Owner accepts them. Do not fix P102-F-001 by adding snapshots unless that Epic’s plan explicitly requires it. Do not fix EPIC-003 or EPIC-004 findings unless that plan explicitly requires it.

---

## Review Evidence

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS (P102-03) |
| `pnpm typecheck` | PASS (P102-03) |
| `pnpm test` | PASS (116) |
| `pnpm test:integration` | PASS (75) |
| Playwright (`CI=true`, 1 worker) | PASS (15) |
