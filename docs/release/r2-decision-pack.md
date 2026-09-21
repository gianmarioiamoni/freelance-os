# R2 Decision Pack — Revenue Operations

**Status:** APPROVED product decisions recorded; open decisions explicit  
**Date:** 2026-09-21  
**Release:** Release 2 — Revenue Operations  
**Supersedes naming:** “Release 2 — Billing & Intelligence” (`MASTER_PLAN.md` §8 / §19 historical)  
**Does not reopen:** R1 FROZEN (`docs/release/r1-freeze.md`, candidate `c6712224`, freeze commit `8f79216d`)  
**Owner of product decisions:** Product Owner  

Canonical companions:

| Artifact | Role |
| --- | --- |
| This document | Approved R2 product boundary and D1–D7 |
| `docs/release/r2-architecture-delta.md` | Domain delta vs technical work still to plan |
| `docs/release/r2-epic-map.md` | Preliminary capability map — not an implementation plan |
| `docs/release/r2-open-decisions.md` | Decisions still required before deterministic implementation |
| `MASTER_PLAN.md` §19 | Canonical R2 scope pointer |

No implementation, schema, API, or UI is authorized by this pack.

---

## 1. Product boundary

FreelanceOS is **not**:

- a billing / invoicing system
- an accounting system
- a fiscal / tax system
- a profitability system
- a cost-accounting system

FreelanceOS **is** an operations system whose core remains:

1. tracking of activities and time
2. understanding the economic value of work
3. operational tracking of invoices and payments

The economic layer is secondary to Time Tracking.

```text
TIME TRACKING
      >
CONTRACT
      >
REVENUE VISIBILITY
      >
PAYMENT TRACKING
```

**Principle:** TIME TRACKING FIRST.

PIVA Balance is the system that owns costs, profitability, and fiscality / accounting in its own domain. A future FreelanceOS ↔ PIVA Balance integration may be considered later. It is **not** R2 scope.

---

## 2. Approved product decisions

These are PRODUCT DECISIONS APPROVED. They are not proposals.

### D1 — Product Boundary — APPROVED

FreelanceOS remains Time Tracking first. Economic features support understanding of work value and operational invoice/payment tracking. They do not turn the product into billing, accounting, fiscal, profitability, or cost-accounting software.

### D2 — Invoice Scope — APPROVED

Complete Invoice Lifecycle / invoice management is **out of scope**.

FreelanceOS must not generate or fiscally manage invoices.

**Out of R2:**

- invoice generation
- invoice PDF
- invoice numbering
- e-invoicing
- fiscal invoice workflow
- invoice line-item engine
- credit notes
- accounting invoice lifecycle

**In R2:** INVOICE TRACKING only.

Minimum record:

- invoice date
- invoiced amount
- currency
- link to Contract
- optional notes

Purpose: support payment tracking.

### D3 — Profitability Boundary / PIVA Balance — APPROVED

Profitability calculation is **out of FreelanceOS**.

PIVA Balance owns:

- costs
- profitability
- fiscality / accounting, in its own domain

**Out of FreelanceOS / out of R2:**

- profit margin
- cost allocation
- profitability analytics
- tax calculations
- accounting calculations
- FreelanceOS ↔ PIVA Balance integration

### D4 — Revenue Semantics — APPROVED

FreelanceOS distinguishes three concepts. They are not invoice or payment.

| Concept | Meaning | Source |
| --- | --- | --- |
| Accrued Revenue | Consuntivo economic value of billable work already recorded | TimeEntry + applicable Contract + Contract economic conditions |
| Expected Revenue | Economically expected value in the period from the contract and expected contractual capacity / quantity | Contract / expected capacity |
| Forecast Revenue | Deterministic projection of Accrued Revenue to period end from observed current-period pace | Current-period actual pace |

Accrued formulas (direction approved; daily “billable day” and rounding remain open — see register):

- Hourly: `billable minutes / 60 × hourly rate`
- Daily: `billable days × daily rate`

Accrued Revenue is independent of invoice and payment.

Forecast Revenue is **not** ML, AI, a statistical forecasting engine, a probabilistic forecast, or accounting revenue recognition.

```text
TimeEntry                    → Accrued Revenue
Contract / expected capacity → Expected Revenue
Current-period actual pace   → Forecast Revenue
```

Revenue, Invoice Tracking, and Payment Tracking remain separate.

### D5 — Payment Tracking — APPROVED

Operational payment tracking. Not accounts receivable / accounting.

