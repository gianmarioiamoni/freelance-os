# R2 Architecture Delta — Revenue Operations

**Status:** Domain and persistence-planning delta. R2-E01 snapshot / Accrued / Expected are implemented. R2-E02 Invoice Tracking is implemented. R2-E03 Payment Tracking is CERTIFIED. R2-E04 Forecasting & Contract Time Allocation is CERTIFIED (`docs/release/r2-e04-forecasting-allocation.md`). E05 planning exists (`docs/release/r2-e05-advanced-reporting-export.md`). P-E05-00 COMPLETE — PO DECISIONS CLOSED. P-E05-01 AUTHORIZED. E05 is not certified.  
**Date:** 2026-09-24  
**Authority:** `docs/release/r2-decision-pack.md`  
**Baseline:** R1 architecture (`docs/architecture.md`, `docs/domain-model.md`, `docs/storage.md`) remains the frozen R1 baseline.

This document records what must change conceptually for R2. Invoice Prisma names exist (`Invoice`). Payment Prisma names exist (`Payment`). E03-D-VOID-PAYMENTS is closed (Option A). `Contract.allocatedMinutes` exists (`Int?`). Forecast remains derived. E05 remains a derived read-model epic. P-E05-01 is AUTHORIZED. This document does not start it.

Legend:

- **DOMAIN DECISION** — product/domain meaning is approved or already present in R1.
- **CONFIRMED REQUIREMENT** — R2 needs this concept. Persistence may not exist yet.
- **IMPLEMENTATION DETAIL STILL OPEN** — design work for epic planning. Not a product decision.
- **EXISTING MODEL REUSED** — R1 fact R2 must consume.
- **TECHNICAL IMPLEMENTATION TO BE PLANNED** — later architecture/planning work.

---

## 1. What does not change

| Area | Status |
| --- | --- |
| Modular monolith, Application → Domain → Infrastructure | Unchanged |
| Workspace isolation and server-side authorization | Unchanged |
| TimeEntry duration in integer minutes | Unchanged |
| TimeEntry `contractId` association | Unchanged |
| TimeEntry currency-agnostic | **DOMAIN DECISION** (D7) |
| TimeEntry hard-delete and immutable `workDate` / `clientId` / `contractId` | Unchanged R1 (EPIC-103) |
| Contract `[validFrom, validTo)` and no client overlap | Unchanged |
| Shared analytics as calculation owner for hours / utilization | Unchanged until a later plan says otherwise |
| Existing pro-rata `monthlyContractedMinutes` capacity | **EXISTING MODEL REUSED** (R2-OD-004) |
| AlertService as deterministic rule evaluator | Reuse when technically appropriate (D6, R2-OD-013) |
| Period-close / dedicated audit ledger | **Not introduced** (R2-OD-014, R2-OD-015) |
| R1 accepted limitations | Historical; not silently redesigned |

---

## 2. Existing R1 facts R2 consumes

These already exist. R2 must not invent a second source of truth.

| Fact | R1 location | R2 use | Classification |
| --- | --- | --- | --- |
| `Contract.currency` ISO-4217 | EPIC-102 | Economic currency authority (D7, R2-OD-011) | EXISTING MODEL REUSED |
| `Contract.paymentTermsDays` / `paymentTermsNote` | EPIC-102 | Write-time source for Invoice `dueDate` snapshot (D5, R2-OD-008, E02-D11) | EXISTING MODEL REUSED |
| `Contract.billingModel`, `rate` | EPIC-102 | Accrued / Expected Revenue (D4) | EXISTING MODEL REUSED |
| `Contract.monthlyContractedMinutes` | EPIC-102 | HOURLY Expected Revenue capacity (R2-OD-004) | EXISTING MODEL REUSED |
| `Workspace.currency` | EPIC-004 | Create-form default only. **Not** a reporting base currency (D7) | EXISTING MODEL REUSED |
| `Workspace.timezone` | EPIC-004 / EPIC-105 | Period boundaries; likely “today” for overdue | EXISTING MODEL REUSED |
| `TimeEntry` + `billable` | EPIC-103 | Accrued quantity facts (D4, R2-OD-001) | EXISTING MODEL REUSED |
| Pro-rata capacity overlap | EPIC-105 / PD-105-005 | Expected Revenue period capacity | EXISTING MODEL REUSED |
| `AlertService` | EPIC-106 | Candidate host for payment and allocation alerts | EXISTING MODEL REUSED |
| `AnalyticsService` / `ReportingService` | EPIC-104 / EPIC-105 | Hours / utilization; candidate host or sibling for revenue reads | EXISTING MODEL REUSED |

