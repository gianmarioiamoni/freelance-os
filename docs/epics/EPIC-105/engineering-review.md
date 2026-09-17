# EPIC-105 — Reporting: Engineering Review

**Epic:** EPIC-105  
**Release:** Release 1 — MVP  
**Review phase:** P105-08  
**Reviewer:** Cursor  
**Review date:** 2026-09-17  
**Head commit reviewed:** `db7c8f7` — `docs(reporting): synchronize EPIC-105 documentation`

---

## 1. Verdict

**PASS WITH FINDINGS**

Engineering complete. Production readiness: **NO** (inherited blockers, see §7).

All six gates pass at commit `db7c8f7`. No blocking finding was raised during this review. Open findings are documented in §6 and are classified NON-BLOCKING or INHERITED.

---

## 2. Gate Evidence

All commands executed on a clean working tree at `db7c8f7` with no un-pushed local changes.

### 2.1 Lint

```text
Command: pnpm lint
Exit:    0
Errors:  0
Warnings: 2 (no-unused-vars, non-blocking, pre-existing)
```

**Warnings (non-blocking, both pre-existing):**
- `tests/integration/reporting/reporting-service.test.ts:126` — `otherContext` assigned but never used
- `tests/unit/components/dashboard/contract-utilization-display.test.ts:29` — `validFrom` assigned but never used

Neither warning is in production code. Neither was introduced by EPIC-105 implementation phases. Not a finding; recorded for completeness.

### 2.2 Typecheck

```text
Command: pnpm typecheck (tsc --noEmit)
Exit:    0
Errors:  0
no `any` introduced
```

### 2.3 Unit tests

```text
Command:    pnpm test
Exit:       0
Test files: 34 passed (34)
Tests:      331 passed (331)
Duration:   ~677 ms
```

EPIC-105-relevant unit suites within the 34 files:
- `tests/unit/lib/analytics-periods.test.ts` — period constructors, `getPeriodDays`, `formatPeriodDisplay`, `isValidPeriod`, `isDateInPeriod`
- `tests/unit/lib/analytics-periods-p105-03.test.ts` — `getTodayInTimezone` (BR-105-014), `getTodayPeriod`, `getCurrentWeekPeriod`, `getCurrentMonthPeriod`, `getCurrentYearPeriod`
- `tests/unit/features/reporting/reporting-types.test.ts` — `ReportingPeriodKind`, `parseReportPeriodParam`, schema validation
- `tests/unit/features/reporting/reporting-display-logic.test.ts` — display helpers, zero-denominator (`null` → `—`), locale-independent labels

### 2.4 Integration tests

```text
Command:    pnpm test:integration
Exit:       0
Test files: 32 passed (32)
Tests:      187 passed (187)
Duration:   ~13.4 s
```

EPIC-105-relevant integration suites within the 32 files:

| Suite | Tests | Behaviours covered |
| --- | --- | --- |
| `reporting/reporting-service.test.ts` | 20 | Period resolution (today/week/month/year/custom); fail-closed on reversed range; membership guard; workspace isolation; four BR-105-016 combinations; partial overlap start-side and end-side; BR-105-018 zero-consumption case; F-105-P-009 out-of-validity retention; OBD-012 no-rollover assertion; PD-104-001 archived-client inclusion; zero-activity period; dashboard-agreement (F-105-P-006) |
| `reporting/reporting-performance.test.ts` | 1 | §15 baseline measurement at 100 clients / 50 contracts / 1 000 entries — no pass/fail threshold (PD-105-008) |
| `analytics/analytics-weekly.test.ts` | 10 | Weekly totals = daily row sums; empty-week null; workspace isolation; membership guard; invalid-period rejection |
| `analytics/analytics-timezone-propagation.test.ts` | 2 | Persisted `Workspace.timezone` → `resolveWorkspaceContext` → period boundary (BR-105-014); UTC sanity |
| `analytics/analytics-membership-guard.test.ts` | 7 | All `AnalyticsService` methods guarded |
| `analytics/analytics-workspace-isolation.test.ts` | 7 | Cross-workspace data leakage prevention; malformed workspace identifier |
| `analytics/analytics-product-decisions.test.ts` | 11 | PD-104-001 archived clients; PD-104-002 all tracked time; PD-104-003 current month; PD-104-004 unlimited contracts |
| `analytics/analytics-isolation.test.ts` | 7 | Contract utilization isolation; daily aggregation; empty periods; future entries |

### 2.5 Build

```text
Command:  pnpm build
Exit:     0
/reports: ƒ (Dynamic) — server-rendered on demand ✓
/         ƒ (Dynamic) — consistent with criterion
```