```text
Contract
  → payment terms
  → Invoice Tracking
  → Expected Payment
  → Actual Payment
  → Payment Status / Discrepancy
```

Expected payment date is **derived**, not an initially arbitrary editable field:

```text
expectedPaymentDate = invoiceDate + contract.paymentTermsDays
```

Actual Payment is a manual event. Multiple payment events per invoice tracking record are required.

Payment (conceptual):

- paymentDate
- amount
- currency
- optional notes

Payment status is **derived**. Minimum statuses:

- NOT_DUE
- OVERDUE
- PARTIALLY_PAID
- PAID
- OVERPAID

```text
outstanding = invoicedAmount - totalPaid
OVERDUE     = today > expectedPaymentDate AND outstanding > 0
```

No payment schedule / installment engine in the first version. Partial payments are sufficient.

### D6 — Payment Discrepancies / Alerts — APPROVED

Simple, deterministic discrepancies only:

1. timing discrepancy
2. amount discrepancy
3. outstanding / overdue

Initial alerts:

- PAYMENT_OVERDUE
- PAYMENT_PARTIAL
- PAYMENT_MISMATCH

Reuse existing `AlertService` when technically appropriate.

**Not in this version:**

- arbitrary percentage thresholds
- risk scoring
- payment prediction
- AI
- sophisticated rule engines
- advanced grace periods (future decision)

### D7 — Multi-Currency — APPROVED

Minimal multi-currency.

- Currency belongs to the Contract.
- The Contract determines the currency of economic conditions.
- TimeEntry is currency-agnostic.
- Invoice Tracking and Payment Tracking must be consistent with Contract currency.
- Use ISO 4217 codes (EUR, USD, GBP, CHF, …).

**Not in R2:**

- automatic FX conversion
- workspace base currency for aggregation
- historical exchange-rate engine
- external FX APIs
- cross-currency financial aggregation

Cross-currency economic aggregations must be separated by currency.

**Principle:** TIME TRACKING REMAINS CURRENCY-AGNOSTIC.

D7 closes the **direction** of OBD-011. Residual details: `docs/release/r2-open-decisions.md` (R2-OD-011).

Existing R1 `Workspace.currency` remains a create-form default for Contract. It is **not** a reporting base currency.

---

## 3. R2 scope

R2 concentrates on Financial / Revenue Operations, always secondary to Time Tracking.

| Theme | In R2 | Notes |
| --- | --- | --- |
| Revenue visibility | Yes | Accrued + Expected; Forecast is the projection companion |
| Invoice Tracking | Yes | Tracking record only |
| Payment Tracking & Reconciliation | Yes | D5 / D6 |
| Forecasting / Capacity visibility | Conditional | Forecast Revenue per D4; workspace capacity / capacity alerts remain open (R2-OD-013) |
| Advanced Reporting & Export | Conditional | Advanced filtering may be considered; CSV/PDF are not assumed until R2-OD-012; Excel is not an R2 decision |
| Cross-cutting | Only as required | Currency, rounding, historical commercial meaning |

---

## 4. Out of scope

### Out of FreelanceOS (product boundary)

- invoicing / fiscal invoice systems
- accounting
- tax
- profitability / cost accounting
- PIVA Balance domain

### Out of R2 (may be later FreelanceOS or another system)

- invoice generation, PDF, numbering, e-invoicing, line items, credit notes, accounting invoice lifecycle
- FX conversion and cross-currency totals
- installment / payment-schedule engine
- ML / AI / probabilistic forecast
- profitability, client commercial scoring, tax / accounting calculations
- PIVA Balance integration
- Excel export (never approved)
- calendar integration (R3)
- accounting-system adapters (R3)
- AI assistants (R4)
- reopening accepted R1 limitations as R2 bugs without a new Product Owner decision

---

## 5. Domain boundaries

| Concept | Owner | R2 role |
| --- | --- | --- |
| TimeEntry | FreelanceOS | Source of Accrued Revenue; currency-agnostic |
| Contract | FreelanceOS | Economic conditions, currency, payment terms, expected capacity |
| Accrued / Expected / Forecast Revenue | FreelanceOS | Derived economic visibility |
| Invoice Tracking | FreelanceOS | Operational record |
| Payment | FreelanceOS | Operational events + derived status |
| Costs / profitability / fiscality | PIVA Balance | External domain |
| Fiscal invoice / SDI / e-invoicing | Future integration (R3+) or external | Not R2 |

---

## 6. Historical R2 themes — reconciliation