---

## 3. Contract

### DOMAIN DECISION

- Currency belongs to the Contract.
- Contract determines the currency of economic conditions, Invoice Tracking, and Payment Tracking.
- Payment terms used for Invoice `dueDate` are snapshotted `paymentTermsDays` at Invoice write (D5, E02-D11). E03 expected payment date reads Invoice `dueDate`, not live Contract terms.
- `paymentTermsDays = null` at Invoice write produces no `dueDate` and no automatic overdue (R2-OD-008).
- A payment-term catalog (OBD-010) is not required.
- Contract currency may change only before monetary records exist. After the first Invoice or Payment event, currency is immutable (R2-OD-011).
- Optional Contract / Project Time Allocation uses `allocatedMinutes`, distinct from `monthlyContractedMinutes` (R2-OD-013).

### Persistence planning

| Concept | Classification | Notes |
| --- | --- | --- |
| `currency`, `rate`, `billingModel`, `paymentTermsDays`, `monthlyContractedMinutes` | EXISTING MODEL REUSED | Do not duplicate |
| Currency immutability after first monetary record | CONFIRMED REQUIREMENT | Write-rule change. No new column implied |
| `allocatedMinutes` | EXISTING MODEL REUSED | Optional Contract-level total time budget. `Contract.allocatedMinutes Int?`. Null = no allocation. Zero is valid. Implemented P-E04-01 |
| Allocation consumption | DOMAIN DECISION | SUM(TimeEntry.minutes) for the Contract inside `[validFrom, validTo)`. All minutes. Out-of-validity ignored. Closed by P-E04-00 |
| Allocation WARNING / EXCEEDED predicates | DOMAIN DECISION | WARNING at 80%. EXCEEDED only when consumption `>` allocatedMinutes. Closed by P-E04-00 |

No new Contract entity is implied.

---

## 4. TimeEntry

### DOMAIN DECISION

- TimeEntry remains currency-agnostic (D7).
- Accrued Revenue reads TimeEntry billable quantity plus the commercial value applicable when the work occurred (D4, R2-OD-003).
- DAILY: one accrued billable day if at least one TimeEntry exists for that Contract on that calendar date; multiple entries count once; no work calendar (R2-OD-001).
- TimeEntry is not an invoice line and is not converted to a fiscal document.
- Period-close edit/delete rules are out of R2 (R2-OD-014).
- Dedicated TimeEntry audit is out of R2 (R2-OD-015).

### Persistence planning

| Concept | Classification | Notes |
| --- | --- | --- |
| `TimeEntry` minutes, `billable`, `workDate`, `contractId` | EXISTING MODEL REUSED | Accrued quantity source |
| Historical commercial snapshot | EXISTING MODEL REUSED / implemented | TimeEntry `snapshotBillingModel`, `snapshotRate`, `snapshotCurrency`. P102-F-001 closed for Accrued |
| Snapshot persistence class | EXISTING MODEL REUSED / implemented | Class B on TimeEntry. Implemented in P-E01-01 |
| DAILY same-day conflicting snapshots | DOMAIN DECISION | R2-OD-016 weighted-average daily rate. Implemented in P-E01-02 |
| Pre-snapshot TimeEntry treatment | DOMAIN DECISION | R2-OD-017 live-Contract backfill. Implemented in P-E01-01 migration |

---

## 5. Revenue

### DOMAIN DECISION

