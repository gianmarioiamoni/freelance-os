# EPIC-005 — Engineering Review

**Epic:** EPIC-005 — Testing & CI Foundation  
**Release:** Release 0 — Foundation  
**Reviewed commits:**

```text
71b8e2ee6078a45c6b48cb66c5cb4868d851211b
test(ci): align e2e with isolated database and lock quality gates

0ba1aa888b28bcb2a1cc61dfe6038a2009adef97
test(ci): lock workspace isolation and authorization regressions
```

Phase 3 is documentation and certification only. No runtime, schema, authorization, or CI pipeline redesign was added in this review.

---

## 1. Executive Summary

EPIC-005 formalizes the existing Vitest, Playwright, isolated PostgreSQL, and GitHub Actions stack as the Foundation quality contract. It does not rebuild those tools and does not add product functionality.

Phase 1 closed the local-vs-CI E2E database mismatch and locked the Playwright CI constraint. Phase 2 locked the existing EPIC-004 isolation and authorization suite as a regression baseline. Phase 3 synchronizes documentation with that implemented state.

No new EPIC-005 finding exists.

```text
VERDICT: PASS
EPIC ENGINEERING COMPLETION: YES
PRODUCTION READINESS: NO
READY FOR EPIC-006
```

EPIC-005 closes the testing/CI foundation only. Downstream Release 0 work, prior Epic findings, and production validation/certification remain required.

---

## 2. Scope Delivered

Verified against `MASTER_PLAN.md` R0-E05, `docs/epics/EPIC-005/epic-plan.md`, `docs/testing-strategy.md`, `docs/architecture.md`, `docs/storage.md`, and the Phase 1–2 implementation.

| Area | Documented | Implemented | Verified |
| --- | --- | --- | --- |
| Vitest unit runner (`pnpm test`) | Yes | Yes | Yes |
| Isolated PostgreSQL integration (`pnpm test:integration`) | Yes | Yes | Yes |
| Playwright E2E (`pnpm test:e2e`) | Yes | Yes | Yes |
| `TEST_DATABASE_URL` required for E2E | Yes | Yes | Yes |
| `freelance_os` rejected; name must end in `_test` | Yes | Yes | Yes |
| E2E `webServer` injects isolated `DATABASE_URL` only | Yes | Yes | Yes |
| Existing `pnpm dev` not reused | Yes | Yes | Yes |
| Password-reset helper uses `TEST_DATABASE_URL` | Yes | Yes | Yes |
| CI: PostgreSQL 17 / `freelanceos_test` | Yes | Yes | Yes |
| CI: `pnpm dev`, one Playwright worker | Yes | Yes | Yes |
| No `prisma db push` | Yes | Yes | Yes |
| No `next start` for Playwright | Yes | Yes | Yes |
| Isolation/authorization regression baseline | Yes | Yes | Yes |
| No runtime/schema/architecture change | Yes | Yes | Yes |
| Production readiness | Forbidden | Not claimed | Yes |

MASTER_PLAN R0-E05 says “establish” Vitest, integration, Playwright, test DB, CI, and isolation tests. Those six items already existed from EPIC-002/003/004. This Epic formalized them. That discrepancy is recorded in the Epic plan §22 and is not treated as missing implementation.

---

## 3. Architecture Review

**Verdict:** PASS

FreelanceOS remains a Modular Monolith. Testing/CI changes do not alter Presentation, Application, Domain, or Infrastructure.

Confirmed:

- no application feature change;
- no authorization or workspace-resolution redesign;
- no Better Auth or Prisma runtime change;
- production rate limits unchanged;
- Next.js 15.5.25 still has no `proxy.ts` convention; `middleware.ts` remains absent.

The existing test architecture remains coherent:

```text
Unit (Vitest, Node)
  ↓
Integration (Vitest, isolated PostgreSQL)
  ↓
E2E (Playwright Chromium, isolated TEST_DATABASE_URL)
  ↓
CI (.github/workflows/quality.yml)
```

Allowed EPIC-005 surfaces were test helpers, Playwright/Vitest config, CI contract tests, and documentation. No new pyramid was introduced.

---

## 4. Persistence / DB Safety Review

**Verdict:** PASS

EPIC-005 added no schema and no migration. The committed chain remains unchanged after `20260912180000_index_workspace_member_user_id`.

