# EPIC-005 — Testing & CI Foundation

## 1. Epic Identity

**Epic:** EPIC-005  
**Release:** Release 0 — Foundation  
**Objective:** Testing & CI Foundation  
**Status:** COMPLETE — PASS  
**Depends on:** EPIC-001 — Foundation / Repository; EPIC-002 — Database & Persistence; EPIC-003 — Authentication; EPIC-004 — Workspace  
**Next Epic:** EPIC-006 — UI Foundation  
**Canonical source:** `MASTER_PLAN.md` R0-E05 — Testing & CI Foundation

MASTER_PLAN naming variants exist (`Testing & CI` vs `Testing & CI Foundation`). This plan uses the R0-E05 title. Do not treat the shorter name as a different Epic.

---

## 2. Status

```text
IMPLEMENTATION COMPLETE
CERTIFICATION: PASS
PRODUCTION READINESS: NO
READY FOR EPIC-006
```

Reviewed commits:

```text
71b8e2ee6078a45c6b48cb66c5cb4868d851211b
test(ci): align e2e with isolated database and lock quality gates

0ba1aa888b28bcb2a1cc61dfe6038a2009adef97
test(ci): lock workspace isolation and authorization regressions
```

Phase 3 is documentation and certification only. Review:
`docs/epics/EPIC-005/engineering-review.md`.

Prior Epic engineering status (do not reopen as EPIC-005 product work):

```text
EPIC-002 PASS WITH FINDINGS
EPIC-003 PASS WITH FINDINGS
EPIC-004 PASS WITH FINDINGS
```

EPIC-004 review: `docs/epics/EPIC-004/engineering-review.md`  
Recommended next step there: `READY FOR EPIC-005`

This Epic does **not** recreate Vitest, Playwright, the isolated PostgreSQL test database, or `.github/workflows/quality.yml`. Those already exist. EPIC-005 formalizes them as the Foundation contract and closes only remaining reliability/documentation gaps.

---

## 3. Objective

Establish the Testing & CI Foundation required so later Epics inherit a single, documented, deterministic quality system.

From `MASTER_PLAN.md` R0-E05, this Epic establishes:

- Vitest
- integration test environment
- Playwright
- test database strategy
- CI quality gates
- initial isolation/security tests

Repository evidence shows those six items are already present from EPIC-002/003/004. The precise purpose of EPIC-005 is therefore:

```text
formalize the existing stack as the Foundation
→ close remaining reliability gaps
→ lock isolation/security as a regression baseline
→ synchronize documentation with reality
→ produce the EPIC-005 Engineering Review
```

Do not change the MASTER_PLAN objective. Do not interpret “establish” as “rebuild from zero.”

---

## 4. Scope

Testing/CI foundation work only.

### In scope

- treat the existing Vitest / Playwright / PostgreSQL / GitHub Actions stack as the Foundation;
- close the verified local-vs-CI E2E database mismatch;
- lock the CI pipeline and the Playwright constraint (`pnpm dev` + one worker) as a regression contract;
- lock the existing isolation/security suite as the Foundation baseline (retain; do not duplicate);
- add only missing foundation assertions that current tests do not already cover;
- document the test database strategy, E2E strategy, and CI environment as implemented;
- synchronize stale planning documents;
- produce `docs/epics/EPIC-005/engineering-review.md` during the documentation phase.

### Out of scope

See §5.

---

## 5. Non-Goals

Do not implement:

- business feature implementation (clients, contracts, time tracking, analytics, billing, alerts, notifications, dashboard, reporting);
- client/contract/time-tracking tests beyond what already exists as persistence invariants;
- dashboard/reporting tests;
- production QA of the full MVP;
- UX review or UX polish;
- production validation;
- production certification;
- application feature refactoring unrelated to testing/CI;
- changing business rules;
- redesigning authorization or workspace resolution;
- fixing unrelated EPIC-002 / EPIC-003 / EPIC-004 findings (F-P3-002, F-P2-003, F-P2-004, F-P2-005, F-001, F-002, F-003, F-004-001);
- weakening Better Auth production rate limits to remove F-004;
- switching CI Playwright to `next start`;
- adding cloud test services, coverage gates, property-based testing, or accessibility suites;
- adding `UNIQUE(userId)` on `WorkspaceMember`;
- closing OBD-008, OBD-009, or any other open business decision;
- silently resolving testing-strategy open decisions that encode product rules (daily-rate, rounding, roles, audit);
- renaming or relocating existing test files merely to match the recommended folder sketch in `docs/testing-strategy.md` §47.

