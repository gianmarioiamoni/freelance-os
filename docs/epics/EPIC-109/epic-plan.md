# EPIC-109 — Calendar-date & clock-test hardening

**Epic:** EPIC-109  
**Release:** Post-R1 structured cycle  
**MASTER_PLAN:** D-NEXT-001 = A
**Status:** CLOSED — Engineering Review PASS (P109-06); documentation closure P109-07
**Dependencies:** EPIC-108 CLOSED (ER PASS WITH FINDINGS)
**Prior:** R1 GRANTED — do not reopen. EPIC-108 streams A/E/B/D/C CLOSED.

```text
PLANNING:              COMPLETE (P109-00)
INVENTORY:             COMPLETE (P109-01)
IMPLEMENTATION:        COMPLETE (P109-02 … P109-04)
REGRESSION MATRIX:     COMPLETE (P109-05, verification-only, no commit)
ENGINEERING REVIEW:    PASS (P109-06)
DOCUMENTATION:         COMPLETE (P109-07)
FINDING-108-ER-001:    CLOSED
F-104-006:             CLOSED (axes 1 / 2 / 3)
F-103-006:             OPEN (out of scope)
PRODUCT DECISIONS:     NONE REQUIRED
```

Planning baseline HEAD: `692403bd3c28174264cb2035376c7bd8e0a97e7c`  
(`docs(epic-108): finalize engineering review`)

This Epic is test-hardening only. It does not change application timezone authority, TimeEntry semantics, or R1 certification.

---

## 1. Objective

Make calendar-date tests deterministic across runner timezone and UTC-midnight boundaries, so FINDING-108-ER-001 is not reproducible and F-104-006 is closed or explicitly reclassified — without changing TimeEntry, `workDate`, or `Workspace.timezone` semantics.

---

## 2. Certified timezone split

Do not collapse these conventions. EPIC-109 introduces no new timezone authority.

| Surface | Authority | Calendar extraction |
|---|---|---|
| `TimeEntry.workDate` | Date-only, UTC midnight (`YYYY-MM-DDT00:00:00.000Z`) | No timezone model (EPIC-103) |
| Time Tracking default “today” | Process instant → **UTC calendar day** via `toISOString().split("T")[0]` | Not `Workspace.timezone` |
| Reporting / analytics current periods | **`Workspace.timezone`** (`getTodayInTimezone`) | PD-105-003 / BR-105-014 |
| Custom reporting range | UTC calendar getters | FINDING-QA-002 CLOSED |
| E2E first workspace | `Europe/Rome` unless overridden | `tests/e2e/helpers/first-workspace.ts` |

Constraints:

- No change to `Workspace.timezone`.
- No change to `workDate` semantics.
- No application change is planned.
- Time Tracking default today stays UTC calendar; reporting current periods stay `Workspace.timezone`. Do not unify them in this Epic.

---

## 3. Problem / root cause

```text
test Instant (new Date)
  → local getters (getFullYear / getMonth / getDate)
  → expected ?date= / display  “2026-09-20” / “9/20/2026”
        ≠
app Instant (same clock)
  → toISOString() UTC day
  → actual ?date= / display   “2026-09-19” / “9/19/2026”
```

The mismatch is introduced in the **test’s calendar extraction**, not in persistence or `Workspace.timezone`.

Same class, inverted, in E2E fixtures: `new Date(y, m, d)` (local midnight) then `toISOString().split("T")[0]` (UTC day) → systematic off-by-one east of UTC.

---

## 4. Current evidence

### FINDING-108-ER-001

| Field | Value |
|---|---|
| Status | OPEN — remains OPEN until Engineering Review (P109-06) |
| Classification | PRE-EXISTING / TEST DEFECT / NON-BLOCKING |
| Reproduced | 2× during ER EPIC-108 (journey + immutability) |
| File | `tests/e2e/time-tracking.spec.ts` |
| Observed | expected `2026-09-20` / `9/20/2026`; app `date=2026-09-19` / `9/19/2026` |
| Test construction | `TODAY = new Date()` + **local** getters |
| App construction | form default and `getTodayISO()` use **UTC** `toISOString().split("T")[0]`; redirect uses form `workDate`; display is `toLocaleDateString()` on `workDate + "T00:00:00.000Z"` |
| Host | Europe/Rome (UTC+2). Window `00:00–01:59` CEST = UTC still previous day |