### 2.6 E2E

```text
Command:    CI=true pnpm test:e2e --workers=1
Exit:       0
Passed:     51
Failed:     0
Skipped:    0
Duration:   ~2.8 min (chromium)
```

E2E suites passing:

| File | Tests |
| --- | --- |
| `tests/e2e/reports.spec.ts` | 14 |
| `tests/e2e/time-tracking.spec.ts` | 6 |
| `tests/e2e/dashboard.spec.ts` | 5 |
| `tests/e2e/dashboard-accessibility.spec.ts` | 11 |
| `tests/e2e/auth.spec.ts` | 6 |
| `tests/e2e/onboarding.spec.ts` | 4 |
| `tests/e2e/clients.spec.ts` | 1 |
| `tests/e2e/contracts.spec.ts` | 1 |
| `tests/e2e/reports.spec.ts` — accessibility | 3 |
| `tests/e2e/reports.spec.ts` — responsive layout | 1 |
| `tests/e2e/reports.spec.ts` — error recovery | 1 |

**Note on F-105-001.** F-105-001 documented a pre-existing failure in `time-tracking.spec.ts:185` (`should complete authenticated time tracking journey`) at commits `134800f` and `756649d`. That test passes at `db7c8f7` (test 46 in the run above), with no modification to the test or the time-tracking source. The failure was evidently environmental (orphaned port 3000 process — see §16.4 environment note in `epic-plan.md`). F-105-001 is **CLOSED** by this evidence: the full E2E suite exits 0 with 0 failed and 0 skipped, and the specific test passes.

---

## 3. Functional Acceptance Criteria — Verification

Criteria from `epic-plan.md` §17.2:

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | All §3.3 scope items reachable from `/reports` | `reports.spec.ts` journey tests; build output | ✓ |
| 2 | No percentage/average/utilization arithmetic in reporting layer; no reporting-specific SQL | `reporting-service.ts` delegates exclusively to `AnalyticsService`; `grep` confirms no raw SQL | ✓ |
| 3 | Dashboard and reports agree for the same period | `reporting-service.test.ts` — dashboard-agreement test | ✓ |
| 4 | Period boundary inclusivity and transitions | `analytics-periods.test.ts`; `analytics-periods-p105-03.test.ts` | ✓ |
| 5 | Period containing today ends today; historical period keeps natural end; future entries excluded | Unit + integration suites; `reporting-service.test.ts` | ✓ |
| 6 | `Workspace.timezone` authority for aggregation and display; two timezones on opposite sides of UTC; process TZ differs | `analytics-timezone-propagation.test.ts`; `analytics-periods-p105-03.test.ts` | ✓ |
| 7 | Weekly aggregation reconciles with daily rows and monthly total | `analytics-weekly.test.ts` 10 tests | ✓ |
| 8 | Archived-client time counted and labelled | `reporting-service.test.ts`; `reports.spec.ts` archived-client test | ✓ |
| 9 | Utilization numerators = all tracked time | `analytics-product-decisions.test.ts` PD-104-002 | ✓ |
| 10 | Zero denominators → `—`; zero-activity → empty state | Unit display-logic tests; `reports.spec.ts` empty-state test | ✓ |
| 11 | Invalid period fails closed; no silent empty-result conversion | `reporting-service.test.ts` reversed-range test; `reports.spec.ts` malformed-param test | ✓ |
| 12 | Ongoing and unlimited independent; all four BR-105-016 combinations tested | `reporting-service.test.ts` four combination tests | ✓ |
| 13 | Pro-rata capacity; null capacity → null percentage; no rollover/carry-over | `reporting-service.test.ts` partial-overlap and OBD-012 tests | ✓ |
| 14 | Relevance-driven contract report; zero-consumption at `0h/capacity/0%`; out-of-validity retained and flagged; total reconciles | `reporting-service.test.ts` BR-105-018 and F-105-P-009 tests | ✓ |
| 15 | No monetary figure computed or displayed | `grep` on `src/`; `reports.spec.ts` — no currency column | ✓ |
| 16 | No alert/threshold/warning derived from report figures | `grep` on `src/`; no threshold logic in `reporting-service.ts` | ✓ |
| 17 | Workspace isolation SI-105-001 … SI-105-006 | `reporting-service.test.ts`; `reports.spec.ts` unauthenticated redirect; `analytics-workspace-isolation.test.ts` | ✓ |
| 18 | RSC, no `use client`; authorization outside `try` | `reports/page.tsx` line 29–30: `getCurrentWorkspaceContext()` called before the `try` block at line 45 | ✓ |
| 19 | Accessibility: native table semantics, native headings, full-text names, keyboard reachability | `reports.spec.ts` accessibility suite; `dashboard-accessibility.spec.ts` | ✓ |
| 20 | Performance baseline recorded; no unapproved threshold | `reporting-performance.test.ts` — four query measurements at §15 fixture volume; PD-105-008 defers threshold decision | ✓ |
| 21 | Documentation synchronized | P105-07 commit `db7c8f7` | ✓ |
| 22 | No OBD closed; no inherited finding closed or reinterpreted | §6.2 below | ✓ |