A test helper or CI-contract assertion may be added even though product modules belong to later Epics.

---

## 6. Source of Truth

Implementation must follow these documents in priority order:

1. `MASTER_PLAN.md`
2. `docs/architecture.md`
3. `docs/storage.md`
4. `docs/product-vision.md`
5. `docs/domain-model.md`
6. `docs/testing-strategy.md`
7. this Epic Plan
8. `docs/epics/EPIC-004/engineering-review.md` for workspace isolation baseline
9. `docs/epics/EPIC-003/engineering-review.md` for auth/CI/E2E constraints
10. `docs/epics/EPIC-002/engineering-review.md` for persistence test-database baseline

Where documents disagree, do not silently reconcile them. Record the discrepancy in the Engineering Review. Authoritative status and next work remain `MASTER_PLAN.md`. Persistence invariants remain `docs/storage.md`. Authentication ownership remains the EPIC-003 boundary. Workspace authorization ownership remains the EPIC-004 boundary.

Where a required detail is not specified, mark it unresolved. Do not invent product rules.

---

## 7. Current Repository State

Inspected: `package.json`, `vitest.config.mts`, `vitest.integration.config.mts`, `playwright.config.ts`, `.github/workflows/quality.yml`, `scripts/test-db-migrate.mjs`, `tests/**`, `.env.example`, EPIC-002/003/004 engineering reviews.

EPIC-004 review evidence (do not treat as live counts after later commits):

```text
pnpm test                 PASS (49)
pnpm test:integration     PASS (59)
Playwright CI=true        PASS (12)
pnpm lint / typecheck / build  PASS
```

### 7.1 IMPLEMENTED ALREADY

Do not describe the following as future work.

**Unit testing (Vitest 4.1.11)**

- Script: `pnpm test` → `vitest run`
- Config: `vitest.config.mts`
- Include: `tests/unit/**/*.test.ts`
- Environment: Node
- Alias: `@` → `src`
- Coverage: auth route access; workspace resolution 0 / 1 / >1; membership denial; identifier substitution; first-workspace validation; Google provider config; email-delivery mode; password-reset delivery; Prisma error mapping; navigation helper; CI workflow contract (`tests/unit/ci/quality-workflow.test.ts`)

**Integration testing (Vitest, isolated PostgreSQL)**

- Script: `pnpm test:integration`
- Config: `vitest.integration.config.mts`
- Include: `tests/integration/**/*.test.ts`
- Setup: `tests/integration/setup.ts`
- Isolation: `fileParallelism: false`, `maxWorkers: 1`
- `server-only` stub for Node execution
- Suites: persistence (migrations, constraints, FKs, contracts, repositories, transactions, seed, workspace isolation, notifications); auth (email/password, sessions, protected boundary, Google authorization URL, password recovery); workspace (membership resolution, first-workspace create/rollback, application boundary, authorization/isolation)

**Test database**

- Disposable PostgreSQL database; documented default name `freelanceos_test`
- Guard: `tests/integration/test-database-url.ts` requires `TEST_DATABASE_URL` and refuses `freelance_os` or any name that does not end in `_test`
- Migrate: `pnpm test:db:migrate` → `scripts/test-db-migrate.mjs` runs `prisma migrate deploy` with `DATABASE_URL` overridden to `TEST_DATABASE_URL`
- `prisma db push` is not used
- Per-test reset: `TRUNCATE ... RESTART IDENTITY CASCADE` of application and Better Auth tables
- Local setup documented in `README.md` and `.env.example`

**Playwright (1.63.0)**

