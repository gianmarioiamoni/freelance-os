# EPIC-108 — Findings Matrix

**Epic:** EPIC-108 — Post-Release Hardening  
**Scope of this record:** Stream A and Stream E documentation closure  
**ER-108-A:** PASS  
**ER-108-E:** PASS  
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

## Still OPEN (not Stream A / E)

FINDING-QA-001, FINDING-INT-002, FINDING-INT-003, FINDING-UX-004, F-104-010, F-104-011, F-104-012.
