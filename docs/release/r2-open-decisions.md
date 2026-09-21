# R2 Open Decisions Register

**Status:** Active register  
**Date:** 2026-09-21  
**Product decisions owner:** Product Owner  
**Technical planning owner:** Architect (after product decisions)  
**Authority:** `docs/release/r2-decision-pack.md`

Do not implement around these questions. Do not treat implementation defaults as policy.

Approved D1–D7 are **not** repeated here.

---

## How to read status

| Status | Meaning |
| --- | --- |
| OPEN | Product Owner must decide |
| DIRECTION CLOSED | D1–D7 answered the direction; a residual question remains |
| DEFERRED | Explicitly not required to start R2 unless the Product Owner pulls it in |

---

## Open product decisions

### R2-OD-001 — Daily-rate / billable-day semantics

| Field | Value |
| --- | --- |
| Historical ID | OBD-001 / product OD-001 / testing TD-001 (testing-strategy) |
| Question | What is a billable day for Accrued Revenue on DAILY contracts? How are partial days and multiple TimeEntries on the same date treated? |
| Why | D4 defines Accrued Daily as `billable days × daily rate` but does not define “billable day”. |
| Impact | Blocks DAILY Accrued Revenue. HOURLY Accrued direction is already approved. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E01 |

---

### R2-OD-002 — Monetary rounding and precision

| Field | Value |
| --- | --- |
| Historical ID | OBD-002 / product OD-002 |
| Question | How are monetary amounts rounded and at which step (per entry, per day, per period, at display)? What precision is published? |
| Why | D4–D6 introduce published money. R1 never closed rounding. |
| Impact | Blocks every published revenue, invoice, payment, and outstanding figure. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E01, R2-E02, R2-E03 |

---

### R2-OD-003 — Accrued Revenue after Contract commercial edits

| Field | Value |
| --- | --- |
| Historical ID | P102-F-001 / proposed OBD-016 |
| Question | After rate, billing model, or other commercial Contract fields change, does Accrued Revenue follow the live Contract or a historical commercial snapshot? |
| Why | TimeEntry stores `contractId` only. D4 says Accrued uses the applicable Contract conditions and does not choose live vs snapshot. Invoice-generation snapshots are withdrawn (D2). |
| Impact | Historical correctness of Accrued Revenue and of any later revenue report. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E01 |

---

### R2-OD-004 — Expected Revenue formula

| Field | Value |
| --- | --- |
| Historical ID | — (new; D4 gives direction only) |
| Question | What is the exact Expected Revenue formula per billing model and period (including pro-rata, open-ended contracts, null capacity, partial validity overlap)? |
| Why | D4 forbids a complex financial model but does not specify the calculation. |
| Impact | Blocks Expected Revenue. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E01 |

---

### R2-OD-005 — Forecast Revenue formula

| Field | Value |
| --- | --- |
| Historical ID | product vision §8 (narrowed by D4) |
| Question | What is the exact pace formula (calendar days vs working days, treatment of elapsed = 0, period containing today)? |
| Why | D4 approves deterministic current-period pace only. It rejects ML/AI/history engines. The arithmetic is not specified. |
| Impact | Blocks Forecast Revenue. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E04 |

---

### R2-OD-006 — Invoice Tracking cardinality

| Field | Value |
| --- | --- |
| Historical ID | — |
| Question | How many Invoice Tracking records may exist per Contract (and per period, if any)? |
| Why | D2 lists fields, not cardinality. |
| Impact | Invoice Tracking model and UI. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E02 |

---

### R2-OD-007 — Invoice Tracking reference, period, and edit rules

| Field | Value |
| --- | --- |
| Historical ID | — |
| Question | Is an optional external reference allowed (not fiscal numbering)? Is the record associated with a period? What edit/delete rules apply after payments exist? |
| Why | D2 lists the minimum fields only. |
| Impact | Invoice Tracking completeness and payment integrity. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E02, R2-E03 |

---

### R2-OD-008 — Null payment terms

| Field | Value |
| --- | --- |
| Historical ID | OBD-010 residual |
| Question | If `contract.paymentTermsDays` is null, how is Expected Payment Date derived (or is Invoice Tracking forbidden until days are set)? |
| Why | D5 formula is `invoiceDate + paymentTermsDays`. R1 allows null days. A catalog is not required for D5. |
| Impact | Expected payment date and OVERDUE derivation. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E03 |

OBD-010 (payment-term catalog) remains **DEFERRED**. D5 does not need a catalog.

---

### R2-OD-009 — PAYMENT_PARTIAL vs PAYMENT_MISMATCH