- Script: `pnpm test:e2e`
- Config: `playwright.config.ts`
- `testDir`: `tests/e2e`
- Chromium only
- `retries: 0`
- `workers: 1` when `CI` is set; local default unrestricted
- `fullyParallel: !CI`
- `webServer.command`: `pnpm dev` (not `next start`)
- `reuseExistingServer: !CI`
- Journeys: auth (`tests/e2e/auth.spec.ts`), onboarding (`tests/e2e/onboarding.spec.ts`), app-shell gate (`tests/e2e/app-shell.spec.ts`)
- Password-reset helper reads Better Auth `verification` via Prisma (`tests/e2e/helpers/password-reset.ts`)

**CI quality gates (GitHub Actions)**

`.github/workflows/quality.yml` on `pull_request` and `push` to `main`:

```text
pnpm install --frozen-lockfile
→ prisma validate
→ prisma generate
→ lint
→ typecheck
→ test:db:migrate
→ unit tests
→ integration tests
→ build
→ playwright install chromium
→ Playwright E2E
```

Service: disposable `postgres:17`, database `freelanceos_test`.  
Env: `DATABASE_URL` and `TEST_DATABASE_URL` both point at that database; `BETTER_AUTH_SECRET`; `BETTER_AUTH_URL=http://localhost:3000`; `AUTH_EMAIL_DELIVERY=test`.  
Not set: `GOOGLE_CLIENT_*`, production mailer, SMTP.  
No deploy job. No committed secrets.

**Isolation / security tests**

| Guarantee | Where it already exists |
| --- | --- |
| Workspace isolation | `tests/integration/persistence/workspace-isolation.test.ts`; `tests/integration/workspace/authorization-isolation.test.ts` |
| Identifier substitution denial | unit `require-workspace-access`, `get-authorized-workspace`, `workspace-route-access`; integration authorization-isolation; Playwright onboarding query `workspaceId` is not authorization |
| Authenticated boundary | unit route-access; integration `protected-boundary`; Playwright unauthenticated redirects |
| Non-member denial | unit + integration authorization tests |
| No-membership behavior | unit `resolve-workspace-context`, route-access; integration authorization-isolation + boundary; Playwright onboarding redirect |
| Multiple-membership fail-closed | unit resolve/route-access; integration authorization-isolation (`/workspace-unavailable`) |

`getAuthorizedWorkspace` is the authorized read probe. `getWorkspaceById` is not treated as authorization.

**Test data**

- Persistence graph factory: `tests/integration/persistence/fixtures.ts` (`createWorkspaceGraph`)
- Auth helpers: `tests/integration/auth/helpers.ts` (`uniqueEmail`, `registerUser`, `signInHeaders`)
- E2E uses inline unique emails; password-reset helper is E2E-only
- Development seed covered by `tests/integration/persistence/seed.test.ts`

### 7.2 REQUIRED / GAP

These are the only foundation gaps this Epic may close.

| ID | Gap | Evidence |
| --- | --- | --- |
| G-001 | Local Playwright can write to the development database | Closed in Phase 1. E2E requires `TEST_DATABASE_URL` and refuses `freelance_os`. |
| G-002 | E2E has no reset; leftover users accumulate | Accepted. E2E uses unique emails on the isolated `*_test` database. |
| G-003 | CI contract does not lock F-004 | Closed in Phase 1. `quality-workflow.test.ts` asserts `pnpm dev` and CI `workers: 1`. |
| G-004 | Fail-closed `/workspace-unavailable` has no Playwright coverage | Accepted. Covered by unit + integration. Creating >1 membership has no product UI; E2E would need a test-only write. Not a missing primitive. |
| G-005 | Documentation still describes Foundation testing as not-yet-established | Closed in Phase 3. Canonical docs describe the implemented Foundation. |
| G-006 | `docs/testing-strategy.md` §39 mentions format/lint | Accepted. Lint is the CI style gate. |

G-004 and G-006 are accepted unless a phase explicitly chooses a minimal lock. Do not invent a formatter gate or a fail-closed E2E that requires a product path.

---

## 8. Architecture Impact

```text
NO RUNTIME ARCHITECTURE CHANGE
```

EPIC-005 must not change:

- modular monolith layers;
- Prisma / Better Auth / workspace authorization behavior;
- production rate limits;
- schema or migrations (unless a test-only documentation comment is required — prefer none);
- application routes or UI.

Allowed changes: test helpers, Playwright/Vitest config, CI contract tests, documentation, and Engineering Review.

If implementation discovers that a runtime change is required, stop and record it. Do not silently redesign.

---

## 9. Testing Architecture

This Epic does not introduce a new pyramid. It locks the one already running.

### 9.1 Unit

- Isolated Node tests
- No PostgreSQL, no browser
- Command: `pnpm test`
- Targets: application/domain rules that are already extracted; CI workflow contract; auth/workspace decision functions
- Do not add MVP billing/utilization/alert unit tests here

### 9.2 Integration

- Real PostgreSQL via `TEST_DATABASE_URL`
- Command: `pnpm test:integration`
- Sequential workers; truncate before each test
- Targets: repositories, constraints, migrations, auth adapters, workspace authorization
- Do not mock Prisma for persistence or authorization

### 9.3 E2E

- Playwright Chromium against the Next.js app
- Command: `pnpm test:e2e`
- Critical foundation journeys only: authentication, onboarding, authenticated shell gate
- Do not add client/contract/time/dashboard/report journeys

### 9.4 Test database lifecycle

```text
create isolated *_test database
→ TEST_DATABASE_URL
→ pnpm test:db:migrate   (prisma migrate deploy)
→ integration: TRUNCATE before each test
→ E2E: isolated DB (see Phase 1) + unique identities
```

Never migrate or test against `freelance_os`.

### 9.5 Test isolation

- Integration: shared DB, sequential execution, truncate
- Unit: process-local, no shared DB
- E2E: unique emails; after Phase 1, same isolated DB as integration
- Test order must not determine correctness

### 9.6 Test data strategy

- Keep small explicit helpers (`createWorkspaceGraph`, `registerUser`, `uniqueEmail`)
- Do not add a `createEverything()` fixture
- Do not relocate files to `tests/factories/` just to match the strategy sketch
- E2E unique-email helpers may be shared if Phase 1 touches those files; do not create a factory framework

### 9.7 Deterministic execution

- Playwright `retries: 0`
- CI Playwright: one worker
- Integration: one worker
- Auth email: `AUTH_EMAIL_DELIVERY=test`
- Google credentials: placeholders in integration setup; absent in CI
- No live Google consent/callback (F-002 remains)

### 9.8 Cleanup

- Integration: truncate list in `tests/integration/setup.ts` (application tables + `session` / `account` / `verification` / `user`)
- E2E: unique identities; CI database is disposable
- Phase 1 may point E2E at the isolated DB; it must not truncate the development database
- If E2E truncate is added, it must target only the isolated `*_test` database and must not race a reused `pnpm dev` against `freelance_os`

---

## 10. CI Architecture

Expected pipeline — already implemented; EPIC-005 must keep it and lock it:

```text
frozen-lockfile install
→ prisma validate
→ prisma generate
→ lint
→ typecheck
→ migrate deploy on TEST_DATABASE_URL
→ unit tests
→ integration tests
→ production build
→ Playwright E2E
```

### Playwright constraint (do not weaken)

```text
Playwright uses pnpm dev
one worker in CI
```

`next start` enables Better Auth production rate limits that collide across auth journeys on one CI IP. This is EPIC-003 F-004. Production rate limits stay as-is.

Phase 1 must extend the CI/Playwright contract tests so F-004 cannot be dropped accidentally.

Do not add: deploy jobs, coverage thresholds, paid cloud browsers, extra Playwright projects, or parallel CI E2E shards.

---

## 11. Isolation / Security Testing

Foundation-level guarantees (BR-001 / A-007 / F-011):

1. A member can access their workspace.
2. A non-member cannot access another workspace.
3. Identifier substitution of another workspace id is denied.
4. Unauthenticated users cannot use protected application routes.
5. Authenticated users with zero memberships are sent to onboarding; they do not receive a workspace context.
6. Authenticated users with more than one membership fail closed (`/workspace-unavailable`); they do not receive an ambiguous workspace context.
7. A browser-supplied `workspaceId` query is not authorization.
8. Persistence repository operations do not leak workspace A rows through workspace B scope.