Revenue is not Invoice Tracking and not Payment.

```text
TimeEntry + historical commercial value  → Accrued Revenue
HOURLY Contract / pro-rata capacity      → Expected Revenue
DAILY                                    → no Expected Revenue in R2
Accrued + elapsed time in current period → Forecast Revenue (linear)
```

Published amounts round to the nearest integer. Intermediate calculations are not prematurely rounded (R2-OD-002).

No profitability, tax, accounting recognition, ML, or FX rollup.

### Persistence planning

| Concept | Classification | Notes |
| --- | --- | --- |
| Accrued / Expected / Forecast totals | EXISTING MODEL REUSED (derived) | Read model unless a later plan proves persistence |
| Application-service boundary | EXISTING MODEL REUSED | E01 implemented: extend `AnalyticsService`. `ReportingService` stays thin. No parallel RevenueService |
| Forecast arithmetic | DOMAIN DECISION | Accrued / elapsedFraction on the certified current period. Closed by P-E04-00 / R2-OD-005 |
| Mixed-currency presentation | DOMAIN DECISION | Separate by currency (D7) |

---

## 6. Invoice Tracking

### DOMAIN DECISION

New operational concept. Not an Invoice aggregate for generation or fiscal lifecycle.

Approved meaning (R2-OD-006 / R2-OD-007):

- one Contract → many Invoice; one Invoice → exactly one Contract
- `invoiceDate` required
- amount
- currency tied to Contract
- optional free-text reference
- no competence period
- editable
- VOID / soft-delete instead of physical delete (E02-D02: one-way; default lists exclude)
- `dueDate` only when `paymentTermsDays` is present
- status derived from payment events
- Invoice currency snapshot (E02-D01)

Historical architecture text that assumed “future invoice generation should snapshot billable lines” is **superseded** for R2 (`docs/architecture.md` §18, `docs/domain-model.md` §12).

### Persistence planning

| Concept | Classification | Notes |
| --- | --- | --- |
| Invoice Tracking record | EXISTING MODEL REUSED | `Invoice` table (P-E02-01). Operational; not fiscal |
| Cardinality 1 Contract : N Invoice | DOMAIN DECISION | |
| VOID / soft-delete | DOMAIN DECISION | One-way. Default lists exclude VOID. Get-by-id remains. No restore in R2. Closed by E02-D02 |
| Invoice currency snapshot | DOMAIN DECISION | Persist snapshot; must match Contract at write; immutable after create. Closed by E02-D01 |
| Persistence name, repository, indexes | IMPLEMENTED | `Invoice`; `@@unique([workspaceId, id])`; indexes `(workspaceId, contractId, invoiceDate)`, `(workspaceId, voidedAt)` |
| Invoice lines / numbering / PDF / credit notes | Out of R2 | Do not model |

---

## 7. Payment

### DOMAIN DECISION

New operational event. Multiple events per Invoice Tracking record.

Conceptual fields: paymentDate, amount, currency consistent with Contract, optional notes.

Derived:

```text
paidAmount            = sum(paymentEvents.amount)
expectedPaymentDate   = Invoice.dueDate
                      = invoiceDate + Invoice.paymentTermsDays (snapshot at Invoice write)
                      = absent when Invoice.paymentTermsDays is null
UNPAID / PARTIAL / PAID / MISMATCH  from paidAmount vs invoice amount
PAYMENT_OVERDUE       = Invoice.dueDate < today AND paidAmount < invoice.amount
```

Payment events may be edited and deleted on an ACTIVE Invoice. Status is recalculated. No ledger / reversal model (R2-OD-010).

VOID write policy (E03-D-VOID-PAYMENTS, Option A, CLOSED): existing Payments may remain and stay readable as history. CREATE / UPDATE / DELETE on a VOID Invoice are rejected. VOID is not a payment status. VOID is excluded from active paidAmount / outstanding / overdue lists / payment alerts. No cascade-delete. No restore.

