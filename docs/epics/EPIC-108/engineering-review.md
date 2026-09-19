# EPIC-108 Engineering Review

**Epic:** EPIC-108 — Post-Release Hardening  
**Phase:** Final ER  
**Release:** Release 1 — MVP  
**Date:** 2026-09-20  
**Reviewer:** Engineering Review Agent  
**HEAD:** `9f62e675f1c306fc70063d9acbc16b4241edcb27`

```text
ENGINEERING REVIEW RESULT: PASS WITH FINDINGS
PRODUCTION READINESS:      UNCHANGED (R1 GRANTED)
NEW FINDINGS:              FINDING-108-ER-001 (PRE-EXISTING / NON-BLOCKING)
BLOCKING FINDINGS:         NONE
EPIC-108 STREAMS:          A / E / B / D / C CLOSED
```

This result does not rewrite `MASTER_PLAN.md` §34 / §35 or R1 certification.

---

## 1. Scope

Reviewed stream closures A, E, B, D, C and current-state documentation.

Out of scope: application or test remediation; historical gate snapshot rewrites; re-certification of R1.

---

## 2. Evidence

| Gate | Result |
|---|---|
| typecheck | PASS |
| lint | PASS |
| unit | PASS — 430/430 |
| integration (host) | PASS — 224/224 |
| integration (`TZ=America/Los_Angeles`) | PASS — 224/224 |
| Reports E2E (isolated) | PASS — 22/22 |
| Full E2E (isolated retry of flakes) | 72/76 first run; auth + contracts PASS on retry; 2 time-tracking failures reproduced (FINDING-108-ER-001) |

First Reports E2E run (10 failures) collided with a parallel integration process on the same test database (`account_userId_fkey`). Classified ENVIRONMENT. Isolated re-run: 22/22.

---

## 3. Stream status

| Stream | Status | Closure |
|---|---|---|
| A | CLOSED | ER-108-A. QA-002, INT-001, 108-001. UTC getters; host + LA |
| E | CLOSED | ER-108-E. F-104-007. Workspace context outside `try`; `NEXT_REDIRECT` rethrown |
| B | CLOSED | ER-108-B. QA-001, INT-002, INT-003. Evidence-only |
| D | CLOSED | ER-108-D1/D2/D3. F-104-011/012/010 |
| C | CLOSED | C05. UX-004. Custom Period Selector; Reports E2E 22/22 |

---

## 4. Findings closure

| ID | Current | Category | Evidence | Remediation |
|---|---|---|---|---|
| QA-002 | CLOSED | APPLICATION | UTC `getDateRangePeriod`; host + LA | None |
| INT-001 | CLOSED | TEST | UTC `futureDate`; 224/224 host + LA | None |
| 108-001 | CLOSED | APPLICATION | UTC `isDateInPeriod` | None |
| F-104-007 | CLOSED | APPLICATION | dashboard context / redirect rethrow | None |
| QA-001 | CLOSED | TEST / FLAKE | Stream B isolated release-gate 3/3 | None |
| INT-002 | CLOSED | TEST | Stream B sign-out 2/2; this ER auth sign-out PASS on retry | None |
| INT-003 | CLOSED | TEST / INFRA | Stream B password-reset E2E 1/1 | None |
| F-104-011 | CLOSED | A11Y | Monthly Summary `<dl>` | None |
| F-104-012 | CLOSED | A11Y | native `h2`; truncation in heading DOM; within-capacity text | None |
| F-104-010 | CLOSED | A11Y / TEST | dashboard a11y 11/11 | None |
| UX-004 | CLOSED | UX | Custom Range on `/reports`; C01–C05 | None |

Historical OPEN rows in §33 / §34 / §35 / UX Gate / QA Gate snapshots are left as recorded.

---

## 5. Architecture

No workspace-isolation bypass. Custom period authority remains search params. `CustomPeriodFields` local state is validation-only. `noValidate` + JS `validateCustomPeriodFields` is the submit authority; `end.min` is a picker affordance. UTC calendar helpers unchanged for custom ranges. Dashboard redirects rethrown. No Prisma/schema change. No new architectural dependencies.

---

## 6. Documentation

Current-state records (findings matrix, MASTER_PLAN current status, testing-strategy Stream C, qa-report §20, CHANGELOG latest Stream C) agree: all five streams CLOSED.

Historical snapshots that still say OPEN are not current-state errors.

`docs/architecture.md` status header does not name EPIC-108; body records Stream A/C. Not a blocker.

---

## 7. Release impact

| Layer | Status |
|---|---|
| EPIC-108 technical | CLOSED / ER PASS WITH FINDINGS |
| R1 certification | UNCHANGED — GRANTED |
| New §37 Release Blockers | NONE |

---

## 8. New finding

### FINDING-108-ER-001 — Time-tracking E2E “today” disagrees across UTC midnight

| Field | Value |
|---|---|
| **Status** | OPEN |
| **Classification** | PRE-EXISTING / TEST DEFECT (local getters vs `toISOString()` UTC day) |
| **Blocking** | No |
| **Introduced by EPIC-108** | No |
| **Reproduced** | twice (`tests/e2e/time-tracking.spec.ts` journey + immutability) |
| **Observed** | test expects `2026-09-20` / `9/20/2026`; app shows `date=2026-09-19` / `9/19/2026` |
| **Related** | F-103-006 (historical; not reclassified) |
| **Action** | Leave OPEN. Do not treat as EPIC-108 regression or R1 blocker. |

---

## 9. Verdict

**PASS WITH FINDINGS.**

All EPIC-108 streams are closed with coherent evidence. No new EPIC-108 application defect. No new release blocker. FINDING-108-ER-001 is pre-existing and out of EPIC-108 remediation scope.