**Baseline decision:** retain the EPIC-002/003/004 tests listed in §7.1. They are the Foundation suite.

**Phase 2:** lock those files/behaviors as a regression contract (existence + continued CI execution). Expand only if a listed guarantee has no test. G-004 is already covered at unit/integration; do not add a Playwright fail-closed journey unless a test-only seed can be done without new product surface — default is **do not add**.

Role permission semantics (OBD-009) remain untested by design.

---

## 12. Test Database Strategy

Documented from the repository. Do not invent alternatives.

| Item | Actual strategy |
| --- | --- |
| Engine | PostgreSQL 17 (CI image `postgres:17`; local version not pinned beyond repo docs) |
| Isolated name | `freelanceos_test` or any name ending in `_test` |
| Forbidden | `freelance_os` |
| Env | `TEST_DATABASE_URL` required for migrate + integration |
| Apply schema | `pnpm test:db:migrate` → `prisma migrate deploy` |
| Forbidden apply | `prisma db push` |
| Isolation/reset | `TRUNCATE ... RESTART IDENTITY CASCADE` in integration `beforeEach` |
| CI lifecycle | service container created per job; migrate; test; discarded |
| Auth test env | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_EMAIL_DELIVERY=test`; placeholder Google ids only in integration setup |

Committed migration chain currently asserted by `tests/integration/persistence/migrations.test.ts`:

```text
20260910231120_establish_prisma_foundation
20260910231638_implement_core_persistence_schema
20260911011900_establish_persistence_invariants
20260911224009_establish_better_auth_persistence
20260912180000_index_workspace_member_user_id
```

EPIC-005 must not add a migration unless a later unexpected schema change is approved. None is planned.

---

## 13. CI Environment

No new cloud services.

| Need | Value |
| --- | --- |
| Runner | `ubuntu-latest` |
| Node | 20 |
| Package manager | pnpm 10.22.0, `--frozen-lockfile` |
| Postgres | `postgres:17`, user/password `postgres`, db `freelanceos_test`, port 5432 |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/freelanceos_test` |
| `TEST_DATABASE_URL` | same |
| `BETTER_AUTH_SECRET` | test secret (≥32 characters) |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `AUTH_EMAIL_DELIVERY` | `test` |
| Playwright | Chromium + OS deps; `CI` implied by Actions |
| Not required | Google credentials, SMTP, production secrets |

Local E2E after Phase 1 must use the isolated test database and the same auth test env vars. Developers still use `freelance_os` for `pnpm dev` product work.

---

## 14. Phases

Three phases. Justified by G-001–G-003 and G-005. No rename-only phase.

```text
Phase 1 — COMPLETE
Phase 2 — COMPLETE
Phase 3 — COMPLETE
```

Each implementation chat is a new Cursor chat. One phase = one commit.

---

## 15. Phase 1 — Test/CI reliability and foundation contract

**Status:** COMPLETE  
**Commit:** `71b8e2ee6078a45c6b48cb66c5cb4868d851211b`  
**Entry conditions:** this plan exists; no EPIC-005 implementation yet.

### Objective

Make local E2E use the isolated test database and lock the existing CI/Playwright contract, including F-004.

### Scope

- Point Playwright (`webServer` and password-reset helper) at `TEST_DATABASE_URL`, refusing `freelance_os` / non-`_test` names.
- Fail clearly if `TEST_DATABASE_URL` is missing when E2E starts.
- Keep `pnpm dev` + one CI worker. Do not switch to `next start`.
- Extend `tests/unit/ci/quality-workflow.test.ts` and/or add a Playwright-config contract test for: `pnpm dev`, CI `workers: 1`, `postgres:17`, `freelanceos_test`, no `db push`.
- Set E2E process env for auth test mode (`AUTH_EMAIL_DELIVERY=test`, test `BETTER_AUTH_*` defaults if unset) without writing production secrets.
- Update README only if local E2E setup steps change.

### Non-goals