---

## 4. Performance Baseline

Measured by `tests/integration/reporting/reporting-performance.test.ts` at §15 fixture volume:
100 clients · 50 contracts · 1 000 entries · 13-month span.

| Query | Wall-clock | Notes |
| --- | --- | --- |
| Monthly contract report | 24 ms | 50 contracts returned |
| Annual overview (2025) | 24 ms | 12 months; 46 200 total minutes |
| Weekly aggregation (30-day window) | 3 ms | 1 day; 11 550 total minutes |
| Year-scale contract report | 6 ms | 50 contracts returned |

**Query-count pattern (F-105-P-007, now measured):**  
`getContractUtilizations` issues 3 fixed queries + 1 `Promise.all` of `COUNT` queries (one per contract with in-period consumption). At 50 contracts: ≤ 53 DB operations per call. Annual overview: 12 × `getMonthlyAnalytics` = up to 12 × 53 = 636 DB operations. No serial N+1. Threshold decision deferred to PD-105-008.

**F-105-P-007 status:** MEASURED. Concurrent `Promise.all`, not serial N+1; acceptable at MVP scale.

**F-104-P-001 status:** MEASURED. No unapproved threshold enforced. Whether to establish a CI performance gate remains PD-105-008 (Product Owner, open).

---

## 5. Findings Created by This Review

### F-105-013 — latent year/now inconsistency in `getAnnualOverview` call site

- **Severity:** Low — non-blocking
- **Status:** OPEN — not owned by P105-08 (Engineering Review produces no code)
- **Location:** `src/app/(app)/reports/page.tsx:43`
  ```ts
  const currentYear = now.getFullYear();
  ```
  `now` is a `new Date()` (UTC). For workspaces in timezones west of UTC on 1 January (e.g., `America/New_York` at UTC `2027-01-01T02:00:00Z` is still `2026-12-31` workspace-local), `currentYear` would be 2027 while the workspace-local year is 2026. The `getAnnualOverview` call would then fetch 2027 buckets while displaying a 2026 header.
- **Impact:** Low at MVP scale — affects only users whose workspace timezone is behind UTC on New Year's Eve past midnight UTC. The year query itself uses correct UTC-midnight month boundaries; only the displayed year label and the bucket range would be off for a sub-hour window annually.
- **Recommended resolution:** Derive `currentYear` from `getTodayInTimezone(context.timezone, now)` (already imported indirectly via `reporting-service.ts`) or from `context.timezone` directly. No Product Decision required; the fix is a one-line change to `reports/page.tsx`.
- **Owner:** Engineering, any future phase touching `reports/page.tsx`.

---

## 6. Open Findings Register

### 6.1 Findings raised and closed during EPIC-105

| Finding | Raised in | Status | Evidence |
| --- | --- | --- | --- |
| F-105-001 — pre-existing E2E failure | P105-02 | **CLOSED** — this review | E2E 51/51 pass at `db7c8f7`; `time-tracking.spec.ts:23` passes |
| F-105-002 — missing weekly aggregation | P105-03 ER | CLOSED | `6822600`; 10 integration tests |
| F-105-003 — local `getWeekStart` in time-tracking | P105-03 ER | CLOSED | `6822600`; shared helper imported |
| F-105-004 — missing timezone-propagation integration proof | P105-03 ER | CLOSED | `6822600`; `analytics-timezone-propagation.test.ts` |
| F-105-005 — duplicate `createRepositories()` | P105-03 ER | CLOSED | `6822600` |
| F-105-006 — optional `workspaces` parameter | P105-03 ER | CLOSED | `6822600` |
| F-105-007 — stale comment in `current-month-dates.ts` | P105-03 ER | CLOSED | `6822600` |
| F-105-008 — test-comment arithmetic nit | P105-03 ER | OPEN — non-blocking | `analytics-weekly.test.ts` comment readability only |
| F-105-013 — latent year/now inconsistency | P105-08 (this review) | OPEN — non-blocking | See §5 above |
| F-105-P-007 — concurrent Promise.all query pattern | P105-07 sync | MEASURED | Performance baseline §4; no N+1 |

