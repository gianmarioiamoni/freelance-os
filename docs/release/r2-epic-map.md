# R2 Epic Map — Preliminary

**Status:** Preliminary capability map. Not an implementation plan. Not approved epics.  
**Date:** 2026-09-21  
**Authority:** `docs/release/r2-decision-pack.md`  
**Does not:** open an implementation epic, assign EPIC-2xx numbers, or schedule phases.

Priority for later planning:

```text
TIME TRACKING (exists)
      >
CONTRACT (exists)
      >
REVENUE VISIBILITY
      >
PAYMENT TRACKING
```

Invoice Tracking precedes Payment Tracking. Forecast depends on Accrued. Export depends on the figures it would export.

---

## Historical map (superseded)

| Old ID | Old name | Disposition |
| --- | --- | --- |
| R2-E01 | Invoice Lifecycle | **Withdrawn.** Replaced by Invoice Tracking. |
| R2-E02 | Payment Tracking | Retained, narrowed to D5 / D6. |
| R2-E03 | Forecasting & Capacity | Retained, reduced. No ML/AI. |
| R2-E04 | Advanced Reporting & Export | Retained, conditional. Excel not assumed. |
| R2-E05 | Commercial Intelligence | **Withdrawn.** No profitability / client scoring. |

---

## Proposed map

IDs below are planning labels only.

### R2-E01 — Revenue Visibility

**Purpose.** Show Accrued Revenue and Expected Revenue so the freelancer understands the economic value of recorded work and of the contract — without invoicing or accounting.

**Scope.**

- Accrued Revenue from TimeEntry + Contract conditions (D4).
- Expected Revenue from Contract / expected capacity (D4 direction).
- Per-currency presentation (D7).
- Surfaces that reuse shared calculation services (dashboard / reports — exact UI later).

**Non-scope.**

- Invoice generation or Invoice Tracking (R2-E02).
- Payment (R2-E03).
- Forecast Revenue (R2-E04).
- Profitability, tax, FX rollup, accounting recognition.

**Dependencies.**

- R1 TimeEntry and Contract.
- R2-OD-001 (daily), R2-OD-002 (rounding), R2-OD-003 (live vs snapshot), R2-OD-004 (Expected formula).

**Open decisions.** R2-OD-001, R2-OD-002, R2-OD-003, R2-OD-004.

**Expected outcome.** Deterministic Accrued and Expected figures, currency-separated, independent of invoice and payment.

---

### R2-E02 — Invoice Tracking

**Purpose.** Register operational invoice tracking records so payments can be expected and reconciled. Not fiscal invoicing.

**Scope.**

- Invoice Tracking record: invoiceDate, invoicedAmount, currency, Contract, optional notes (D2).
- Currency consistent with Contract (D7).

**Non-scope.**

- Generation, PDF, numbering, e-invoicing, line items, credit notes, fiscal workflow, accounting lifecycle.
- Payment events (R2-E03).
- Treating the record as Accrued Revenue.

**Dependencies.**

- R1 Contract (`currency`, `paymentTermsDays`).
- R2-OD-006, R2-OD-007, R2-OD-002 (stored amounts), R2-OD-011.

**Open decisions.** R2-OD-006, R2-OD-007, R2-OD-011.

**Expected outcome.** One or more Invoice Tracking records can be stored and listed per Contract, sufficient to drive Payment Tracking.

---

### R2-E03 — Payment Tracking & Reconciliation

**Purpose.** Track expected vs actual payments operationally and surface simple discrepancies.

**Scope.**

- Derived expected payment date (D5).
- Multiple Actual Payment events per Invoice Tracking record.
- Derived status and outstanding (D5).
- Discrepancies and alerts PAYMENT_OVERDUE, PAYMENT_PARTIAL, PAYMENT_MISMATCH (D6).
- Reuse AlertService when technically appropriate.

**Non-scope.**

- Accounts receivable / accounting.
- Installment / schedule engine.
- Risk scoring, prediction, AI, percentage-threshold engines, advanced grace periods.

**Dependencies.**

- R2-E02 Invoice Tracking.
- Contract.paymentTermsDays.
- R2-OD-008, R2-OD-009, R2-OD-010, R2-OD-002.

**Open decisions.** R2-OD-008, R2-OD-009, R2-OD-010.

**Expected outcome.** Payment status is always derivable. Overdue / partial / mismatch conditions are visible without an accounting subsystem.

---

### R2-E04 — Forecasting & Capacity Visibility

**Purpose.** Project Accrued Revenue to period end from current pace, and show capacity visibility consistent with existing contract capacity — without a financial or ML engine.

**Scope.**

- Forecast Revenue per D4 (deterministic, current-period pace only).
- Capacity visibility that does not invent a new profitability model.
- No historical-behavior statistical engine (product vision §8 “historical behavior” is **not** adopted; D4 is narrower).

**Non-scope.**

- ML / AI / probabilistic forecast.
- Accounting forecasts.
- Workspace monthly capacity model unless R2-OD-013 approves it.
- Capacity alerts unless R2-OD-013 approves them (PD-106-001 remains deferred until decided).

**Dependencies.**

- R2-E01 Accrued Revenue.
- R1 contract utilization / pro-rata capacity.
- R2-OD-005, R2-OD-013.

**Open decisions.** R2-OD-005, R2-OD-013.

**Expected outcome.** A deterministic end-of-period Accrued projection and a clear statement of capacity visibility that does not require a new capacity domain unless the Product Owner adds one.

---

### R2-E05 — Advanced Reporting & Export

**Purpose.** Extend operational reporting so revenue, invoice tracking, and payment status can be inspected and, if approved, exported.

**Scope (candidate, not assumed).**

- Advanced filtering on existing / R2 operational facts.
- CSV and/or PDF only if R2-OD-012 says so.
- Richer period analysis that remains operational, not commercial intelligence.

**Non-scope.**

- Excel (not a Product Owner decision).
- Profitability, client scoring, concentration-as-intelligence.
- Fiscal or accounting reports.
- Cross-currency totals (D7).

**Dependencies.**

- R2-E01 at minimum for revenue reports.
- R2-E02 / R2-E03 if invoice/payment columns are in scope.
- R2-OD-012.

**Open decisions.** R2-OD-012.

**Expected outcome.** Reporting remains a read model over shared services. Export is present only if explicitly approved.

---

## Cross-cutting (not a standalone implementation epic yet)

These are not a sixth implementation epic. They gate the map above.

| Topic | Handling |
| --- | --- |
| Rounding (OBD-002) | R2-OD-002 — required before any published money |
| Daily-rate semantics (OBD-001) | R2-OD-001 — required before DAILY Accrued |
| Commercial snapshot (P102-F-001 / OBD-016) | R2-OD-003 |
| Period closure (OBD-007) | R2-OD-014 — not in the map until decided |
| Audit (OBD-008) | R2-OD-015 — not in the map until decided |
| Multi-currency residuals | D7 + R2-OD-011 |

---

## Suggested later planning order

Not a schedule. Dependency order only:

```text
R2-E01 Revenue Visibility
R2-E02 Invoice Tracking
R2-E03 Payment Tracking & Reconciliation
R2-E04 Forecasting & Capacity Visibility
R2-E05 Advanced Reporting & Export
```

R2-E02 / R2-E03 can be planned in parallel with R2-E01 once their own opens are answered. They do not depend on Accrued Revenue (D4).

No EPIC-2xx is opened by this document.