### F-104-006 (OPEN, High) — three axes

| Axis | Status at planning | Evidence |
|---|---|---|
| 1. Hardcoded Sept 2026 vs current-month analytics | Remediated P105-01 — reconfirm in P109-01 | `tests/integration/current-month-dates.ts` + `currentMonthDay()` |
| 2. `analytics-isolation` futureDate local `setDate` | CLOSED as FINDING-INT-001 — reconfirm in P109-01 | UTC today + 30 days; host + `TZ=America/Los_Angeles` 224/224 |
| 3. E2E / leftover `new Date()` calendar construction | Open residual | time-tracking E2E = ER-001; `analytics-fixtures.ts` `todayValue` / `firstDayOfCurrentMonth`; dashboard month label; reports year |

Original **2026-10-01** expiry applied to axis 1 only. Residual risk is **any UTC-midnight crossing**, not that date.

F-104-006 may be closed only if all three axes are resolved or classified with motivation.

### Related, not this Epic

| ID | Relation | Rule |
|---|---|---|
| F-103-006 | Historical related (invalid `?date=` silent fallback) | Out of scope. Remains OPEN. Do not reclassify. |
| FINDING-QA-002 | Custom range UTC getters | Stream A CLOSED. Do not reopen. |
| FINDING-INT-001 | Isolation futureDate UTC midnight | Stream A CLOSED. Do not reopen. |
| FINDING-108-001 | `isDateInPeriod` UTC getters | Stream A CLOSED. Do not reopen. |

Not this class: auth E2E (Stream B `waitForURL`); alert `new Date()` timestamps (instants); analytics-periods unit tests (explicit ISO).

---

## 5. Scope

- FINDING-108-ER-001 remediation (test-only).
- F-104-006: confirm axis 1 remediates; classify axis 2 closed via INT-001; harden axis 3 residuals.
- Inventory of calendar-date construction in tests (local getters, local-midnight + `toISOString()`, implicit runner TZ).
- Test-only UTC calendar helpers with explicit names.
- Align time-tracking E2E and E2E fixtures (`analytics-fixtures`, consumers: reports, mvp-integration, dashboard) to the certified convention of the surface they assert.
- Verification: host TZ + one non-UTC TZ (`America/Los_Angeles`, same as ER-108).

---

## 6. Explicit out of scope

- TimeEntry domain, `workDate` mutability, contract validity.
- `Workspace.timezone` authority, reporting helpers, `getTodayInTimezone` / period constructors.
- Changing Time Tracking “today” to `Workspace.timezone` or process/browser local.
- F-103-006, F-105-013, F-104-015, F-104-001, UX, calendar UI, billing, revenue, capacity.
- Global Jest/Playwright timezone unless P109-01 proves a helper cannot suffice.
- Retries/timeouts as a “fix”.
- R1 / `MASTER_PLAN.md` §33–§35 / EPIC-108 snapshot rewrites.
- Application (`src/`) changes. If one appears necessary: stop and raise a PO decision.

---

## 7. Architecture / testing design

No new timezone authority. No application change.

Two test conventions, never one `today()`:

| Helper | Convention | Used for |
|---|---|---|
| `utcTodayYmd(now?)` | UTC Y-M-D from instant (`getUTC*`) | Time Tracking default today / `?date=` |
| `utcYmd` / `parseUtcYmd` / `addUtcDays` | Pure ISO calendar ↔ UTC-midnight `Date` | Explicit fixtures |
| Existing `current-month-dates.ts` | `getCurrentMonthPeriod("UTC")` | Current-month analytics integration |
| Production `getTodayInTimezone(tz, now)` | `Workspace.timezone` | Timezone-behavior tests only; inject `now` |

**Do not create:** unnamed `today()`, process-local helpers, silent default TZ, Playwright TZ as default, retry wrappers, helpers under `src/lib`.

**Live in:** `tests/helpers/calendar-date.ts` (shared). E2E fixtures import it. Do not merge with `current-month-dates.ts`.

**Regression rule (document at P109-07):** calendar dates are ISO strings or `Date.UTC`; never local getters or local-midnight + `toISOString()` for a Y-M-D. Timezone-dependent tests pass the timezone explicitly.

**Clock injection:** only for timezone-behavior unit tests (period constructors already accept `now`). No fake timers for E2E today.

