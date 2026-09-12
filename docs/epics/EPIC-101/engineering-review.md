# EPIC-101 — Engineering Review

**Epic:** EPIC-101 — Clients  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E01 — Client Management  
**Reviewed commits:**

```text
d54b353f6ae55e0b122720f38bb98fe8c317f557
feat(clients): add client application services

3206d5245f6766cec5027b8da5ed4e446beb1275
feat(clients): add authenticated client management ui

bd181de83e2c9d496ec67d7d891c58ee78f1e6dc
test(clients): cover isolation and client journeys
```

Phase 4 is documentation and Engineering Review only. No application, schema, route, authentication, workspace, CI, or test-architecture change was added in this review.

---

## 1. Executive Summary

EPIC-101 completes workspace-scoped client master-data management. It does not start Contract Management.

Phase 1 added application services, parse-function validation, domain errors, and `ClientRepository.updateClient`. Phase 2 replaced the `/clients` placeholder with authenticated list, archived view, create, detail, edit, and archive surfaces. Phase 3 added workspace isolation integration tests and the Playwright client journey. Phase 4 synchronizes documentation with that implemented state.

No new EPIC-101 product finding exists.

```text
VERDICT: PASS
EPIC ENGINEERING COMPLETION: YES
PRODUCTION READINESS: NO
READY FOR R1-E02
```

EPIC-101 closes Client Management engineering work only. Contract Management, inherited findings, proposed OBDs, formal UX Review, and production validation/certification remain required.

---

## 2. Scope Delivered

Verified against `MASTER_PLAN.md` R1-E01, `docs/epics/EPIC-101/epic-plan.md`, `docs/architecture.md`, `docs/storage.md`, `docs/testing-strategy.md`, `docs/product-vision.md` F-020–F-024, `docs/domain-model.md`, the Phase 1–3 commits, and the current repository.

| Area | Documented | Implemented | Verified |
| --- | --- | --- | --- |
| Workspace-scoped Client master data | Yes | Yes | Yes |
| Create (`ACTIVE`) | Yes | Yes | Yes |
| List `ACTIVE` | Yes | Yes | Yes |
| Archived view (`?status=archived`) | Yes | Yes | Yes |
| Detail | Yes | Yes | Yes |
| Edit | Yes | Yes | Yes |
| Archive (no delete, no unarchive) | Yes | Yes | Yes |
| Server Actions for mutations | Yes | Yes | Yes |
| RSC / application-service reads | Yes | Yes | Yes |
| `updateClient` repository method | Yes | Yes | Yes |
| Parse-function validation (no Zod) | Yes | Yes | Yes |
| Isolation integration tests | Yes | Yes | Yes |
| Client E2E journey | Yes | Yes | Yes |
| Client distinct from Contract | Yes | Yes | Yes |
| Contract management | Forbidden | Absent | Yes |
| Prisma schema / migration | Forbidden | Unchanged | Yes |
| Free-text search / pagination | Deferred | Absent | Yes |
| F-021 / F-022 contract and hours | Deferred | Absent | Yes |
| Production readiness | Forbidden | Not claimed | Yes |

MASTER_PLAN R1-E01 allows “search/filter as justified by UX.” This Epic implemented status filter only (ACTIVE default + archived view). That resolution is recorded in the Epic plan §26 and is not treated as missing implementation.

---

## 3. Scope Compliance

**Verdict:** PASS

In scope and present:

- create, list ACTIVE, archived view, detail, edit, archive
- authenticated `(app)` routes under `/clients`
- application services under `src/application/clients/`
- feature folder `src/features/clients/`
- repository completion (`updateClient`)

Out of scope and absent:

- Contract create/edit/history/validity/billing
- time entries, hours, billing summaries
- physical delete
- unarchive
- uniqueness migration
- Dialog / Table / DataTable expansion of the UI foundation
- role-specific client permissions
- audit log
- `qa-report.md`, `ux-review.md`, `production-validation.md`

`/contracts` remains a structural placeholder.

---

## 4. Client vs Contract Separation

**Verdict:** PASS

`Client` remains identity (who). `Contract` remains the commercial agreement (how). EPIC-101 does not create, edit, list, or display contracts.

Detail shows master-data fields and status only. No empty contract or hours panel was added. `Client` persistence relations to `Contract` / `TimeEntry` / `Alert` stay unused by this Epic.

---

## 5. Domain Behavior

**Verdict:** PASS

