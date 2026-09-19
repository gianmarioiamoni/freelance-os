# EPIC-108 — Findings Matrix

**Epic:** EPIC-108 — Post-Release Hardening  
**Scope of this record:** Stream A, Stream E, Stream B, and Stream D documentation closure  
**ER-108-A:** PASS  
**ER-108-E:** PASS  
**ER-108-B:** PASS  
**ER-108-D1:** PASS  
**ER-108-D2:** PASS  
**ER-108-D3:** PASS  
**Does not rewrite:** MASTER_PLAN §34 / §35, R1 certification, historical QA / UX / EPIC-107 rows

---

## Stream A

| Field | Value |
|---|---|
| **Status** | technically complete |
| **ER** | ER-108-A PASS |
| **Findings** | FINDING-QA-002 CLOSED; FINDING-INT-001 CLOSED; FINDING-108-001 CLOSED |
| **Phases** | P108-01, P108-02, P108-02B, P108-02C (this record) |

| Phase | Commit | SHA |
|---|---|---|
| P108-01 | `fix(analytics): timezone-safe custom date range` | `985e518cef7ebed1eddbd48ac8d03d67eba18e26` |
| P108-02 | `fix(test): utc fixtures for analytics isolation` | `49c90edb3303af5b2c4f8340130f46c9e87c64c4` |
| P108-02B | `fix(analytics): make isDateInPeriod timezone-safe` | `7dcbc56acfe62b545b86c4f68a3d5ee1f5fb4665` |

---

## FINDING-QA-002 — `getDateRangePeriod` process-timezone leak

| Field | Value |
|---|---|
| **ID** | FINDING-QA-002 |
| **Status** | CLOSED |
| **Classification** | APPLICATION DEFECT |
| **Fix** | `getDateRangePeriod` uses UTC getters for custom calendar dates |
| **Evidence** | host TZ PASS; `TZ=America/Los_Angeles` PASS |
| **Closure review** | ER-108-A PASS |
| **Commit** | P108-01 `985e518cef7ebed1eddbd48ac8d03d67eba18e26` |
| **Origin** | `docs/qa/qa-report.md` (historical OPEN at QA Gate) |

---

## FINDING-INT-001 — `analytics-isolation.test.ts` future date UTC normalization

| Field | Value |
|---|---|
| **ID** | FINDING-INT-001 |
| **Status** | CLOSED |
| **Classification** | TEST DEFECT |
| **Root cause** | fixture `futureDate` timezone-dependent (`new Date(); setDate(+30)`) |
| **Fix** | UTC midnight calendar date (UTC today + 30 days) |
| **Evidence** | integration host 224/224; `TZ=America/Los_Angeles` 224/224 |
| **Closure review** | ER-108-A PASS |
| **Commit** | P108-02 `49c90edb3303af5b2c4f8340130f46c9e87c64c4` |
| **Origin** | `docs/epics/MVP-INTEGRATION/engineering-review.md` (historical OPEN / CONFIRMED) |

---

## FINDING-108-001 — `isDateInPeriod` local getters

| Field | Value |
|---|---|
| **ID** | FINDING-108-001 |
| **Status** | CLOSED |
| **Classification** | APPLICATION DEFECT, LATENT, NON-BLOCKING |
| **Root cause** | local getters in `isDateInPeriod` on UTC-midnight calendar dates |
| **Fix** | UTC calendar-date comparison |
| **Evidence** | `isDateInPeriod` 6/6 host, 6/6 LA; helper collegati 67/67; `analytics-periods.test.ts` LA 32/32 |
| **Closure review** | ER-108-A PASS |
| **Commit** | P108-02B `7dcbc56acfe62b545b86c4f68a3d5ee1f5fb4665` |
| **Origin** | ER-108-A (emerged during P108-01; no production consumer at close) |

---

## Stream E

| Field | Value |
|---|---|
| **Status** | technically complete |
| **ER** | ER-108-E PASS |
| **Findings** | F-104-007 CLOSED |
| **Phases** | P108-03, P108-03C (this record) |

