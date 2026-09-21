# R2 Architecture Delta — Revenue Operations

**Status:** Domain delta only. Technical implementation is not planned here.  
**Date:** 2026-09-21  
**Authority:** `docs/release/r2-decision-pack.md`  
**Baseline:** R1 architecture (`docs/architecture.md`, `docs/domain-model.md`, `docs/storage.md`) remains the frozen R1 baseline.

This document records what must change conceptually for R2. It does not authorize Prisma schema, migrations, APIs, UI, or services.

Legend:

- **DOMAIN DECISION** — product/domain meaning is approved or already present in R1.
- **TECHNICAL IMPLEMENTATION TO BE PLANNED** — design work for a later architecture/planning chat.

---

## 1. What does not change

| Area | Status |
| --- | --- |
| Modular monolith, Application → Domain → Infrastructure | Unchanged |
| Workspace isolation and server-side authorization | Unchanged |
| TimeEntry duration in integer minutes | Unchanged |
| TimeEntry `contractId` association | Unchanged |
| TimeEntry currency-agnostic | **DOMAIN DECISION** (D7) |
| Contract `[validFrom, validTo)` and no client overlap | Unchanged |
| Shared analytics as calculation owner for hours / utilization | Unchanged until a later plan says otherwise |
| AlertService as deterministic rule evaluator | Reuse when technically appropriate (D6) |
| R1 accepted limitations | Historical; not silently redesigned |

---

## 2. Existing R1 facts R2 consumes

These already exist. R2 must not invent a second source of truth.

| Fact | R1 location | R2 use |
| --- | --- | --- |
| `Contract.currency` ISO-4217 | EPIC-102 | Economic currency authority (D7) |
| `Contract.paymentTermsDays` / `paymentTermsNote` | EPIC-102 | Expected payment date (D5) |
| `Contract.billingModel`, `rate` | EPIC-102 | Accrued / Expected Revenue (D4) |
| `Contract.monthlyContractedMinutes` | EPIC-102 | Expected capacity input (formula still open) |
| `Workspace.currency` | EPIC-004 | Create-form default only. **Not** a reporting base currency (D7) |
| `TimeEntry` + `billable` | EPIC-103 | Accrued source facts |
| `AlertService` | EPIC-106 | Candidate host for payment alerts |

---

## 3. Contract

### DOMAIN DECISION

- Currency belongs to the Contract.
- Contract determines the currency of economic conditions, Invoice Tracking, and Payment Tracking.
- Payment terms used for expected payment date are `paymentTermsDays` (D5).
- A payment-term catalog (OBD-010) is not required to express D5.

### TECHNICAL IMPLEMENTATION TO BE PLANNED

- Whether Contract write rules change when Invoice Tracking or Payment records exist.
- What happens if `currency` or `paymentTermsDays` is edited after those records exist (R2-OD-008, R2-OD-011).
- No new Contract entity is implied.

---

## 4. TimeEntry

### DOMAIN DECISION

- TimeEntry remains currency-agnostic (D7).
- Accrued Revenue reads TimeEntry billable quantity plus Contract economic conditions (D4).
- TimeEntry is not an invoice line and is not converted to a fiscal document.

### TECHNICAL IMPLEMENTATION TO BE PLANNED

- Whether Accrued Revenue reads live Contract fields or a commercial snapshot (R2-OD-003 / P102-F-001 / proposed OBD-016). **Not decided.**
- Period-closure edit/delete rules (OBD-007 / R2-OD-014). **Not decided.**
- TimeEntry audit (OBD-008 / R2-OD-015). **Not decided.**

Do not add snapshots, closure, or audit in implementation planning until the Product Owner decides.

---

## 5. Revenue

### DOMAIN DECISION

Revenue is not Invoice Tracking and not Payment.

```text
TimeEntry + Contract conditions     → Accrued Revenue
Contract / expected capacity        → Expected Revenue
Current-period actual pace          → Forecast Revenue
```

Hourly Accrued direction: `billable minutes / 60 × hourly rate`.  
Daily Accrued direction: `billable days × daily rate` (billable-day rule still open).

No profitability, tax, accounting recognition, ML, or FX rollup.

### TECHNICAL IMPLEMENTATION TO BE PLANNED

- Application-service boundary: extend AnalyticsService vs a dedicated Revenue service.
- Read-time calculation vs persisted totals (storage.md currently prefers derived totals).
- Dashboard / report surfaces.
- Exact Expected and Forecast formulas (R2-OD-004, R2-OD-005).
- Daily-rate rule (R2-OD-001) and rounding (R2-OD-002).
- How mixed-currency workspaces present figures (separate by currency — D7).

Revenue is a **derived read model** unless a later technical plan proves a persistence requirement.

---

## 6. Invoice Tracking