```text
create → ACTIVE
edit master data → status unchanged
archive → ARCHIVED
```

Confirmed:

- `companyName` required after trim
- optional fields trim to `null`
- create ignores client-supplied `status` / `workspaceId`
- edit does not change `id`, `workspaceId`, or status
- archive is `ACTIVE` → `ARCHIVED` via `archiveClient` only; already-archived archive is idempotent
- no unarchive
- no physical delete
- default list is `ACTIVE`, `companyName` ascending
- archived view uses `listClients(workspaceId, "ARCHIVED")`
- duplicates allowed (proposed OBD-013 default)
- archived clients remain editable (proposed OBD-015 implementation default; not a product decision)

---

## 6. Persistence / Repository Boundary

**Verdict:** PASS

```text
NO SCHEMA CHANGE
NO MIGRATION
NO prisma db push
```

`Client` / `ClientStatus` remain the EPIC-002 model. Phase 1 added TypeScript-only `UpdateClientInput` and `ClientRepository.updateClient`. Writes use `updateMany` / `findFirst` scoped by `{ id, workspaceId }`. Zero rows → `RecordNotFoundError`. `workspaceId` and `status` are not updated through edit.

Pages and Server Actions do not import Prisma. Infrastructure remains `src/infrastructure/persistence/client-repository.ts`.

Migration set is unchanged: last application index remains `20260912180000_index_workspace_member_user_id`.

---

## 7. Workspace Isolation

**Verdict:** PASS

Every client operation uses server-resolved `WorkspaceContext.workspaceId`.

```text
Better Auth session
  → getCurrentWorkspaceContext()
  → context.workspaceId
  → application service
  → ClientRepository(workspaceId, …)
```

Confirmed:

- foreign-workspace `clientId` → `ClientNotFoundError` on get / update / archive
- list does not return foreign-workspace rows
- update cannot move a client to another workspace
- missing and foreign ids are indistinguishable at the UI (`notFound()`)
- query `status=archived` is a list filter, not authorization (P101-R-001)

---

## 8. Authorization

**Verdict:** PASS

`(app)` remains the authenticated workspace gate. Client routes are not reachable without a session and exactly one membership.

Any workspace member may create, view, edit, and archive clients. `role` is not interpreted (OBD-009). Browser `workspaceId` is not read from form, path, query, or cookie as a tenant grant. `clientId` is a resource id only.

No client-side `WorkspaceProvider`, workspace store, or switcher was added.

---

## 9. Application / Service Boundaries

**Verdict:** PASS

```text
Server Action / RSC
  → application service
  → domain validation / errors
  → ClientRepository port
  → Prisma infrastructure
```

| Operation | Location |
| --- | --- |
| `createClient` | `src/application/clients/create-client.ts` |
| `listClients` | `src/application/clients/list-clients.ts` |
| `getClient` | `src/application/clients/get-client.ts` |
| `updateClient` | `src/application/clients/update-client.ts` |
| `archiveClient` | `src/application/clients/archive-client.ts` |
| `parseClientWriteInput` | `src/application/clients/client-input.ts` |

Mutations: `createClientAction`, `updateClientAction`, `archiveClientAction`. Reads: `loadWorkspaceClients` / `loadWorkspaceClient`. Features import application services and existing session / repository factories. They do not import Prisma or the Better Auth server instance.

---

## 10. UI Architecture

**Verdict:** PASS

| Route | Role |
| --- | --- |
| `/clients` | ACTIVE list; `h1` remains `Clients` |
| `/clients?status=archived` | archived view |
| `/clients/new` | create |
| `/clients/[clientId]` | detail + archive confirmation |
| `/clients/[clientId]/edit` | edit |

List, detail, and page headers are server components. `ClientForm` and `ArchiveClientForm` are the client islands (`useActionState`). Shared Field / Button / Card / Alert / EmptyState / PageHeader primitives are reused. No Dialog, Table, or DataTable was added.

Dashboard, Contracts, Time Tracking, Reports, Alerts, and Settings remain placeholders.

---

## 11. Validation

**Verdict:** PASS

Validation matches workspace parse functions. Zod was not added.

- `companyName`: required, max 255
- `contactName`: optional, max 255
- `address` / `notes`: optional, max 4000
- `phone`: optional, max 50
- `email`: optional; must contain a single `@` with non-empty sides
- `vatNumber` / `taxCode`: optional unconstrained strings (proposed OBD-014)

