# R2 Open Decisions Register

**Status:** Residual register after Decision Workshop  
**Date:** 2026-09-22  
**Product decisions owner:** Product Owner  
**Technical planning owner:** Architect (during epic planning)  
**Authority:** `docs/release/r2-decision-pack.md`

Approved D1–D7 and approved OD resolutions are **not** reopened here.

Do not treat remaining items as implementation defaults. Do not invent WARNING thresholds, Forecast arithmetic, VOID UI, currency snapshot fields, CSV scope, Prisma snapshot names, DAILY same-day snapshot winners, or pre-snapshot TimeEntry backfill.

---

## How to read status

| Status | Meaning |
| --- | --- |
| APPROVED | Product Owner decided. Recorded in the decision pack |
| APPROVED — persistence dependency | Product semantics approved; current persistence does not yet contain the required field |
| DIRECTION APPROVED / residual OPEN | Direction closed; a planning or implementation question remains |
| OUT OF R2 | Explicitly not in R2. Historical OBD may remain open for a later release |

---

## Residual questions that must be resolved during epic planning

These are the product / planning decisions still required before the corresponding implementation phases. They are **not** approved assumptions.

### 1. Contract Time Allocation WARNING threshold

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-013 residual; PD-106-001 is a different (workspace) question |
| Question | At what consumption / allocation ratio does a Contract Time Allocation WARNING fire? |
| Why | R2-OD-013 approves optional `allocatedMinutes` and forbids inventing the threshold. |
| Impact | Blocks allocation WARNING alerts in R2-E04. EXCEEDED at 100% of allocation is not assumed. |
| Owner | Product Owner |
| Status | DIRECTION APPROVED / residual OPEN |
| Needed by | R2-E04 |

### 2. Exact Forecast calculation semantics

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-005 |
| Question | What is the exact linear Forecast arithmetic? |
| Why | Direction is approved: simple deterministic linear Forecast from Accrued and elapsed time in the current reporting period. No ML, AI, or extra signals. The implementation must still define the items below. |
| Must define | current-period elapsed time; projected full-period value; behaviour when elapsed time is zero; behaviour when Accrued is zero; behaviour for historical periods |
| Impact | Blocks Forecast Revenue in R2-E04. |
| Owner | Product Owner during R2-E04 planning |
| Status | DIRECTION APPROVED / residual OPEN |
| Needed by | R2-E04 |

### 3. Invoice currency snapshot representation

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-011 residual; D7 |
| Question | Does an Invoice persist its own currency value, or does it always read live `Contract.currency`? |
| Why | D7 ties Invoice currency to Contract. R2-OD-011 makes Contract currency immutable after the first monetary record, so live Contract currency and Invoice currency cannot diverge under the approved mutation rule. A persisted snapshot would be defensive historical stability, not FX. |
| Constraint | Do not introduce a rule that conflicts with D7 (must match Contract at write time) or R2-OD-011 (no retroactive conversion). |
| Impact | Invoice persistence in R2-E02. |
| Owner | Architect during R2-E02 planning; Product Owner if the choice changes historical meaning |
| Status | DIRECTION APPROVED / residual OPEN |
| Needed by | R2-E02 |

### 4. Exact Invoice VOID behaviour and UI semantics

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-007 residual |
| Question | How is VOID presented, filtered, restored (if at all), and excluded from active payment tracking? |
| Why | Product decision is VOID / soft-delete, not physical delete, and no fiscal immutability. UI and list semantics are not decided. |
| Impact | Invoice Tracking UI and payment integrity in R2-E02 / R2-E03. |
| Owner | Product Owner during R2-E02 planning |
| Status | DIRECTION APPROVED / residual OPEN |
| Needed by | R2-E02, R2-E03 |

### 5. Simple CSV export in R2-E05

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-012; product OD-011 |
| Question | Does a simple tabular / CSV export belong in R2-E05? |
| Why | Document / PDF generation is out of core R2. A simple tabular export may be included only if R2-E05 planning shows low complexity and clear value. Excel is not a decision. |
| Impact | R2-E05 scope. |
| Owner | Product Owner during R2-E05 planning |
| Status | DIRECTION APPROVED / residual OPEN |
| Needed by | R2-E05 |

### 6. Commercial snapshot persistence detail

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-003 residual; P102-F-001 / proposed OBD-016 |
| Decision | TimeEntry columns `snapshotBillingModel`, `snapshotRate` (`Decimal(19,4)`), `snapshotCurrency` |
| Status | APPROVED / CLOSED by P-E01-01 |
| Needed by | R2-E01 (implemented) |
| Plan | `docs/release/r2-e01-revenue-visibility.md` §8 |

