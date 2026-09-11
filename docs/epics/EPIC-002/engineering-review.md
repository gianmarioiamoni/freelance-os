# EPIC-002 — Engineering Review

**Epic:** EPIC-002 — Database & Persistence  
**Release:** Release 0 — Foundation  
**Reviewed commits:**

```text
f0ebc6c feat(storage): establish postgres and prisma foundation
c0c4bbd feat(storage): implement core persistence schema
8189227 feat(storage): establish persistence repositories and invariants
9208958 test(storage): verify persistence invariants
```

**Phase 4 validation evidence reused:** 20 integration tests, 8 unit tests. No application/schema/migration code was changed in this review.

---

## 1. Executive Summary

EPIC-002 delivers a PostgreSQL/Prisma persistence foundation that later Epics can use without implementing business workflows.

The implemented schema, constraints, repository boundary, seed, isolated test database, and CI database gate match `docs/storage.md` and the Epic plan. Remaining issues are classified findings and open business decisions. None are blockers or unresolved High findings.

```text
VERDICT: PASS WITH FINDINGS
READY FOR EPIC-003
```

---

## 2. Scope Reviewed

Verified against `MASTER_PLAN.md`, `docs/epics/EPIC-002/epic-plan.md`, `docs/storage.md`, `docs/domain-model.md`, and `docs/architecture.md`.

Inspected implementation:

- `prisma/schema.prisma`
- `prisma/migrations/`
- `src/domain/repositories.ts`
- `src/infrastructure/persistence/`
- `src/infrastructure/prisma/`
- persistence integration tests
- `package.json`
- `.github/workflows/quality.yml`

| Area | Documented | Implemented | Verified |
| --- | --- | --- | --- |
| PostgreSQL + Prisma 6 + migrations + lock | Yes | Yes | Yes |
| Environment configuration (`DATABASE_URL`, `TEST_DATABASE_URL`) | Yes | Yes | Yes |
| Server-only Prisma Client lifecycle | Yes | Yes | Yes |
| Application-owned models (8 entities) | Yes | Yes | Yes |
| Workspace isolation (columns, composite FKs, repository scoping) | Yes | Yes | Yes |
| Standard FKs, uniqueness, indexes | Yes | Yes | Yes |
| CHECK constraints (duration, rate, thresholds) | Yes | Yes | Yes |
| Contract temporal exclusion `[validFrom, validTo)` | Yes | Yes | Yes |
| Monetary `NUMERIC(19,4)` / integer minutes | Yes | Yes | Yes |
| Restrict deletion / client archive | Yes | Yes | Yes |
| Domain repository ports + Infrastructure implementations | Yes | Yes | Yes |
| Prisma confinement (no Domain/UI import) | Yes | Yes | Yes |
| Transaction helper | Yes | Yes | Yes |
| Deterministic, synthetic, idempotent seed | Yes | Yes | Yes |
| Isolated PostgreSQL test DB, migration-only setup | Yes | Yes | Yes |
| CI PostgreSQL 17 + migrate + integration + unit + lint + typecheck + build | Yes | Yes | Yes |
| Authentication tables / Better Auth | Out of scope | Not present | Yes |
| Separate ADR files | Candidates in `docs/storage.md` §36 | Not created | Accepted — decisions already canonical in storage docs |

---

## 3. Architecture Review

### Modular monolith boundary

Presentation, Application, Domain, and Infrastructure directories remain in place. Persistence is an Infrastructure concern. No business UI, auth, or CRUD workflows were added.

### Prisma Infrastructure boundary

Prisma Client lives in `src/infrastructure/prisma/client.ts` with `server-only`. Generated types are mapped at the Infrastructure boundary. Domain ports and records do not import Prisma.

### Repository ports

`src/domain/repositories.ts` defines workspace-scoped operations required to prove the foundation. Implementations live under `src/infrastructure/persistence/`. Ports are use-case oriented rather than generic CRUD.

### Workspace isolation

Every application-owned business table carries `workspaceId`. Composite FKs prevent cross-workspace Client/Contract/TimeEntry/Member references. Optional Alert/Notification references add matching composite FKs in SQL (`MATCH SIMPLE`). Repository reads/writes take an explicit `workspaceId`, except workspace creation and `getWorkspaceById`.

Authorization and membership enforcement remain EPIC-003 / EPIC-004.

### Transaction boundary

`runInTransaction` wraps work in `prisma.$transaction` and rebuilds repositories on the transaction client. Atomicity is established; complete business workflows are not implemented.

---

## 4. Persistence Review

Implemented models: Workspace, WorkspaceMember, Client, Contract, TimeEntry, WorkspaceSettings, Alert, Notification.

They match `docs/storage.md`: UUID keys, DATE business dates, TIMESTAMPTZ instants, integer minutes, `NUMERIC(19,4)` rates, ISO-4217 `CHAR(3)` currency, `[validFrom, validTo)` with NULL open-ended `validTo`, `TimeEntry.contractId` required, Client archive rather than physical delete.

Authentication identity remains a logical `userId`. No Better Auth tables were created.

OBD-001–OBD-012 were not converted into schema rules.

---

## 5. Database Integrity