Server Actions map `InvalidClientInputError` to field messages. Client-side `required` / `maxLength` are UX only.

---

## 12. Error / Loading / Empty States

**Verdict:** PASS

| State | Behavior |
| --- | --- |
| Empty ACTIVE list | `EmptyState` “No active clients” |
| Empty archived list | `EmptyState` “No archived clients” |
| Missing / foreign client | `(app)/not-found` |
| Field validation | Field error via existing `Field` association |
| Mutation failure | user-safe Alert; no Prisma / SQL / stack |
| Archive confirm | explicit confirm step; cancel returns to detail |
| Route loading / error | inherited `(app)/loading.tsx` and `error.tsx` |

---

## 13. Accessibility Baseline

**Verdict:** PASS — baseline only

This is not WCAG certification.

Present:

- meaningful `h1` titles; list title remains `Clients`
- Field label association, `aria-invalid` / `aria-describedby` on errors
- status as text (`Active` / `Archived`), not color alone
- keyboard-reachable links and submit / cancel actions
- archive confirmation copy before the destructive submit

Formal UX Review is a later lifecycle activity. No `ux-review.md` was created.

---

## 14. Testing / CI Review

**Verdict:** PASS

Phase-gate evidence (not re-run here except Phase 4):

| Phase | Unit | Integration | E2E | Notes |
| --- | --- | --- | --- | --- |
| P101-01 | 82 | 60 | — | application services + repository `updateClient` |
| P101-02 | 82 | 60 | — | browser flows verified; no new unit/integration tests |
| P101-03 | 82 | 62 | 14 | isolation tests + client journey |
| P101-04 | 82 | 62 | 14 | this review |

Phase 4 quality evidence:

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (82) |
| `pnpm test:integration` | PASS (62) |
| `CI=true pnpm test:e2e` | PASS (14 tests, 1 worker) |

A first `pnpm test:e2e` without `CI` used 5 workers. The inherited password-recovery journey failed once. `CI=true pnpm test:e2e` (locked contract, one worker) passed all 14, including that journey and the client journey. This is the EPIC-003 F-004 / EPIC-005 worker contract, not an EPIC-101 defect.

Client coverage added by this Epic:

- unit: `parseClientWriteInput`; create / list / get / update / archive services
- integration: repository `updateClient`; cross-workspace get / update / archive / list denial
- Playwright: empty ACTIVE list → create → list → detail → edit → archive → absent from ACTIVE → visible in archived view

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

## 15. P101-02 Hydration Observation

P101-02 reported a hydration warning during Cursor browser snapshots.

Subsequent investigation established:

- the mismatch was caused by Cursor browser instrumentation adding `data-cursor-ref` attributes
- `PageHeader` itself has no unstable client logic
- `/`, `/contracts`, and `/clients` did not reproduce the issue
- `/clients/new` and `/clients/[id]/edit` showed the instrumentation effect because `ClientForm` hydrates more slowly
- no application code change was necessary
- no corrective commit was created

This is a tooling/instrumentation observation, not an application defect. It is not an open EPIC-101 product finding.

---

## 16. Security Considerations

**Verdict:** PASS

- workspace isolation on every read and write
- foreign-workspace ids fail closed as not-found
- browser `workspaceId` is not authorization
- status query string is a filter only
- Server Actions re-resolve session and workspace context
- user-safe errors; no Prisma / SQL leakage
- no new secrets, auth providers, or rate-limit changes
- production Better Auth rate limits were not weakened

---

## 17. Documentation Review

**Verdict:** PASS after Phase 4 synchronization

Phase 4 updated stale status in `MASTER_PLAN.md`, `docs/architecture.md`, `docs/testing-strategy.md`, `docs/storage.md`, `docs/epics/EPIC-101/epic-plan.md`, `README.md`, and `CHANGELOG.md`.

Documents now describe implemented client management. They do not claim:

- production readiness
- MVP completeness
- Contract Management
- schema or migration change
- closure of OBD-001 through OBD-012
- promotion of proposed OBD-013 / OBD-014 / OBD-015
- closure of inherited findings

---

## 18. Findings

No new EPIC-101 finding.

Inherited findings remain open and are not closed by this review.

### EPIC-004 F-004-001

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open / accepted persistence limitation
- **Description:** Concurrent first-workspace creation can produce two memberships. Out of scope for EPIC-101.

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