E2E cannot silently use `freelance_os`. `requireTestDatabaseUrl()` is shared by integration migrate/setup, Playwright config, and the password-reset helper.

| Guard | Result |
| --- | --- |
| `TEST_DATABASE_URL` missing | Fail before E2E/integration start |
| Database name `freelance_os` | Rejected |
| Name that does not end in `_test` | Rejected |
| Isolated `*_test` name | Accepted |
| Schema apply | `pnpm test:db:migrate` → `prisma migrate deploy` |
| `prisma db push` | Absent from CI and test commands |

`playwright.config.ts` sets `DATABASE_URL` from the isolated URL for the E2E `webServer` process only. `reuseExistingServer: false` prevents a local development server on `freelance_os` from being reused.

`UNIQUE(userId)` was not added. F-004-001 remains an EPIC-004 persistence limitation, not an EPIC-005 defect.

---

## 5. Authorization / Security Review

**Verdict:** PASS

This is an engineering review, not a penetration test. No formal security certification is claimed.

Existing EPIC-004 authorization and isolation coverage remains intact. Phase 2 locked it with `tests/unit/ci/isolation-baseline.test.ts`.

| Guarantee | Coverage | Locked |
| --- | --- | --- |
| Member access | Unit + integration | Yes |
| Non-member denial | Unit + integration | Yes |
| Identifier substitution | Unit + integration | Yes |
| Zero memberships / onboarding | Unit + integration + Playwright | Yes |
| Exactly one membership / `WorkspaceContext` | Unit + integration | Yes |
| Multiple memberships fail closed | Unit + integration | Yes |
| Browser `workspaceId` is not authorization | Unit + Playwright | Yes |
| Persistence tenant isolation | Integration | Yes |
| Unauthenticated protected routes | Unit + integration + Playwright | Yes |

Cross-workspace access fails closed through the same application primitives. `getAuthorizedWorkspace` remains the authorized read probe. `getWorkspaceById` is not treated as authorization.

G-004 remains an accepted limitation: there is no Playwright `/workspace-unavailable` journey. Unit and integration remain sufficient Foundation coverage. OBD-009 role semantics remain untested by design.

---

## 6. Testing / CI Review

**Verdict:** PASS

Phase 3 quality evidence:

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (58) |
| `pnpm test:integration` | PASS (59) |
| `pnpm build` | PASS |
| `CI=true pnpm test:e2e` | PASS (12 tests, 1 worker) |

There is no `pnpm test:unit` script. The Foundation unit command is `pnpm test`.

Final CI contract:

```text
postgres:17
freelanceos_test / isolated *_test
pnpm dev
CI workers 1
no next start
no prisma db push
isolated E2E DB
existing quality gates retained
```

Locked by `tests/unit/ci/quality-workflow.test.ts` and `playwright.config.ts`.

EPIC-003 F-004 is the formalized one-worker contract. It is not a new defect introduced by this Epic. Production rate limits were not weakened. CI was not switched to `next start`.

Accepted testing limitations that remain applicable:

- G-002: E2E uses unique emails on the isolated `*_test` database; no E2E truncate framework
- G-004: no Playwright fail-closed journey
- G-006: lint is the CI style gate; no `format:check`
- EPIC-003 F-002: full Google consent/callback is not automated in CI

Coverage percentages are not claimed. MVP client/contract/time/dashboard/report E2E is not claimed.

---

## 7. Documentation Review

**Verdict:** PASS after Phase 3 synchronization

Phase 3 updated stale status in `MASTER_PLAN.md`, `docs/testing-strategy.md`, `docs/architecture.md`, `docs/storage.md`, `docs/epics/EPIC-005/epic-plan.md`, `README.md`, and `CHANGELOG.md`.

Documents now describe the implemented Foundation contract. They do not claim:

- production readiness;
- MVP E2E completeness;
- closure of OBD-001 through OBD-012;
- closure of EPIC-003 or EPIC-004 findings;
- a formatter gate;
- a Playwright `/workspace-unavailable` journey.

Source discrepancies from the Epic plan §22 remain recorded rather than silently rewritten.

---

## 8. Findings

No new EPIC-005 finding exists.

Inherited findings remain open and are not closed by this review.

### EPIC-004 F-004-001