- New CI jobs or browsers
- E2E truncate framework unless required to keep G-001 safe
- Relocating `tests/`
- Product or authorization changes
- Fixing F-001/F-002/F-003/F-004-001

### Implementation details

Reuse `tests/integration/test-database-url.ts` or an equivalent shared guard. Do not duplicate a weaker check. The Playwright helper must not keep reading development `DATABASE_URL` when `TEST_DATABASE_URL` is set.

If `webServer` needs `DATABASE_URL` for Next.js, set it from the isolated URL for that process only.

### Tests / validation

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
CI=true pnpm test:e2e
```

Confirm existing 12 foundation E2E journeys still pass under one worker.

### Acceptance criteria

- Local E2E cannot target `freelance_os`.
- CI pipeline and F-004 are asserted by unit contract tests.
- No production rate-limit change.
- No application feature change.

### Expected commit

```text
test(ci): align e2e with isolated database and lock quality gates
```

---

## 16. Phase 2 — Isolation/security regression lock

**Status:** COMPLETE  
**Commit:** `0ba1aa888b28bcb2a1cc61dfe6038a2009adef97`  
**Entry conditions:** Phase 1 complete.

### Objective

Make the existing isolation/security suite the official Foundation baseline so later Epics cannot drop it unnoticed.

### Scope

- Add a small unit contract (same style as `quality-workflow.test.ts`) that the baseline files in §11 still exist.
- Re-read those files only enough to confirm the six guarantees in §11 remain asserted.
- Add a new behavioral test only if a §11 guarantee is actually missing.

### Non-goals

- Rewriting EPIC-004 authorization tests
- Playwright `/workspace-unavailable` journey (G-004 stays accepted)
- Client/contract/time isolation product tests
- Role/permission matrix tests (OBD-009)
- Changing fail-closed product behavior

### Implementation details

Preferred contract: path existence + a stable `describe` title or guarantee comment already present. Do not copy test bodies. Do not move files.

Default for G-004: retain unit/integration as sufficient Foundation coverage.

### Tests / validation

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
```

Playwright only if Phase 2 unexpectedly touches E2E.

### Acceptance criteria

- All §11 guarantees remain covered by existing tests.
- Baseline files are locked by a contract test.
- No duplicate isolation suites.
- OBD-009 untouched.

### Expected commit

```text
test(security): lock workspace isolation regression baseline
```

---

## 17. Phase 3 — Documentation and Engineering Review

**Status:** COMPLETE  
**Commit expected:** `docs(ci): complete EPIC-005 engineering review`  
**Entry conditions:** Phase 1 and Phase 2 complete.

### Objective

Synchronize canonical documents with the formalized Foundation and record the Engineering Review.

### Scope

Update only what changed or is stale relative to this Epic:

- `MASTER_PLAN.md` — current phase, next work (EPIC-006), Foundation Completion Gate checkboxes that this Epic actually certifies (tests execute, CI passes). Do not check UI-shell or production-readiness items.
- `docs/testing-strategy.md` — implemented Foundation stack; mark R0 tooling as pinned; record F-004; do not claim MVP E2E exists.
- `docs/architecture.md` / `docs/storage.md` / `README.md` / `CHANGELOG.md` — only if wording still says testing/CI is unestablished or omits the E2E isolated-DB rule.
- `docs/epics/EPIC-005/engineering-review.md` — create here, not earlier.
- This plan’s status block → implementation complete after review.

### Non-goals

- New tests or CI edits unless a doc-only contradiction requires a one-line factual fix (prefer recording the discrepancy)
- Closing OBDs or prior findings
- Production validation / certification artifacts
- QA report, UX review, production-validation.md

### Implementation details

Describe implemented behavior only. Record source discrepancies from §22 rather than rewriting history in other Epics’ reviews.

### Tests / validation

No application test run is required unless a documentation file is wrong about a command. If commands are cited, they must match `package.json` and `quality.yml`.

### Acceptance criteria

- Documents no longer describe Vitest/Playwright/CI as missing.
- Engineering Review exists and does not claim production readiness.
- MASTER_PLAN next epic is EPIC-006.
- OBD-008 and OBD-009 remain open.