### DOMAIN DECISION

New operational concept. Not an Invoice aggregate for generation or fiscal lifecycle.

Minimum meaning:

- invoiceDate
- invoicedAmount
- currency (must match Contract)
- contract association
- optional notes

Independent of Accrued Revenue.

Historical architecture text that assumed “future invoice generation should snapshot billable lines” is **superseded** for R2 (`docs/architecture.md` §18, `docs/domain-model.md` §12).

### TECHNICAL IMPLEMENTATION TO BE PLANNED

- Persistence name and repository.
- Cardinality (R2-OD-006).
- Optional reference / period association / edit rules (R2-OD-007).
- UI surface and authorization.
- No line-item table, numbering sequence, PDF, or credit-note model.

---

## 7. Payment

### DOMAIN DECISION

New operational event. Multiple events per Invoice Tracking record.

Conceptual fields: paymentDate, amount, currency, optional notes.

Derived:

```text
totalPaid    = sum(payment.amount)
outstanding  = invoicedAmount - totalPaid
expectedPaymentDate = invoiceDate + contract.paymentTermsDays
```

Minimum derived statuses: NOT_DUE, OVERDUE, PARTIALLY_PAID, PAID, OVERPAID.

OVERDUE: `today > expectedPaymentDate AND outstanding > 0`.

Currency must match Contract. No installment engine.

### TECHNICAL IMPLEMENTATION TO BE PLANNED

- Payment repository and write/read services.
- Status derivation function (pure domain).
- Behavior when `paymentTermsDays` is null (R2-OD-008).
- Edit/delete of payment events (R2-OD-010).
- “Today” timezone authority (R1 uses `Workspace.timezone` for periods; reuse is likely but not designed here).

---

## 8. Alerts

### DOMAIN DECISION

Initial payment alerts: PAYMENT_OVERDUE, PAYMENT_PARTIAL, PAYMENT_MISMATCH.

Deterministic only. No risk score, prediction, AI, or percentage-threshold engine.

### TECHNICAL IMPLEMENTATION TO BE PLANNED

- Extension of existing AlertService vs a payment-specific evaluator.
- Dedup keys, trigger (on-write vs other), resolution rules.
- Exact PARTIAL vs MISMATCH predicates (R2-OD-009).
- Capacity alerts remain a separate open product question (R2-OD-013 / PD-106-001).

---

## 9. Multi-currency

### DOMAIN DECISION

- Contract is the currency authority.
- TimeEntry has no currency.
- Invoice Tracking and Payment inherit / must match Contract currency.
- ISO 4217.
- No FX conversion, no workspace-base aggregation, no historical FX store, no external FX API.
- Economic aggregations are per currency.

### TECHNICAL IMPLEMENTATION TO BE PLANNED

- Validation that Invoice/Payment currency cannot diverge from Contract.
- Contract.currency mutation after money records exist (R2-OD-011).
- Per-currency presentation in reports.

`Workspace.currency` stays an R1 default. It must not become a hidden reporting base.

---

## 10. Module boundary sketch

Conceptual only. Not a folder or class design.

```text
Time Tracking (unchanged core)
        ↓
Contract (currency, rates, payment terms)
        ↓
Revenue (derived: Accrued / Expected / Forecast)
        ↓
Invoice Tracking (operational record)
        ↓
Payment (events → derived status)
        ↓
Alerts (payment discrepancy rules)
```

PIVA Balance remains outside the monolith boundary.

### TECHNICAL IMPLEMENTATION TO BE PLANNED

- Repository split for Invoice Tracking and Payment.
- Whether Revenue lives under Analytics or a new application module.
- Reporting/export module if CSV/PDF is approved (R2-OD-012).

---

## 11. Superseded architectural language

| Historical statement | Disposition |
| --- | --- |
| Architecture §5.7 “future invoice preparation” | Superseded. Invoice Tracking only. |
| Architecture §18 “future invoice generation should snapshot billable lines” | Superseded for generation. TimeEntry snapshot remains R2-OD-003. |
| Domain §12 “later Invoice aggregate may snapshot commercial lines” | Superseded as invoice-generation design. |
| Storage §21 “MVP does not create a complete invoice lifecycle” | Still true. R2 also does not create that lifecycle. |
| MASTER_PLAN R2-E01 Invoice Lifecycle | Withdrawn. |
| MASTER_PLAN R2-E05 Commercial Intelligence / profitability | Withdrawn. |

R1 baseline documents keep their historical text. Canonical R2 meaning is this delta plus the decision pack.

---

## 12. What this document does not decide

- Prisma models or migrations
- API routes or Server Actions
- UI routes or components
- Exact service class names
- Index / constraint design
- Whether revenue totals are persisted
- Closure of OBD-007, OBD-008, OBD-001, OBD-002, OBD-016