- **Severity:** Medium
- **Blocking:** No
- **Status:** Open / accepted persistence limitation
- **Description:** Concurrent first-workspace creation can produce two memberships. Out of scope for EPIC-005.

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
- **Status:** Open CI environment limitation — formalized as Foundation contract
- **Description:** Playwright CI uses `pnpm dev` with one worker because `next start` rate limits collide across auth journeys. EPIC-005 locked this contract. It is not a new defect.

### G-004

- **Severity:** Low
- **Blocking:** No
- **Status:** Accepted Foundation limitation
- **Description:** No Playwright `/workspace-unavailable` journey. Unit and integration remain the baseline.

EPIC-002 findings F-P3-002, F-P2-003, F-P2-004, and F-P2-005 remain unchanged and outside this epic.

No Blocker or High findings. No new Medium findings.

---

## 9. Open Business Decisions

Do not close any OBD.

| ID | Decision | Blocks EPIC-005? |
| --- | --- | --- |
| OBD-001 | Daily-rate semantics / partial days | No |
| OBD-002 | Monetary rounding | No |
| OBD-003 | Midnight-crossing entries | No |
| OBD-004 | Holiday model | No |
| OBD-005 | Vacation/absence model | No |
| OBD-006 | Capacity warning threshold | No |
| OBD-007 | Post-closure edits/deletes | No |
| OBD-008 | Audit requirements | No |
| OBD-009 | Workspace roles | No |
| OBD-010 | Payment-term catalog | No |
| OBD-011 | Multi-currency | No |
| OBD-012 | Contract-hour rollover/expiry | No |
| — | Google/email identity linking | No — EPIC-003 F-001 |
| — | Production email provider | No — EPIC-003 F-003 |

`docs/testing-strategy.md` §50 `TD-*` identifiers remain a separate open-testing table. They are not merged with the MASTER_PLAN register.

No additional product decision was discovered that required a new OBD identifier.

---

## 10. Deferred Work

Out of scope and not started:

- EPIC-006 — UI Foundation;
- clients, contracts, time tracking, analytics, alerts, notifications;
- MVP E2E journeys beyond auth/onboarding/shell;
- Playwright `/workspace-unavailable` journey;
- formatter CI gate;
- E2E truncate framework;
- coverage thresholds, cloud browsers, parallel CI E2E shards;
- EPIC-003 / EPIC-004 finding remediation;
- Google Console or production email configuration;
- production validation;
- production certification.

---

## 11. Production-Readiness Limitations

EPIC-005 engineering completion is not production certification.

Still required before any production-ready claim:

- remaining Release 0 work (EPIC-006) and later release gates;
- production password-reset email provider (F-003);
- Google/email identity-linking decision (F-001);
- resolution of the concurrent first-workspace limitation (F-004-001) by a method that does not add `UNIQUE(userId)`;
- production validation and production certification stages.

This review does not certify production-ready authentication, production-ready multi-tenant operations, or Release 0 completion.

```text
EPIC-005 engineering completion
        ≠
production validation
        ≠
production certification
        ≠
READY FOR RELEASE
```

---

## 12. Epic Verdict

```text
PASS
```

| Dimension | Result |
| --- | --- |
| Architecture | PASS |
| Persistence / DB safety | PASS |
| Authorization / security | PASS |
| Tests | PASS |
| CI | PASS |
| Documentation | PASS |
| New EPIC-005 findings | None |
| Blocking findings | None |
| Epic engineering completion | YES |
| Full production readiness | NO |

Required EPIC-005 acceptance criteria are satisfied. Quality gates pass. Inherited findings remain open and do not belong to this Epic as new defects.

---

## 13. Recommended Next Step

```text
READY FOR EPIC-006
```

Create `docs/epics/EPIC-006/epic-plan.md` before implementation.

Treat EPIC-006 as the MASTER_PLAN identifier “UI Foundation”. Do not rebuild the testing/CI stack. Do not close OBD-001 through OBD-012. Do not fix EPIC-003 or EPIC-004 findings in that Epic unless its plan explicitly requires it.

---

## Review Evidence

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (58) |
| `pnpm test:integration` | PASS (59) |
| `pnpm build` | PASS |
| Playwright Foundation E2E (`CI=true`, 1 worker) | PASS (12) |