### Expected commit

```text
docs: certify EPIC-005 testing and ci foundation
```

---

## 18. Findings / Risks

Verified only. Do not invent extras during implementation.

| ID | Item | Disposition |
| --- | --- | --- |
| EPIC-003 F-004 | Playwright CI = `pnpm dev` + 1 worker because `next start` rate limits collide | Preserve. Lock in Phase 1. |
| EPIC-003 F-002 | Full Google consent/callback not in CI | Preserve. Out of scope. |
| G-001 | Local E2E can use `freelance_os` | Closed in Phase 1. |
| G-002 | E2E residue via unique emails | Accepted. Phase 1 isolated E2E to `*_test`. No truncate framework added. |
| G-003 | F-004 not in CI contract tests | Closed in Phase 1. |
| G-004 | No fail-closed Playwright | Accepted. Unit/integration baseline. |
| G-006 | No Prettier check in CI | Accepted. Lint is the CI style gate. |
| Parallelization | Integration and CI E2E are single-worker | Keep. Shared DB truncate + F-004. |
| Environment | Local needs PostgreSQL + migrated `freelanceos_test` | Already documented; tighten after Phase 1 for E2E. |
| Flakiness | Prior reviews report Playwright PASS under F-004; no additional flake evidence in repo docs | Do not add retries. |
| Test data | Unique emails + truncate; seed is synthetic/idempotent | Keep. |
| F-004-001 | Concurrent first-workspace race | Out of scope. |

---

## 19. Open Business Decisions

Preserve all MASTER_PLAN OBDs. EPIC-005 must not resolve any of them.

| ID | Decision | Blocks EPIC-005? |
| --- | --- | --- |
| OBD-008 | Audit-log requirements | No |
| OBD-009 | Workspace roles and permissions | No |
| OBD-001–007, OBD-010–012 | Billing, time, capacity, currency | No |
| — | Google/email identity linking | No — EPIC-003 F-001 |
| — | Production email provider | No — EPIC-003 F-003 |

`docs/testing-strategy.md` §50 uses overlapping `TD-*` identifiers that are **not** the MASTER_PLAN technical-debt register. Do not merge those tables. See §22.

---

## 20. Acceptance Criteria

EPIC-005 is engineering-complete when:

1. Vitest unit and integration runners remain the Foundation commands (`pnpm test`, `pnpm test:integration`).
2. Playwright remains the Foundation E2E runner (`pnpm test:e2e`).
3. The test database strategy in §12 is unchanged in kind and is used by local E2E as well as integration/CI.
4. CI still runs the §10 pipeline on disposable PostgreSQL 17.
5. F-004 remains in force and is contract-tested.
6. Isolation/security guarantees in §11 remain covered; baseline files are locked.
7. No unrelated product behavior changed.
8. OBD-008, OBD-009, and prior Epic findings remain open.
9. Canonical docs describe the implemented Foundation, not a future rebuild.
10. `docs/epics/EPIC-005/engineering-review.md` exists.

---

## 21. Definition of Done

- [x] Tests reliable under the documented commands
- [x] CI gates deterministic (including F-004)
- [x] Test database strategy documented as implemented
- [x] E2E strategy documented as implemented (`pnpm dev`, one CI worker, isolated DB)
- [x] Isolation/security baseline verified and locked
- [x] No unrelated product behavior changed
- [x] Documentation synchronized
- [x] Engineering Review complete
- [x] Production readiness not claimed

---

## 22. Source Discrepancies

Do not silently reconcile.