**Display:** derive expected `toLocaleDateString()` from the UTC YMD + `T00:00:00.000Z` in the same TZ as the browser; do not rebuild from local getters.

---

## 8. Test matrix

| Family | Category | Current risk | Hardening | Environment |
|---|---|---|---|---|
| E2E time-tracking | Calendar-date | **Confirmed** ER-001 | `utcTodayYmd` + TZ-safe display | Host + LA |
| E2E `analytics-fixtures` | Calendar-date | Same class (local midnight → UTC ISO) | UTC (time-tracking fill) vs `getTodayInTimezone("Europe/Rome")` (reporting period) | Host + LA |
| E2E reports / mvp-integration | Calendar-date | Consume fixtures | Follow helper | Host + LA |
| E2E dashboard period label | Timezone behavior | Local `toLocaleString` vs `Workspace.timezone` | Expect Rome-resolved month/year | Host; LA only if helper is explicit |
| E2E reports year caption | Calendar-date | `getFullYear()` local | Workspace year via `getTodayInTimezone` | Host + year-boundary note |
| Integration analytics current-month | Calendar-date | Axis 1 remediates | Confirm only; no rewrite | Host + LA (already) |
| Integration isolation futureDate | Relative calendar | INT-001 closed | Optional style align to `addUtcDays`; not required | Host + LA |
| Unit analytics-periods | Timezone behavior | Low | Keep explicit ISO + injected `now` | Existing |
| Auth E2E | Instant / flake | None documented as clock | No change | — |
| Alert unit/integration `new Date()` | Instant / TTL | Timestamps, not calendar | No change | — |

Do not apply UTC-today helpers to reporting current-period assertions.

---

## 9. Acceptance criteria

- **AC-109-001** FINDING-108-ER-001 not reproducible (journey + immutability) on host and `America/Los_Angeles`.
- **AC-109-002** F-104-006: axis 1 classified remediates (P105-01, reconfirmed); axis 2 classified CLOSED via INT-001; axis 3 hardened or classified with motivation. Finding closed only if all three axes are done.
- **AC-109-003** No involved test builds a deterministic calendar date from runner-local getters or local-midnight + `toISOString()`.
- **AC-109-004** Timezone-dependent tests pass the timezone explicitly (`Europe/Rome` or the workspace value).
- **AC-109-005** No change to `Workspace.timezone` / `workDate` application semantics.
- **AC-109-006** Directly involved suites PASS (time-tracking E2E; reports/dashboard/mvp-integration if touched; analytics integration if touched).
- **AC-109-007** Typecheck and lint PASS.
- **AC-109-008** Verification includes host TZ and one non-UTC TZ (`America/Los_Angeles`).
- **AC-109-009** F-103-006 remains OPEN; Stream A closures (QA-002, INT-001, 108-001) remain CLOSED.
- **AC-109-010** No new timezone authority; no global runner TZ change unless P109-01 proves necessity.

FINDING-108-ER-001 stays OPEN until P109-06. F-104-006 stays OPEN until all three axes are resolved or classified.

---

## 10. Phase plan

One phase = one objective = one commit. Do not start a later phase inside an earlier one.

### P109-00 — planning

- **Objective:** Official epic plan exists.
- **Files:** `docs/epics/EPIC-109/epic-plan.md`
- **AC:** Plan present; SoT cited; no `src/` or `tests/` change.
- **Verification:** Markdown; AC-109-001 … AC-109-010 present; `git diff` limited to this file.
- **Commit:** `docs(epic-109): plan calendar-date and clock-test hardening`

### P109-01 — inventory / root cause

- **Objective:** Confirm every residual clock-sensitive site; classify F-104-006 axes.
- **Files:** this epic-plan appendix.
- **AC:** Inventory complete; three F-104-006 axes classified; no test edits. **Met.**
- **Verification:** no `src/` or `tests/` diff.
- **Commit:** `docs(epic-109): inventory clock-sensitive calendar-date tests`

### P109-02 — deterministic fixtures / helper

- **Objective:** Shared test-only calendar-date helpers exist.
- **Files likely:** `tests/helpers/calendar-date.ts`; E2E fixture wiring.
- **AC:** Helpers pure; names encode UTC vs workspace; no `src/` change.
- **Verification:** typecheck.
- **Commit:** `test(helpers): add deterministic UTC calendar-date fixtures`