| Phase | Commit | SHA |
|---|---|---|
| P108-03 | `fix(workspace): preserve Next.js redirect semantics` | `38e8bf9d3198517e33f3b1a7ca1b7b94f6058869` |

---

## F-104-007 — page-level `catch` swallows Next.js `NEXT_REDIRECT`

| Field | Value |
|---|---|
| **ID** | F-104-007 |
| **Status** | CLOSED |
| **Classification** | APPLICATION / operational warning (pre-existing) |
| **Root cause** | dashboard `catch` wrapped `getCurrentWorkspaceContext()` and treated `NEXT_REDIRECT` as an application error |
| **Fix** | workspace context resolved outside the `try`; if a `NEXT_REDIRECT` still enters the `catch`, it is rethrown |
| **Real errors** | unchanged: `console.error` + `ErrorState` |
| **Closure review** | ER-108-E PASS |
| **Commit** | P108-03 `38e8bf9d3198517e33f3b1a7ca1b7b94f6058869` |
| **Origin** | `docs/epics/EPIC-104/engineering-review.md` (historical OPEN) |
| **Not in this close** | `DYNAMIC_SERVER_USAGE` remains a historical EPIC-104 observation; it is not part of the NEXT_REDIRECT fix and does not reopen F-104-007 |

---

## Stream B

| Field | Value |
|---|---|
| **Status** | technically + documentally complete |
| **ER** | ER-108-B PASS |
| **Findings** | FINDING-QA-001 CLOSED; FINDING-INT-002 CLOSED; FINDING-INT-003 CLOSED |
| **Phases** | P108-04 (evidence only), P108-04C (this record) |
| **P108-05** | not required |

No application or test code was changed for Stream B.

---

## FINDING-QA-001 — Flaky release-gate registration

| Field | Value |
|---|---|
| **ID** | FINDING-QA-001 |
| **Status** | CLOSED |
| **Classification** | historical flake not reproduced |
| **Evidence** | 3/3 isolated release-gate E2E PASS (`CI=true pnpm test:e2e --workers=1 tests/e2e/mvp-integration-journey.spec.ts`) |
| **Fix** | none — no test/app change |
| **Closure review** | ER-108-B PASS |
| **Origin** | `docs/qa/qa-report.md` (historical OPEN / FLAKY at QA Gate) |

---

## FINDING-INT-002 — `auth.spec.ts` sign-out timing

| Field | Value |
|---|---|
| **ID** | FINDING-INT-002 |
| **Status** | CLOSED |
| **Classification** | not reproduced |
| **Evidence** | 2/2 sign-out E2E PASS (`should register, stay authenticated, and sign out`) |
| **Verified behavior** | sign-out → `/`; `/dashboard` → `/sign-in`; re-login → `/onboarding` |
| **Closure review** | ER-108-B PASS |
| **Origin** | `docs/epics/MVP-INTEGRATION/engineering-review.md` (historical OPEN / NOT REPRODUCED) |

---

## FINDING-INT-003 — password-reset E2E

| Field | Value |
|---|---|
| **ID** | FINDING-INT-003 |
| **Status** | CLOSED |
| **Classification** | E2E test environment PASS |
| **Evidence** | 1/1 password-reset E2E PASS (`should recover a password from the email/password flow`; test-env token helper, no real email) |
| **Production (separate)** | request → Gmail email → reset link → new password → old password rejected. Not E2E evidence. |
| **Closure review** | ER-108-B PASS |
| **Origin** | `docs/epics/MVP-INTEGRATION/engineering-review.md` (historical OPEN / NOT REPRODUCED) |

---

## Stream D

| Field | Value |
|---|---|
| **Status** | technically complete |
| **ER** | ER-108-D1 PASS; ER-108-D2 PASS; ER-108-D3 PASS |
| **Findings** | F-104-011 CLOSED; F-104-012 CLOSED; F-104-010 CLOSED |
| **Phases** | P108-06, P108-07, P108-08, P108-08C (this record) |