| Concern | Implementation |
| --- | --- |
| Standard FKs | Present; `ON DELETE RESTRICT` |
| Composite FKs | Contract→Client; TimeEntry→Member/Client/Contract (includes client+contract ownership); Alert/Notification optional refs in SQL |
| CHECK | `durationMinutes > 0`; `rate > 0`; warning percents `0 < n <= 100` |
| Exclusion | `btree_gist` + `daterange(validFrom, validTo, '[)')` per workspace+client |
| Indexes | Workspace-leading indexes documented for Client, Contract, TimeEntry, Alert, Notification |
| Uniqueness | Membership PK; settings PK; Alert `(workspaceId, deduplicationKey)`; composite unique keys required by FKs |
| Money | `Decimal(19,4)` persisted; mapped to a 4-decimal string |
| Duration | `Int` minutes |
| Deletion | Restrict on FKs; Client `ACTIVE` → `ARCHIVED` |

`Alert.clientId` and `Alert.contractId` are independently optional. The database does not prove they refer to the same client (F-P3-002).

---

## 6. Testing Review

Phase 4 evidence, still valid (no application/schema/migration change in Phase 5):

```text
integration tests: 20
unit tests: 8
```

Coverage actually implemented:

- migration verification (`tests/integration/persistence/migrations.test.ts`)
- CHECK constraints (duration, rate, settings thresholds)
- contract temporal exclusion (overlap, open-ended, cross-client/workspace)
- foreign keys and cross-workspace references
- workspace isolation through repository operations
- repository persistence, historical `contractId`, monetary precision (`80.0000`, `500.1234`), integer duration
- Alert/Notification workspace consistency; F-P3-002 documented as not inferred
- `runInTransaction` commit and rollback
- seed: documented synthetic dataset, idempotent

No additional tests were invented or executed for this review.

---

## 7. CI Review

`.github/workflows/quality.yml` starts PostgreSQL 17, sets isolated `freelanceos_test` credentials, then:

```text
lint → typecheck → pnpm test:db:migrate → unit tests → pnpm test:integration → build
```

`pnpm test:db:migrate` runs `prisma migrate deploy` against `TEST_DATABASE_URL` only. Integration setup refuses the development database name. `prisma db push` is not used. No deploy job. No committed secrets.

---

## 8. Findings

### F-P3-002

- **Severity:** Medium
- **Description:** `Alert.clientId` and `Alert.contractId` do not guarantee that the contract belongs to the same client.
- **Impact:** A future alert writer could persist a contract/client pair that is workspace-valid but commercially inconsistent.
- **Disposition:** application/domain responsibility. No new database mechanism invented.

### F-P2-003

- **Severity:** Low
- **Description:** `Notification.type` remains `String`.
- **Impact:** Notification categories are unconstrained at the database.
- **Disposition:** no documented catalog; no enum invented.

### F-P2-004

- **Severity:** Medium
- **Description:** `TimeEntry.contractId` is required.
- **Impact:** Non-billable entries without a contract cannot be stored.
- **Disposition:** open. Schema not modified.

### F-P2-005

- **Severity:** Low
- **Description:** Enum and role model were not expanded beyond `OWNER` / `MEMBER`.
- **Impact:** Fine-grained authorization is not modeled.
- **Disposition:** OBD-009 remains open.

No Blocker or High findings.

---

## 9. Open Decisions

All remain open. None were closed by this review.

| ID | Decision |
| --- | --- |
| OBD-001 | Exact daily-rate billing semantics, including partial days |
| OBD-002 | Money rounding and currency precision |
| OBD-003 | Entries crossing midnight |
| OBD-004 | Holiday model |
| OBD-005 | Vacation/absence model |
| OBD-006 | Exact capacity warning threshold semantics |
| OBD-007 | Editing/deleting entries after billing-period closure |
| OBD-008 | Audit-log requirements |
| OBD-009 | Workspace roles and permissions |
| OBD-010 | Payment-term catalog/detail |
| OBD-011 | Multi-currency behavior |
| OBD-012 | Contract-hour rollover/expiry |

---

## 10. Exit Criteria

Criteria from `docs/epics/EPIC-002/epic-plan.md` §31.

| Criterion | Result |
| --- | --- |
| PostgreSQL development database is configured | PASS |
| Prisma is configured | PASS |
| Prisma schema reflects `docs/storage.md` | PASS |
| All application-owned storage entities are implemented | PASS |
| Workspace ownership is structurally enforced | PASS |
| Foreign-key integrity is enforced | PASS |
| Contract overlap is prevented | PASS |
| Historical contract references are preserved | PASS |
| Duration uses integer minutes | PASS |
| Monetary values use exact representation | PASS |
| Required indexes exist | PASS |
| Required uniqueness constraints exist | PASS |
| Migrations create the database from a clean state | PASS |
| Seed data is deterministic | PASS |
| Repository boundaries isolate Prisma | PASS |
| Domain code does not import Prisma | PASS |
| UI code does not import Prisma | PASS |
| Integration tests cover critical storage invariants | PASS |
| Cross-workspace access tests pass | PASS |
| CI can execute persistence tests | PASS |
| No open business decision was silently resolved | PASS |
| Documentation is synchronized | PASS |
| Engineering Review exists | PASS |
| No BLOCKER/HIGH finding remains unresolved | PASS |
| Repository is ready for EPIC-003 | PASS |

Epic-plan §34 pipeline: PostgreSQL → Prisma → Schema → Migrations → Constraints → Repositories → Seed → Integration Tests → CI → Engineering Review → READY FOR EPIC-003: **PASS**.

---

## 11. Verdict

```text
PASS WITH FINDINGS
```

---

## 12. Recommendation

EPIC-003 may start.

```text
READY FOR EPIC-003
```

Do not implement authentication, workspace onboarding, or persistence redesign in this Epic. Preserve F-P3-002, F-P2-003, F-P2-004, F-P2-005, and OBD-001–OBD-012.