Payment write currency is a persisted `CHAR(3)` snapshot of `Invoice.currency` at create. It is immutable. No FX. No installment engine. No persisted `paidAmount` / `amountStatus` / overdue. Outstanding is presentation-only.

### Persistence planning

| Concept | Classification | Notes |
| --- | --- | --- |
| Payment event | IMPLEMENTED | `Payment` table. Composite `(workspaceId, invoiceId)` → Invoice. `Decimal(19,4)`. `CHECK (amount > 0)` |
| Derived payment status | DOMAIN DECISION | Read-time SUM. Do not persist as independent truth |
| Edit / delete of events | DOMAIN DECISION | ACTIVE Invoice only. Event removal, not reversal |
| VOID ↔ Payment writes | DOMAIN DECISION | Freeze writes on VOID. Closed by E03-D-VOID-PAYMENTS A |
| “Today” timezone | IMPLEMENTED | `Workspace.timezone` via `getTodayInTimezone` |
| Repository / write services | IMPLEMENTED | Payment application services + Invoice `lockInvoice` |

---

## 8. Alerts

### DOMAIN DECISION

Payment alerts: `PAYMENT_OVERDUE`, `PAYMENT_PARTIAL`, `PAYMENT_MISMATCH`. Deterministic only.

Allocation alerts: project / Contract operational alerts against `allocatedMinutes`. None when `allocatedMinutes` is null.

No workspace `CAPACITY_WARNING` / `CAPACITY_EXCEEDED` in R2 (R2-OD-013). PD-106-001 remains deferred as a workspace-capacity question and is not pulled into R2.

No risk score, prediction, AI, or percentage-threshold engine for payments.

### Persistence planning

| Concept | Classification | Notes |
| --- | --- | --- |
| Existing Alert / Notification model | EXISTING MODEL REUSED | `PAYMENT_*` types + nullable `Alert.invoiceId` + unique dedup keys. S2 semantic identity |
| Payment alert predicates | DOMAIN DECISION | R2-OD-009. Implemented by P-E03-03 |
| Allocation WARNING / EXCEEDED predicates | DOMAIN DECISION | Closed by P-E04-00. Types `ALLOCATION_WARNING` / `ALLOCATION_EXCEEDED` are TECHNICAL CLOSED |
| On-write vs other trigger | CLOSED by E03-D-ALERT-TRIGGER T3 | Payment C/U/D + Invoice VOID + Invoice amount/`invoiceDate`. Reference-only Invoice update does not evaluate. No scheduler |

---

## 9. Multi-currency

### DOMAIN DECISION

- Contract is the currency authority.
- TimeEntry has no currency.
- Invoice Tracking and Payment inherit / must match Contract currency.
- ISO 4217.
- No FX conversion, no workspace-base aggregation, no historical FX store, no external FX API.
- Economic aggregations are per currency.
- Contract currency is immutable after the first Invoice or Payment event.

### Persistence planning

| Concept | Classification | Notes |
| --- | --- | --- |
| Contract currency write rule | CONFIRMED REQUIREMENT | Mutation guard after first monetary record |
| Invoice currency snapshot | DOMAIN DECISION | E02-D01. Persist; match Contract at write |
| Per-currency report presentation | DOMAIN DECISION | No cross-currency totals |

`Workspace.currency` stays an R1 default. It must not become a hidden reporting base.

---

## 10. Data-model delta (planning only)

Invoice and Payment Prisma names exist. `allocatedMinutes` exists. E01 TimeEntry snapshot columns already exist. E04 migrations: `20260923230000_add_contract_allocated_minutes`, `20260923235000_add_allocation_alerts`. No E05 migrations.