| Phase | Commit | SHA |
|---|---|---|
| P108-06 | `fix(a11y): use description list for monthly summary` | `3d4ad4c11dc1c6fd7808b6a7469dc573e5eb7873` |
| P108-07 | `fix(a11y): improve dashboard semantics` | `1f2cf7136c9e5f07fc2d9eca2d585a912dc1e5c7` |
| P108-08 | `test(a11y): harden dashboard accessibility assertions` | `8f5607e7889b268417bc011e72a2e852e82707c0` |

---

## F-104-011 — description-list markup without a `dl` ancestor

| Field | Value |
|---|---|
| **ID** | F-104-011 |
| **Status** | CLOSED |
| **Root cause** | `dt`/`dd` without a `<dl>` parent |
| **Fix** | Monthly Summary is a semantic description list (`<dl>` + four `div` groups of `dt`/`dd`) |
| **Unchanged** | layout grid classes, visible text, values, `aria-label` |
| **Evidence** | dashboard journey 1/1; semantic HTML/a11y 1/1 |
| **Closure review** | ER-108-D1 PASS |
| **Commit** | P108-06 `3d4ad4c11dc1c6fd7808b6a7469dc573e5eb7873` |
| **Origin** | `docs/epics/EPIC-104/engineering-review.md` (historical OPEN) |

---

## F-104-012 — residual accessibility-specification gaps

| Field | Value |
|---|---|
| **ID** | F-104-012 |
| **Status** | CLOSED |
| **Root cause** | truncation/accessibility semantics, simulated card headings, visual-only under-limit state |
| **Fix A** | Full `clientName` remains in the `h3` DOM; CSS `truncate` is isolated to the inner span; Archived badge is outside the heading; `title` is hover support with the same name |
| **Fix B** | Monthly Summary, Client Allocation, and Contract Utilization card titles are native `h2`; hierarchy `h1` → `h2` → `h3`; CardTitle styling preserved |
| **Fix C** | `"Within contracted capacity"` when capacity is finite and the known percentage is `<= 100`; `>80` remains a visual bar cue only; null/unlimited capacity has no within/over text |
| **Unchanged** | AnalyticsService, alert/business thresholds, layout |
| **Evidence** | unit display 7/7; dashboard journey 1/1; semantic HTML/a11y 1/1 |
| **Closure review** | ER-108-D2 PASS |
| **Commit** | P108-07 `1f2cf7136c9e5f07fc2d9eca2d585a912dc1e5c7` |
| **Origin** | `docs/epics/EPIC-104/engineering-review.md` (historical OPEN) |

---

## F-104-010 — several accessibility assertions cannot fail

| Field | Value |
|---|---|
| **ID** | F-104-010 |
| **Status** | CLOSED |
| **Root cause** | Unsound / non-probative a11y assertions (invalid `:focus` pseudo, inert contrast `@media`, `body.style.zoom`, vacuous `if` loops) |
| **Fix** | Semantic assertions for native headings, 200% CSS viewport overflow, `emulateMedia` forced-colors/reduced-motion, utilization and within-capacity text, skip-link target `#main-content`, and a real focus indicator |
| **Removed** | `getComputedStyle(..., ':focus')`, unused contrast media injection, `body.style.zoom`, vacuous conditionals / `.sr-only` loops |
| **Evidence** | dashboard accessibility suite 11/11; typecheck PASS; lint PASS |
| **Closure review** | ER-108-D3 PASS |
| **Commit** | P108-08 `8f5607e7889b268417bc011e72a2e852e82707c0` |
| **Origin** | `docs/epics/EPIC-104/engineering-review.md` (historical OPEN) |

---

## Still OPEN (not Stream A / E / B / D)

FINDING-UX-004 (Stream C; custom period selector; requires Product Owner decision).
