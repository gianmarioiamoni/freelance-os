# EPIC-109 Engineering Review

- **Epic:** EPIC-109 — Calendar-date & clock-test hardening
- **Phase:** P109-06 Final ER
- **Release:** Post-R1 structured cycle (D-NEXT-001 = A)
- **Date:** 2026-09-20
- **Reviewer:** Engineering Review Agent
- **HEAD:** `966e75b9dfab2e51876818ff7118bde8a863dc6d`

P109-05 was verification-only and produced no commit. This review uses HEAD above.

```text
ENGINEERING REVIEW RESULT: PASS
PRODUCTION READINESS:      UNCHANGED (R1 GRANTED)
FINDING-108-ER-001:        CLOSED
F-104-006:                 CLOSED (all three axes)
BLOCKING FINDINGS:         NONE
NEW EPIC-109 FINDINGS:     NONE
OUT-OF-SCOPE OBSERVATION:  LA full integration updatedAt flake (not calendar-date)
```

This result does not rewrite `MASTER_PLAN.md` §33 / §34 / §35, R1 certification, or EPIC-108 snapshots.

---

## 1. Scope

Reviewed P109-00…P109-05 against `docs/epics/EPIC-109/epic-plan.md`.

Out of scope: application remediation; historical gate snapshot rewrites; re-certification of R1; fixing the LA `updatedAt` instant flake.

Diff `692403bd..HEAD`: 7 files, **no `src/`**. Commits: `fc3c829` P109-00 · `52cf267` P109-01 · `af0d76f` P109-02 · `bd9e2a5` P109-03 · `966e75b` P109-04.

---

## 2. Acceptance criteria

| AC | Result | Evidence | Phase | Residual |
|---|---|---|---|---|
| **AC-109-001** | **PASS** | Original defect: local getters vs app UTC `toISOString()` today. Spec now uses `utcTodayYmd()`. Host E2E journey + immutability PASS (6/6). Helper unit proves UTC day at `2026-09-19T22:30:00.000Z` (Rome local would be 2026-09-20). Playwright was not run with `timezoneId` / process TZ (forbidden by AC-109-010). Non-UTC coverage of the original class is the helper unit + host E2E using that helper | P109-02, P109-03, P109-05 | None for closure. E2E-under-LA browser is not required and would violate AC-109-010 |
| **AC-109-002** | **PASS** | Axis 1 remediates P105-01, reconfirmed P109-01, host+LA integration. Axis 2 CLOSED INT-001, reconfirmed P109-05 LA 46/46. Axis 3 hardened P109-03/P109-04, host E2E P109-05. All three axes CLOSED → finding CLOSED | P109-01…P109-05 | None |
| **AC-109-003** | **PASS** | Involved specs no longer use local getters or local-midnight → ISO for calendar dates. `analytics-fixtures` wired to UTC helpers. mvp-integration inherits fixtures (inspected, unchanged) | P109-02…P109-04 | None |
| **AC-109-004** | **PASS** | Dashboard period heading and reports year caption use `getTodayInTimezone("Europe/Rome")`. Timezone-propagation tests already pass timezone explicitly | P109-04 | None |
| **AC-109-005** | **PASS** | `git diff 692403bd..HEAD -- src` empty. No `workDate` / `Workspace.timezone` production change | P109-02…P109-05 | None |
| **AC-109-006** | **PASS** | time-tracking 6/6; dashboard 5/5; reports 22/22; mvp not touched so not re-run; analytics host 224/224; scoped LA analytics/dashboard-page 46/46 | P109-03…P109-05 | mvp-integration not re-executed (no spec change) |
| **AC-109-007** | **PASS** | typecheck PASS (P109-02…P109-05); lint PASS (P109-05) | P109-05 | None |
| **AC-109-008** | **PASS** | Host: `resolved=Europe/Rome`. Non-UTC: `TZ=America/Los_Angeles` (`resolved=America/Los_Angeles`; UTC midnight 2026-09-20 → 19 Sep 17:00 PDT). Helper unit independent of runner TZ | P109-05 | Playwright TZ unchanged by design |
| **AC-109-009** | **PASS** | F-103-006 not touched, remains OPEN. Stream A (QA-002, INT-001, 108-001) not reopened | P109-01, this ER | None |
| **AC-109-010** | **PASS** | No new authority. Helpers named UTC vs production `getTodayInTimezone`. No `today()`. No Playwright/Jest global TZ. No `playwright.config.ts` change | P109-02…P109-05 | None |

---

## 3. FINDING-108-ER-001 — CLOSED