### 7. DAILY same-day conflicting commercial snapshots

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-016 |
| Decision | Weighted-average daily rate: Σ(minutes under snapshot / total billable minutes for Contract/date × snapshot daily rate). No first/last-wins. |
| Status | APPROVED. Accrued arithmetic is P-E01-02 |
| Needed by | R2-E01 P-E01-02 |

### 8. Pre-snapshot TimeEntry treatment

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-017 |
| Decision | Migration backfills every existing TimeEntry from its current associated Contract. No null snapshots. No Contract revision reconstruction. |
| Status | APPROVED / CLOSED by P-E01-01 |
| Needed by | R2-E01 (implemented) |

---

## Approved resolutions (closed in this register)

| ID | Decision | Status |
| --- | --- | --- |
| R2-OD-001 | DAILY accrued: one billable day if at least one TimeEntry exists for that Contract on that calendar date; multiples count once; no work calendar | APPROVED |
| R2-OD-002 | Published money rounds to nearest integer; do not prematurely round intermediates | APPROVED |
| R2-OD-003 | Commercial Snapshot semantics for historical Accrued | APPROVED — TimeEntry `snapshotBillingModel` / `snapshotRate` / `snapshotCurrency` |
| R2-OD-016 | DAILY same-day conflicting snapshots use weighted-average daily rate | APPROVED |
| R2-OD-017 | Existing TimeEntries backfilled from current associated Contract | APPROVED |
| R2-OD-004 | Expected Revenue is HOURLY contractual capacity / pro-rata; null if capacity unavailable; DAILY has no Expected Revenue in R2 | APPROVED |
| R2-OD-006 | 1 Contract → many Invoice; 1 Invoice → 1 Contract; tracking fields only | APPROVED |
| R2-OD-007 | Optional reference; required invoiceDate; no competence period; editable; VOID / soft-delete | APPROVED (VOID UI residual) |
| R2-OD-008 | `paymentTermsDays = null` → no dueDate, no automatic overdue; no default days | APPROVED |
| R2-OD-009 | paidAmount sum; UNPAID / PARTIAL / PAID / MISMATCH; PAYMENT_OVERDUE independent | APPROVED |
| R2-OD-010 | Payment events editable / deletable; status derived; no ledger | APPROVED |
| R2-OD-011 | Contract currency mutable only before monetary records; then immutable; no FX | APPROVED (Invoice snapshot residual) |
| R2-OD-013 | Optional Contract `allocatedMinutes`; no workspace capacity alerts | APPROVED (WARNING threshold residual) |
| R2-OD-014 | No period-close / accounting-lock in R2 | OUT OF R2 |
| R2-OD-015 | No dedicated audit ledger in R2 | OUT OF R2 |

---

## Closed or not-in-register

| Item | Status |
| --- | --- |
| D1–D7 | APPROVED — decision pack |
| OBD-011 direction (no FX, Contract currency, TimeEntry agnostic, per-currency aggregates) | CLOSED by D7 |
| OBD-011 mutation after money records | CLOSED by R2-OD-011 |
| OBD-007 / OBD-008 in R2 | OUT OF R2 — remain historically open for a later release |
| OBD-010 catalog | DEFERRED — days field is enough for D5 |
| Excel export | Not a decision — out of R2 |
| Invoice Lifecycle / generation / fiscal PDF | Out of scope — D2 / R2-OD-012 |
| Profitability / PIVA Balance integration | Out of scope — D3 |
| Workspace capacity alerts | Out of scope — R2-OD-013 |
| Installment engine, grace %, risk, AI forecast | Out of scope — D5 / D6 / D4 |
| Calendar view / calendar integration | Not R2 |

---

## Planning implication

The Decision Workshop is complete for decisions currently in scope.

R2 detailed epic planning is **no longer blocked** on R2-OD-001, R2-OD-002, R2-OD-003 semantics, R2-OD-004, R2-OD-006, R2-OD-008, R2-OD-009, R2-OD-010, R2-OD-014, or R2-OD-015.

The residual questions above must be resolved during the epic that needs them. They must not be silently assumed in implementation.

R2-E01 planning (`docs/release/r2-e01-revenue-visibility.md`) classified commercial-snapshot persistence as class B and added R2-OD-016 and R2-OD-017. It did not open implementation.

No R2 implementation epic is opened by this register.