| Sources | Discrepancy |
| --- | --- |
| `MASTER_PLAN.md` R0-E05 vs repository | Plan says “establish” Vitest, integration, Playwright, test DB, CI, isolation tests. All six already exist from EPIC-002/003/004. This Epic formalizes; it does not greenfield. |
| `MASTER_PLAN.md` §4 vs foundation code | “Application implementation: NOT STARTED” while auth and workspace are implemented. Status language is product-vs-foundation. Do not rewrite as if MVP started. |
| `MASTER_PLAN.md` §29 Foundation Completion Gate | `test suite runs`, `CI passes`, `production build passes`, workspace isolation still unchecked though EPIC-002/003/004 reviews already passed those commands. Phase 3 may check only what EPIC-005 certifies as the Foundation gate, not UI-shell or production items. |
| `MASTER_PLAN.md` §51 | Still says the next artifact is `docs/epics/EPIC-002/epic-plan.md`. Stale. Phase 3 should point at EPIC-006 after this Epic completes. |
| `MASTER_PLAN.md` naming | “Testing & CI” vs “Testing & CI Foundation” (R0-E05). Same Epic. |
| `docs/testing-strategy.md` §46–§48 | Says versions will be pinned during Foundation and lists a first suite including billing, utilization, alerts, historical contract tests. Versions are already pinned. MVP calculation tests are Release 1 work, not EPIC-005. |
| `docs/testing-strategy.md` §47 vs `tests/` | Recommended `tests/unit/domain`, `tests/e2e/auth`, `tests/factories`. Actual tree is `unit/application|infrastructure|lib|ci`, `integration/persistence|auth|workspace`, flat `e2e/`. Do not relocate. |
| `docs/testing-strategy.md` §39 vs CI | Mentions format/lint. CI has lint only. Accepted as G-006. |
| `docs/testing-strategy.md` §50 `TD-*` vs `MASTER_PLAN.md` §38 `TD-*` | Same IDs, different meanings (e.g. strategy TD-001 = daily-rate; MASTER_PLAN TD-001 = audit log). Keep both tables. Do not reuse IDs in this Epic. |
| `docs/testing-strategy.md` TD-008 / TD-009 vs repo | Production E2E environment and CI provider/parallelism are effectively GitHub Actions + `pnpm dev` + 1 worker. Decisions are implemented, not formally closed. Do not close them as product OBDs. |
| `docs/architecture.md` §26 E2E journey | Lists Register → Client → Contract → Time → Dashboard → Alert → Report. Only Register/auth/onboarding/shell exist. Remaining steps are MVP, not Foundation E2E. |
| EPIC-004 review vs MASTER_PLAN | Review says READY FOR EPIC-005 and warns not to rebuild the stack. MASTER_PLAN objective text still reads as greenfield. This plan follows the review’s interpretation without changing the objective list. |

---

## 23. Exit Criteria / Certification

Distinguish these states. Do not collapse them.

| State | Meaning for EPIC-005 |
| --- | --- |
| Engineering completion | Phases 1–3 done; DoD checklist complete; Engineering Review written |
| Validation | Quality commands pass; not a separate QA report in this Epic |
| Certification | Engineering Review verdict only (`PASS` / `PASS WITH FINDINGS`). Not production certification |
| Production readiness | **NO** — remaining Release 0 (EPIC-006), prior findings, production email/Google decisions, production validation, and production certification are all still required |

```text
EPIC-005 engineering completion
        ≠
production validation
        ≠
production certification
        ≠
READY FOR RELEASE
```

After a passing Engineering Review, MASTER_PLAN next work is EPIC-006 — UI Foundation.

---

## 24. Implementation Chat Protocol

Every new Cursor chat starts from zero context.

For each phase, read:

```text
MASTER_PLAN.md
docs/epics/EPIC-005/epic-plan.md
docs/testing-strategy.md
docs/epics/EPIC-004/engineering-review.md
```

plus the files named in that phase. Do not implement later phases in the same chat.

---

## 25. Final Planning Gate

This planning document is complete when:

- [x] Epic identity and MASTER_PLAN objective are recorded
- [x] Implemented testing/CI state is separated from gaps
- [x] Non-goals prevent product and prior-finding work
- [x] Architecture impact is no runtime change
- [x] Test/CI/isolation/database strategies match the repository
- [x] Phases are the smallest set justified by G-001–G-003 and G-005
- [x] OBDs remain open
- [x] Production readiness is not claimed

```text
READY FOR EPIC-005 IMPLEMENTATION
```

Implementation status after Phases 1–3:

```text
EPIC-005 COMPLETE
VERDICT: PASS
PRODUCTION READINESS: NO
READY FOR EPIC-006
```