### P109-03 — time-tracking E2E

- **Objective:** Time-tracking E2E “today” matches UTC calendar day.
- **Files likely:** `tests/e2e/time-tracking.spec.ts`
- **AC:** AC-109-001 on host.
- **Verification:** time-tracking E2E.
- **Commit:** `test(e2e): align time-tracking today with UTC calendar date`

### P109-04 — remaining clock-sensitive tests

- **Objective:** Remaining axis-3 residuals follow the matrix conventions.
- **Files likely:** dashboard / reports / mvp-integration E2E and fixtures named by P109-01.
- **AC:** AC-109-003 for touched files; AC-109-004.
- **Verification:** touched E2E files.
- **Commit:** `test(e2e): harden remaining clock-sensitive date fixtures`

### P109-05 — regression matrix

- **Objective:** Host + non-UTC evidence for involved suites.
- **Files:** none (verification-only).
- **AC:** AC-109-006, AC-109-007, AC-109-008. **Met.** No commit.
- **Verification:** host TZ and `America/Los_Angeles`; no retries as a fix.
- **Commit:** none (verification-only)

### P109-06 — Engineering Review

- **Objective:** Independent ER. Close FINDING-108-ER-001 / F-104-006 only with evidence.
- **Files:** `docs/epics/EPIC-109/engineering-review.md`
- **AC:** Verdict recorded; findings closed only if evidenced. **Met** — ER PASS.
- **Verification:** ER document vs HEAD evidence.
- **Commit:** `docs(epic-109): engineering review`

### P109-07 — documentation closure

- **Objective:** Current-state docs match ER. Historical snapshots untouched.
- **Files:** `MASTER_PLAN.md` (current status / next / debt only); `docs/testing-strategy.md` calendar-date convention; `CHANGELOG.md`; this plan current-state.
- **AC:** Current-state updated; §33–§35, R1, EPIC-108 preserved. **Met.**
- **Verification:** no historical snapshot rewrite.
- **Commit:** `docs(epic-109): close calendar-date hardening`

---

## 11. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Accidental app behavior change | Test-only epic; any `src/` change stops for PO |
| Process TZ dependency | UTC getters / `Date.UTC`; verify under LA |
| Browser TZ dependency | Display expected from UTC-midnight + browser TZ; no global `timezoneId` |
| UTC vs local vs workspace collapse | Named helpers; matrix splits conventions |
| Over-generalized `today()` | Forbidden API; two conventions |
| Test fix masking app defect | ER classified TEST DEFECT; if app ≠ UTC today, stop |
| Partial F-104-006 close | Three-axis classification; close only if all done |
| False green via retry | Isolated runs; no retry-as-fix |
| Reopening Stream A | Do not edit `getDateRangePeriod` / `isDateInPeriod` / isolation futureDate unless regression |

---

## 12. PO decisions

**No additional PO decision required; implementation can proceed after planning.**

Constraint (not a decision): Time Tracking default today stays UTC calendar; reporting current periods stay `Workspace.timezone`. Do not ask to unify them inside EPIC-109.

D-NEXT-001 = A is already decided (this Epic).

---

## 13. Documentation plan

Update at the named phase only. Do not edit these documents in P109-00 except this file.

| Document | Action | Phase |
|---|---|---|
| `docs/epics/EPIC-109/epic-plan.md` | Create | P109-00 |
| Epic-plan inventory appendix | Update | P109-01 |
| `docs/epics/EPIC-109/engineering-review.md` | Create | P109-06 |
| `docs/epics/EPIC-109/findings.md` | Create if ER needs a register | P109-06 / P109-07 |
| `MASTER_PLAN.md` | Current status, next, debt only | P109-07 |
| `docs/testing-strategy.md` | Replace F-104-006 Sept-2026 warning with calendar-date convention | P109-07 |
| `CHANGELOG.md` | EPIC-109 entry only | P109-07 |
| EPIC-108 ER / findings, R1, QA/UX snapshots, §33–§35 | Preserve | — |

---

## 14. Current git state / planning baseline

| Field | Value |
|---|---|
| Branch | `main` |
| Working tree at planning | clean |
| HEAD | `692403bd3c28174264cb2035376c7bd8e0a97e7c` |
| HEAD message | `docs(epic-108): finalize engineering review` |
| R1 | GRANTED — do not reopen |
| EPIC-108 | CLOSED — ER PASS WITH FINDINGS |
| FINDING-108-ER-001 | OPEN |
| F-104-006 | OPEN |
| F-103-006 | OPEN — out of scope |
| Stream A (QA-002, INT-001, 108-001) | CLOSED |