EPIC-002 findings F-P3-002, F-P2-003, F-P2-004, and F-P2-005 remain unchanged and outside this epic. F-P2-005 continues as OBD-009.

No Blocker or High findings. No new Medium findings.

---

## 19. Open Business Decisions

Do not close any OBD. Do not promote proposed OBDs.

| ID | Decision | Blocks EPIC-101? |
| --- | --- | --- |
| OBD-001 | Daily-rate semantics / partial days | No |
| OBD-002 | Monetary rounding | No |
| OBD-003 | Midnight-crossing entries | No |
| OBD-004 | Holiday model | No |
| OBD-005 | Vacation/absence model | No |
| OBD-006 | Capacity warning threshold | No |
| OBD-007 | Post-closure edits/deletes | No |
| OBD-008 | Audit requirements | No — no audit log |
| OBD-009 | Workspace roles | No — any member may manage clients |
| OBD-010 | Payment-term catalog | No |
| OBD-011 | Multi-currency | No |
| OBD-012 | Contract-hour rollover/expiry | No |
| — | Google/email identity linking | No — EPIC-003 F-001 |
| — | Production email provider | No — EPIC-003 F-003 |

Proposed, not accepted, not written into `MASTER_PLAN.md`:

| Proposed ID | Question | Implementation default |
| --- | --- | --- |
| OBD-013 | Duplicate company name / VAT / tax code policy | Duplicates allowed |
| OBD-014 | VAT / tax-identifier country, format, requiredness | Optional unconstrained strings |
| OBD-015 | Archived-client editability, unarchive, future selection | Archived clients remain editable; no unarchive; selection rules deferred |

Those defaults are temporary. They do not close the decisions.

---

## 20. Deferred Work

Out of scope and not started:

- R1-E02 — Contract Management
- time tracking, analytics, alerts, notifications
- F-021 / F-022 contract and current-period hours on list/detail
- free-text search, user-controlled sort, pagination
- unarchive / physical delete
- uniqueness constraints
- workspace switcher or multi-workspace administration
- OWNER / MEMBER permission semantics
- EPIC-003 / EPIC-004 finding remediation
- formal UX Review
- production validation
- production certification

---

## 21. Production-Readiness Limitations

EPIC-101 engineering completion is not production certification.

Still required before any production-ready claim:

- later product Epics starting at R1-E02 Contract Management
- production password-reset email provider (F-003)
- Google/email identity-linking decision (F-001)
- resolution of the concurrent first-workspace limitation (F-004-001) by a method that does not add `UNIQUE(userId)`
- Product Owner decisions on proposed OBD-013 / OBD-014 / OBD-015
- formal UX Review
- production validation and production certification stages

This review does not certify WCAG conformance, production-ready authentication, production-ready multi-tenant operations, or Release readiness.

```text
EPIC-101 engineering completion
        ≠
production validation
        ≠
production certification
        ≠
READY FOR RELEASE
```

---

## 22. Epic Verdict

```text
PASS
```

| Dimension | Result |
| --- | --- |
| Scope compliance | PASS |
| Client vs Contract | PASS |
| Domain behavior | PASS |
| Persistence / no schema drift | PASS |
| Workspace isolation | PASS |
| Authorization | PASS |
| Application / service boundaries | PASS |
| UI architecture | PASS |
| Validation | PASS |
| Error / loading / empty | PASS |
| Accessibility baseline | PASS — not WCAG certification |
| Tests | PASS |
| CI | PASS |
| Security | PASS |
| Documentation | PASS |
| New EPIC-101 findings | None |
| Blocking findings | None |
| Epic engineering completion | YES |
| Full production readiness | NO |

Required EPIC-101 acceptance criteria are satisfied. Quality gates pass under the locked CI contract. Inherited findings remain open and do not belong to this Epic as new defects.

---

## 23. Recommended Next Step

```text
READY FOR R1-E02
```

Create `docs/epics/EPIC-102/epic-plan.md` before implementation.

Treat R1-E02 as Contract Management. Do not rebuild the Client, UI, or testing/CI stack. Do not close OBD-001 through OBD-012. Do not promote proposed OBD-013 / OBD-014 / OBD-015 unless the Product Owner accepts them. Do not fix EPIC-003 or EPIC-004 findings in that Epic unless its plan explicitly requires it.

---

## Review Evidence

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (82) |
| `pnpm test:integration` | PASS (62) |
| Playwright (`CI=true`, 1 worker) | PASS (14) |