### 6.2 Inherited findings — not closed, not reinterpreted by EPIC-105

| Finding | Origin | Relationship |
| --- | --- | --- |
| F-104-006 — clock-sensitive test failures | EPIC-104 | Partially remediated P105-01; no clock-sensitive test remains at `db7c8f7` |
| F-104-007 — `try/catch` swallows control-flow signals (dashboard) | EPIC-104 | Contained: `/reports` resolves authorization before the `try` block; dashboard not retrofitted |
| F-104-008 — dashboard loading skeletons | EPIC-104 | Deferred; reporting surfaces define their own loading behaviour |
| F-104-009 / F-104-P-001 — performance unevidenced | EPIC-104 | Now measured (§4); no threshold without PD-105-008 |
| F-104-010 — unsound accessibility assertions | EPIC-104 | Not reproduced in reporting tests; existing dashboard suite unchanged |
| F-104-011 — `dt/dd` without `dl` | EPIC-104 | Not reproduced in reporting surfaces |
| F-104-012 — residual accessibility gaps | EPIC-104 | New reporting surfaces use native table semantics and headings |
| EPIC-003 F-003 — password-reset email | EPIC-003 | Production deployment blocker; unchanged |
| EPIC-003 F-001 — identity linking | EPIC-003 | Product decision; unchanged |
| P102-F-001 — commercial-terms mutability | EPIC-102 | Report figures read live contract fields; no snapshots added |

### 6.3 Open Business Decisions — status unchanged

| OBD | Status |
| --- | --- |
| OBD-012 — rollover / expiry semantics | OPEN — no rollover or expiry logic exists; `reporting-service.test.ts` asserts its absence |
| PD-105-008 — performance threshold | OPEN — baseline recorded; no gate enforced |
| OBD-001, OBD-002, OBD-011, OBD-016 | OPEN — revenue excluded from EPIC-105 by PD-105-001 |

---

## 7. Production Readiness

**NOT READY FOR PRODUCTION.**

EPIC-105 is engineering-complete. The following conditions remain outstanding and are not owned or closable by this Epic:

1. **EPIC-003 F-003** — password-reset email provider. Production deployment blocker.
2. **EPIC-003 F-001** — identity linking. Product decision pending.
3. **P102-F-001** — commercial-terms mutability. Report utilization denominators read live contract fields; historical figures are retroactively mutable. No snapshots added.
4. Formal UX review of the reporting surfaces.
5. A real accessibility audit not relying on the EPIC-104 unsound assertion patterns (F-104-010).
6. Production monitoring of analytics and reporting query times.
7. Timezone correctness verified in production (`Workspace.timezone` authority established at the design level; production evidence not available).
8. Production workspace-isolation audit and security review of report data exposure (OBD-009 / EPIC-002 F-P2-005 multiplied by additional report surfaces).

---

## 8. EPIC-105 Phase Completion Summary

| Phase | Objective | Commit | Status |
| --- | --- | --- | --- |
| P105-00 | Establish EPIC-105 plan | `9fd941a` | COMPLETE |
| P105-01 | Decouple analytics integration tests from the current month | `134800f` | COMPLETE |
| P105-02 | Consolidate shared analytics calculations | `756649d` | COMPLETE |
| P105-03 | Add reporting period and weekly aggregation capabilities | `428f6e4` + `6822600` | COMPLETE |
| P105-04 | Add workspace-scoped reporting queries | `e1a1a42` + `caf6f96` | COMPLETE |
| P105-05 | Add reports surface with period selection | `59d28fa` | COMPLETE |
| P105-06 | Add reporting integration, E2E, and performance evidence | `8faed35` | COMPLETE WITH DOCUMENTED ENVIRONMENTAL GATE EXCEPTION (now resolved — F-105-001 CLOSED) |
| P105-07 | Synchronize EPIC-105 documentation | `db7c8f7` | COMPLETE |
| P105-08 | Engineering Review | this document | COMPLETE |

---

## 9. Document Status

```text
EPIC-105 — Reporting
ENGINEERING REVIEW: COMPLETE — PASS WITH FINDINGS
VERDICT: PASS WITH FINDINGS
BLOCKING FINDINGS: NONE
NON-BLOCKING OPEN FINDINGS: F-105-008, F-105-013
MEASURED: F-105-P-007, F-104-P-001
CLOSED BY THIS REVIEW: F-105-001
OBD CLOSED: NONE
PRODUCTION READINESS: NO — see §7
```