Next phase at planning: P109-02 — deterministic fixtures / helper.

---

## Appendix — P109-01 Inventory

Confirmed at HEAD `fc3c82993ea628c24d2ac2eaa7d256b0dfec5818`. Test files were read only; none were modified.

Helpers already present: `tests/integration/current-month-dates.ts` (UTC current-month builders). Defective E2E builders: `todayValue` / `firstDayOfCurrentMonth` in `tests/e2e/helpers/analytics-fixtures.ts`. Shared `tests/helpers/calendar-date.ts` does not exist yet.

### P109-01 Inventory

| File / area | Pattern | Category | Status | Evidence | Planned phase |
|---|---|---|---|---|---|
| `tests/e2e/time-tracking.spec.ts` | `new Date()` + local `getFullYear`/`getMonth`/`getDate` → `TODAY_ISO` / `TODAY_DISPLAY` / `TODAY_URL` | calendar-date | OPEN — FINDING-108-ER-001 | Expected `2026-09-20` / `9/20/2026`; app UTC `date=2026-09-19` / `9/19/2026` (ER-108) | P109-03 |
| `tests/e2e/helpers/analytics-fixtures.ts` `firstDayOfCurrentMonth` | local `new Date(y, m, 1)` then `toISOString().split("T")[0]` | calendar-date | OPEN residual | East-of-UTC local midnight → previous UTC Y-M-D | P109-02 |
| `tests/e2e/helpers/analytics-fixtures.ts` `todayValue` | local `new Date(y, m, d)` then `toISOString().split("T")[0]` | calendar-date | OPEN residual | Same class, inverted vs time-tracking local getters | P109-02 |
| `tests/e2e/reports.spec.ts` custom range | `todayValue()` as custom `start`/`end` | calendar-date | OPEN (inherits fixture) | `includedDay = todayValue()` then URL/subtitle | P109-04 (inherits P109-02) |
| `tests/e2e/reports.spec.ts` annual caption (2 tests) | `new Date().getFullYear()` vs caption `Annual Overview — YYYY` | timezone behavior | OPEN residual | Workspace is `Europe/Rome`; runner local year is not `getTodayInTimezone` | P109-04 |
| `tests/e2e/mvp-integration-journey.spec.ts` | `firstDayOfCurrentMonth()` `validFrom`; `todayValue()` `workDate` | calendar-date | OPEN (inherits fixture) | Contract + TimeEntry fixtures | P109-04 (inherits P109-02) |
| `tests/e2e/dashboard.spec.ts` period heading | `now.toLocaleString("en-US", { month, year })` vs `Dashboard - …` | timezone behavior | OPEN residual | Asserts runner locale month; app uses `Workspace.timezone` (`Europe/Rome`) | P109-04 |
| `tests/e2e/dashboard.spec.ts` `endOfYear` | `new Date(getFullYear(), 11, 31).toISOString().split("T")[0]` | calendar-date | OPEN residual | Local 31 Dec midnight → UTC Y-M-D may be 30 Dec | P109-04 |
| `tests/e2e/dashboard.spec.ts` `createTestTimeEntries` | `createClientWithContract` default `validFrom` | calendar-date | OPEN (inherits fixture) | Defaults to `firstDayOfCurrentMonth()` | P109-04 (inherits P109-02) |
| `tests/integration/current-month-dates.ts` | `getCurrentMonthPeriod()` + `Date.UTC` / `getUTC*` | calendar-date | OK | Fixtures follow clock-resolved UTC month; days 1–28 | — |
| `analytics-product-decisions.test.ts` | `currentMonthDay` / `monthOffsetDay` | calendar-date | OK — axis 1 remediates | No `Date.UTC(2026, 8)` / no “assumes September 2026” | — |
| `analytics-workspace-isolation.test.ts` | `currentMonthDay` | calendar-date | OK — axis 1 remediates | Same builders | — |
| `dashboard-page.test.ts` | `currentMonthDay` / `monthOffsetDay` | calendar-date | OK — axis 1 remediates | Same builders | — |
| `analytics-isolation.test.ts` futureDate | `Date.UTC(now.getUTCFullYear(), getUTCMonth(), getUTCDate() + 30)` | relative calendar | OK — axis 2 CLOSED TECHNICAL | Comment cites INT-001; explicit `timezone: "UTC"` | optional style only, not required |
| `analytics-membership-guard.test.ts` | `getCurrentMonthPeriod()` default UTC | calendar-date via production helper | OK | Not local getters; not axis 3 | — |
| `analytics-timezone-propagation.test.ts` | explicit `America/New_York` + fixed instant | timezone behavior | OK | Timezone passed explicitly | — |
| `tests/unit/lib/analytics-periods.test.ts` | `vi.setSystemTime` ISO-Z; `getCurrentMonthPeriod("UTC")`; explicit `getMonthPeriod(2026, 9)` | timezone behavior | OK | Clock injected; timezone explicit. Historical September is not current-month coupling | — |
| `analytics-periods.test.ts` a few `new Date("…T14:30:00")` / `T23:59:59` without `Z` | local parse of clock time | ambiguity | No new remediation | Date-only `"YYYY-MM-DD"` is UTC per ES. Datetime without `Z` is local; 14:30 does not cross UTC day on host/LA. Do not invent a fix | — |
| `analytics-calculations.test.ts` | `Date.UTC(2026, 8, …)` with **explicit** period | non rilevante | OK | Hardcoded September vs explicit range, not vs `getCurrentMonthAnalytics()` | — |
| `tests/e2e/auth.spec.ts` | no `new Date` / calendar getters | non rilevante | OK | Not this class (Stream B was `waitForURL`) | — |
| Alert unit/integration `new Date()` | `createdAt` / `resolvedAt` / `readAt` | instant/TTL | OK | `notification-center.test.ts` passes `now` into `markNotificationRead` | — |