| Field | Value |
| --- | --- |
| Historical ID | — |
| Question | What exact predicates distinguish PARTIAL, MISMATCH, and OVERPAID alerts/statuses? |
| Why | D6 names the alerts. D5 names statuses. The boundary between “partial as expected” and “mismatch” is not defined. |
| Impact | Alert correctness. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E03 |

---

### R2-OD-010 — Payment event mutation

| Field | Value |
| --- | --- |
| Historical ID | — |
| Question | May Actual Payment events be edited or deleted? If yes, with which constraints? |
| Why | D5 defines recording events, not their lifecycle. |
| Impact | Payment write model and audit-adjacent behavior (without closing OBD-008). |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E03 |

---

### R2-OD-011 — Contract currency change after money records

| Field | Value |
| --- | --- |
| Historical ID | OBD-011 residual |
| Question | May `Contract.currency` change after Invoice Tracking or Payment records exist? If yes, what happens to existing records? |
| Why | D7 requires Invoice/Payment coherence with Contract currency and forbids FX. Mutation policy is not stated. |
| Impact | Multi-currency integrity. |
| Owner | Product Owner |
| Status | DIRECTION CLOSED (D7) / residual OPEN |
| Needed by | R2-E02, R2-E03 |

---

### R2-OD-012 — CSV / PDF in R2

| Field | Value |
| --- | --- |
| Historical ID | product OD-011; freeze deferred “CSV/PDF” |
| Question | Is CSV export in R2? Is PDF export in R2? Neither? |
| Why | Advanced reporting is a candidate theme. Excel is **not** a decision and must not be assumed. |
| Impact | R2-E05 scope. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E05 |

---

### R2-OD-013 — Capacity visibility and capacity alerts

| Field | Value |
| --- | --- |
| Historical ID | PD-106-001 deferred; OBD-006 shipped for contract warning only |
| Question | Does R2 include a workspace capacity model and/or CAPACITY_WARNING / CAPACITY_EXCEEDED? Or is capacity visibility limited to existing contract utilization plus Forecast Revenue? |
| Why | Product direction lists “Forecasting / Capacity visibility”. R1 deferred the workspace capacity model for lack of domain semantics. |
| Impact | R2-E04 scope. Must not invent a capacity domain. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | R2-E04 |

---

### R2-OD-014 — Period closure / post-closure TimeEntry edits

| Field | Value |
| --- | --- |
| Historical ID | OBD-007 / product OD-007 / MASTER_PLAN TD-002 |
| Question | Does R2 introduce billing-period closure? If a period is closed, may TimeEntries be edited or deleted? |
| Why | Listed as needed-by R2 historically. Freeze deferred it. D1–D7 do not decide it. Invoice Tracking does not require closure. |
| Impact | TimeEntry write rules and Accrued stability. Not automatically in R2. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | Only if pulled into R2 |

---

### R2-OD-015 — Audit requirements

| Field | Value |
| --- | --- |
| Historical ID | OBD-008 / F-103-P-001 / MASTER_PLAN TD-001 |
| Question | Does R2 require an audit trail (TimeEntry and/or Invoice Tracking / Payment)? If yes, what is recorded? |
| Why | Listed as needed-by R2 historically. Freeze deferred it. D1–D7 do not decide it. |
| Impact | Persistence and compliance-adjacent scope. Not automatically in R2. |
| Owner | Product Owner |
| Status | OPEN |
| Needed by | Only if pulled into R2 |

---

## Closed or not-in-register

| Item | Status |
| --- | --- |
| D1–D7 | APPROVED — decision pack |
| OBD-011 direction (no FX, Contract currency, TimeEntry agnostic, per-currency aggregates) | CLOSED by D7 |
| OBD-010 catalog | DEFERRED — days field is enough for D5 |
| Excel export | Not a decision — out of R2 |
| Invoice Lifecycle / generation | Out of scope — D2 |
| Profitability / PIVA Balance integration | Out of scope — D3 |
| Installment engine, grace %, risk, AI forecast | Out of scope — D5 / D6 / D4 |
| Calendar view / calendar integration | Not R2 |

---

## Planning implication

A complete deterministic R2 implementation plan is **blocked** until at least:

- R2-OD-002 (all money)
- R2-OD-001 and R2-OD-003 and R2-OD-004 (Revenue Visibility)
- R2-OD-006 (Invoice Tracking)
- R2-OD-008 and R2-OD-009 (Payment Tracking)
- R2-OD-005 and R2-OD-013 (Forecast / capacity)
- R2-OD-012 (export)

R2-OD-014 and R2-OD-015 block R2 only if the Product Owner pulls closure or audit into R2.