| Concept | Classification | Existing? | Planning note |
| --- | --- | --- | --- |
| Invoice | EXISTING MODEL REUSED | Yes (P-E02-01) | 1 Contract : N Invoice; VOID / soft-delete; editable; no fiscal fields |
| Payment event | EXISTING MODEL REUSED | Yes (P-E03-01) | Many per Invoice; editable / deletable on ACTIVE only; status derived |
| Contract `allocatedMinutes` | EXISTING MODEL REUSED | Yes (P-E04-01) | Optional total project budget. Distinct from `monthlyContractedMinutes`. Null / 0 have no status (8-C) |
| Historical commercial snapshot | EXISTING MODEL REUSED | Yes (P-E01-01) | TimeEntry `snapshotBillingModel`, `snapshotRate`, `snapshotCurrency` |
| Derived payment status | CONFIRMED REQUIREMENT | n/a | Function of payment events, not a source of truth |
| Invoice VOID state | DOMAIN DECISION | Yes | One-way soft-delete. Closed by E02-D02. Payment writes frozen by E03-D-VOID-PAYMENTS A |
| Contract currency immutability | CONFIRMED REQUIREMENT | Write rule only | After first monetary record, including VOID. Implemented for Invoice |
| Invoice currency snapshot | DOMAIN DECISION | Yes | Closed by E02-D01. Immutable after create |
| Accrued / Expected / Forecast tables | DOMAIN DECISION | Derived | Forecast is derived, not persisted (E04-D-FORECAST-PERSISTENCE). Accrued / Expected remain derived |
| `monthlyContractedMinutes`, `rate`, `currency`, `paymentTermsDays` | EXISTING MODEL REUSED | Yes | Do not conflate with `allocatedMinutes` |

---

## 11. Module boundary sketch

Conceptual only. Not a folder or class design.

```text
Time Tracking (unchanged core)
        ↓
Contract (currency, rates, payment terms, optional allocatedMinutes)
        ↓
Revenue (derived: Accrued / Expected / Forecast)
        ↓
Invoice Tracking (operational record)
        ↓
Payment (events → derived status)
        ↓
Alerts (payment discrepancy + allocation rules)
```

PIVA Balance remains outside the monolith boundary.

### TECHNICAL IMPLEMENTATION TO BE PLANNED

- Repository split for Invoice Tracking and Payment (implemented). Contract-scoped Payment UI is implemented. No scheduler.
- Revenue lives under AnalyticsService (R2-E01 implemented). Do not add a parallel RevenueService.
- Reporting remains `ReportingService` as a thin publisher over `AnalyticsService`. Native CSV of the approved filtered `/reports` dataset (R2-OD-012 CLOSED). No Invoice/Payment reporting reads. No `ReportEngine`. No E05 schema. Plan: `docs/release/r2-e05-advanced-reporting-export.md`.

---

## 12. Superseded architectural language

| Historical statement | Disposition |
| --- | --- |
| Architecture §5.7 “future invoice preparation” | Superseded. Invoice Tracking only. |
| Architecture §18 “future invoice generation should snapshot billable lines” | Superseded for generation. TimeEntry commercial snapshot is R2-OD-003 (`snapshotBillingModel` / `snapshotRate` / `snapshotCurrency`). |
| Domain §12 “later Invoice aggregate may snapshot commercial lines” | Superseded as invoice-generation design. |
| Storage §21 “MVP does not create a complete invoice lifecycle” | Still true. R2 also does not create that lifecycle. |
| MASTER_PLAN historical R2-E01 Invoice Lifecycle | Withdrawn. |
| MASTER_PLAN historical R2-E05 Commercial Intelligence / profitability | Withdrawn. |
| Workspace capacity alerts as R2 default | Withdrawn (R2-OD-013). |

R1 baseline documents keep their historical text. Canonical R2 meaning is this delta plus the decision pack.

---

## 13. What this document does not decide

- Prisma models or migrations for E05
- Whether revenue totals are persisted
- E05 implementation

E04 product residuals (Forecast arithmetic, allocation predicates including 8-C zero-status, consumption rules, revenue UI surface) are CLOSED and CERTIFIED in `docs/release/r2-e04-forecasting-allocation.md`. Forecast = Accrued / elapsedFraction on the certified current period only; historical/custom null; derived. E05 P-E05-00 is COMPLETE — PO DECISIONS CLOSED. P-E05-01 is AUTHORIZED. This document does not start P-E05-01 or authorize production release.