### F-104-006 Axis Classification

F-104-006 remains **OPEN** as a finding. Axes only:

| Axis | Current status | Evidence | EPIC-109 action |
|---|---|---|---|
| 1. Hardcoded Sept 2026 vs current-month analytics | **REMEDIATED / CLOSED TECHNICAL** | P105-01 `current-month-dates.ts`. Named integration files use `currentMonthDay` / `monthOffsetDay`. No remaining `Date.UTC(2026, 8)` or “assumes current month is September 2026” in `tests/integration/**`. Original 2026-10-01 expiry does not apply to this axis | No rewrite. Do not reopen |
| 2. `analytics-isolation` futureDate local `setDate` | **CLOSED TECHNICAL** (FINDING-INT-001) | UTC midnight + 30 UTC days; `timezone: "UTC"`; ER-108-A host + `TZ=America/Los_Angeles` 224/224 | No rewrite required. Optional later `addUtcDays` style only |
| 3. E2E / leftover calendar-date construction | **OPEN** | FINDING-108-ER-001 (time-tracking local getters). Same class: `analytics-fixtures` local-midnight + `toISOString`; dashboard `endOfYear`; reports/dashboard year-month via runner local getters | P109-02 helper + fixture wiring; P109-03 time-tracking E2E; P109-04 remaining specs |

Finding F-104-006 is not closed in P109-01.

### Root Cause Conclusion

Planning root-cause model is **confirmed**. No correction.

Mismatch is test calendar extraction, not `workDate` persistence and not `Workspace.timezone`:

- Time-tracking E2E: local getters vs app UTC `toISOString().split("T")[0]` (FINDING-108-ER-001).
- E2E fixtures: local midnight `Date` then UTC ISO day (off-by-one east of UTC).
- Dashboard/reports labels: runner-local month/year vs workspace `Europe/Rome`.

Certified split unchanged: `workDate` UTC midnight date-only; Time Tracking default today = UTC calendar day; reporting current periods = `Workspace.timezone`; custom range = UTC getters. No new timezone authority. No application change. F-103-006 remains out of scope. Stream A closures remain CLOSED.

### P109-06 / P109-07 closure

EPIC-109 is **CLOSED** (ER PASS). FINDING-108-ER-001 **CLOSED**. F-104-006 **CLOSED** (axes 1 / 2 / 3). F-103-006 remains **OPEN**. The P109-01 inventory table above is the inventory snapshot and is not rewritten. LA full-integration `updatedAt` same-millisecond flake is out of scope (ER §5), not an EPIC-109 finding.