| Field | Value |
|---|---|
| **Status** | **CLOSED** |
| **Classification** | PRE-EXISTING / TEST DEFECT |
| **Original** | ER-108: test expected `2026-09-20` / `9/20/2026`; app `date=2026-09-19` / `9/19/2026`. Local getters vs `toISOString()` UTC day |
| **Fix** | P109-03: `utcTodayYmd()`; display from `` `${TODAY}T00:00:00.000Z` `` + `toLocaleDateString()`. No `src/` change |
| **Why closed** | Cause was test calendar extraction, not `workDate` or `Workspace.timezone`. The same extraction is now UTC and unit-tested at the Rome/UTC midnight window. Host E2E journey + immutability PASS; original mismatch not reproduced. No retry-as-fix |

---

## 4. F-104-006 — three axes — CLOSED

| Axis | Status | Evidence |
|---|---|---|
| **1** Hardcoded Sept 2026 vs current-month analytics | **CLOSED** | P105-01 `current-month-dates.ts`. P109-01: no remaining `Date.UTC(2026, 8)` / “assumes September 2026” in `tests/integration/**`. P109-05 host 224/224 + LA scoped 46/46 |
| **2** isolation `futureDate` local `setDate` | **CLOSED** | FINDING-INT-001 (P108-02 UTC midnight +30). P109-05 scoped LA includes `analytics-isolation.test.ts` |
| **3** E2E leftover calendar construction | **CLOSED** | P109-02 fixtures; P109-03 time-tracking; P109-04 dashboard/reports; mvp inherits fixtures; P109-05 host E2E 33/33. Original ER-001 mismatch not reproduced |

Overall **F-104-006: CLOSED**. Original 2026-10-01 expiry applied to axis 1 only and is obsolete.

---

## 5. Out-of-scope observation

**LA full `pnpm test:integration`:** 223/224.

| Field | Value |
|---|---|
| File | `tests/integration/time-tracking.test.ts` — `updates mutable fields successfully` |
| Assertion | `updated.updatedAt` equal to `created.updatedAt` (same ms: `2026-09-20T12:14:14.011Z`) |
| `workDate` | explicit `date("2026-06-15")` |
| Class | Instant timestamp, not calendar-date |
| Cause vs EPIC-109 | None. File not in EPIC-109 diff. Host 224/224 included this test |
| Classification | TEST DEFECT / flake |
| Action | Not retried. Not modified. **Not** an EPIC-109 finding. **Not** a blocker. **Not** closed |

---

## 6. Test evidence

| Phase | Checks |
|---|---|
| P109-02 | typecheck PASS; helper unit 4/4 |
| P109-03 | typecheck PASS; time-tracking E2E 6/6 |
| P109-04 | typecheck PASS; dashboard + reports E2E 27/27 |
| P109-05 | typecheck PASS; lint PASS; helper 4/4; time-tracking 6/6; dashboard 5/5; reports 22/22; analytics host 224/224; scoped LA analytics/dashboard-page 46/46; full LA integration 223/224 (observation above) |

No retry-as-fix. No `waitForTimeout`. No assertion weakening.

---

## 7. Architecture

Confirmed:

- Time Tracking default today = UTC calendar date (`utcTodayYmd`).
- Reporting / analytics current periods = `Workspace.timezone` (`getTodayInTimezone("Europe/Rome")` in E2E).
- Custom reporting range = UTC calendar getters (untouched; Stream A remains CLOSED).
- Explicit calendar fixtures = UTC helpers.
- `TimeEntry.workDate` still date-only UTC midnight.
- No new timezone authority; no `today()`; test helpers are not production period constructors.
- `playwright.config.ts` unchanged.
- Change limited to tests/fixtures/docs.

---

## 8. Verdict

**PASS.**

All AC-109-001 … AC-109-010 are PASS. FINDING-108-ER-001 CLOSED. F-104-006 CLOSED. No blocking findings. The LA `updatedAt` flake is out of scope and does not change this verdict.

---

## 9. Release impact

| Layer | Status |
|---|---|
| EPIC-109 technical | CLOSED / ER PASS |
| R1 certification | UNCHANGED — GRANTED |
| `MASTER_PLAN.md` §33 / §34 / §35 | Not rewritten |
| EPIC-108 snapshots | Not rewritten |
| New certification | None — this review is EPIC-109 only |

Documentation current-state updates (debt register, testing-strategy durability warning, CHANGELOG) belong to **P109-07**.

---

## 10. Findings

### CLOSED

- **FINDING-108-ER-001** — test defect; UTC calendar today in time-tracking E2E; original mismatch not reproduced.
- **F-104-006** — all three axes CLOSED (see §4).

### OPEN (unchanged, not this Epic)

- **F-103-006** — invalid `?date=` silent fallback. Out of scope.

### Stream A (unchanged CLOSED)

- FINDING-QA-002, FINDING-INT-001, FINDING-108-001.

### OUT-OF-SCOPE

- LA full integration `updatedAt` same-millisecond flake (`tests/integration/time-tracking.test.ts`).