| Previous theme | Disposition |
| --- | --- |
| R2-E01 Invoice Lifecycle | **INVALID.** Replaced by Invoice Tracking (D2). |
| R2-E02 Payment Tracking | **VALID** within D5 / D6. |
| R2-E03 Forecasting & Capacity | **REDUCED.** Forecast Revenue + capacity visibility only. No ML/AI. Workspace capacity model not decided. |
| R2-E04 Advanced Reporting & Export | **CONDITIONAL.** CSV/PDF possible; Excel not assumed. |
| R2-E05 Commercial Intelligence | **INVALID** as profitability / commercial scoring. Useful operational analytics fold into reporting. |

The label “Billing & Intelligence” is **not binding**. Official R2 name: **Revenue Operations**.

---

## 7. Gated historical OBDs

| ID | Decision | R2 status |
| --- | --- | --- |
| OBD-007 | Period closure / post-closure edit-delete | **OPEN.** Not decided. Not invented here. See R2-OD-014. |
| OBD-008 | Audit / TimeEntry audit | **OPEN.** Not decided. Not invented here. See R2-OD-015. |
| OBD-011 | Multi-currency | **Direction CLOSED by D7.** Residual: currency change after Invoice/Payment exist (R2-OD-011). |

R1 freeze deferred these items. Freeze deferral is historical. It does not close them and does not force them into R2.

---

## 8. Historical conflicts

| Conflict | Classification |
| --- | --- |
| Revenue / billing calculation ambiguities | **RESOLVED BY PRODUCT DECISION** at semantic level (D4). Residual formulas: R2-OD-001, R2-OD-002, R2-OD-004, R2-OD-005. |
| EPIC-105 “billing → R2-E02” vs MASTER_PLAN separate invoice/payment | **RESOLVED BY PRODUCT DECISION.** Invoice Tracking and Payment Tracking are separate. Invoice Lifecycle is withdrawn. |
| Invoice commercial snapshot vs TimeEntry commercial snapshot | **OPEN PRODUCT DECISION** for TimeEntry / Accrued source of truth (R2-OD-003). Invoice-generation snapshot is **HISTORICAL / NO LONGER RELEVANT** (D2). |
| OBD needed-by R2 vs freeze deferral | **HISTORICAL.** Needed-by is re-evaluated per epic. 007/008 remain open. D7 closes OBD-011 direction. |
| Capacity alerts vs forecasting | **OPEN PRODUCT DECISION** (R2-OD-013). |
| Calendar view vs calendar integration | **HISTORICAL / NO LONGER RELEVANT** to R2. Calendar view was deferred in EPIC-103; calendar integration remains R3. |
| TD ID collisions (`MASTER_PLAN` TD-* vs `testing-strategy` TD-* vs EPIC-001 TD-*) | **DOCUMENTATION CONFLICT.** Do not reuse IDs. Do not “fix” history in this pack. |
| Excel in EPIC-105 non-goals vs product OD-011 CSV/PDF | **RESOLVED.** Excel was never a Product Owner decision. Not R2. |

R1 accepted limitations remain historical. They are not R2 bugs unless the Product Owner reopens them.

---

## 9. Architectural implications

Domain implications (not an implementation plan):

- Contract already carries `currency` and `paymentTermsDays` in R1. R2 consumes them; it does not reinvent them.
- TimeEntry stays currency-agnostic and remains the Accrued source fact.
- Invoice Tracking and Payment are new operational aggregates.
- Payment status and discrepancies are derived.
- Revenue is a derived read model unless a later technical plan proves a persistence need.
- Payment alerts should extend the existing deterministic AlertService.
- No FX, profitability, invoice-generation, or accounting modules.

See `docs/release/r2-architecture-delta.md`.

---

## 10. Decision status

| Kind | Items |
| --- | --- |
| APPROVED | D1, D2, D3, D4, D5, D6, D7 |
| OPEN | `docs/release/r2-open-decisions.md` |
| DEFERRED / FUTURE | FX, installment engine, PIVA Balance integration, e-invoicing, calendar integration, AI, Excel, profitability, advanced grace / risk |

---

## 11. R1 integrity

R1 remains FROZEN / GRANTED.

| Item | Value |
| --- | --- |
| Freeze commit | `8f79216d8e89c414ce2bb517859d3278c8e1f65f` |
| Production candidate | `c6712224e8d093b6f64cb46a17823a20de356a31` |
| Production | https://freelance-os-timeplan.vercel.app |
| EPIC-110 | CLOSED |
| This pack | Does not reopen R1, rewrite freeze evidence, or treat accepted R1 limitations as R2 defects |
