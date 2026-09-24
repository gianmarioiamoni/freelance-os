# R2 Decision Pack — Revenue Operations

**Status:** APPROVED product baseline recorded; residual planning questions explicit  
**Date:** 2026-09-22  
**Release:** Release 2 — Revenue Operations  
**Workshop:** Decision Workshop complete for decisions currently in scope  
**Supersedes naming:** “Release 2 — Billing & Intelligence” (`MASTER_PLAN.md` §8 / §19 historical)  
**Does not reopen:** R1 FROZEN (`docs/release/r1-freeze.md`, candidate `c6712224`, freeze commit `8f79216d`)  
**Owner of product decisions:** Product Owner  

Canonical companions:

| Artifact | Role |
| --- | --- |
| This document | Approved R2 product boundary, D1–D7, and approved OD resolutions |
| `docs/release/r2-architecture-delta.md` | Domain delta and persistence planning (no schema) |
| `docs/release/r2-epic-map.md` | Executable R2 planning baseline |
| `docs/release/r2-open-decisions.md` | Residual planning/product questions |
| `MASTER_PLAN.md` §19 | Canonical R2 scope pointer |

No implementation, schema, API, or UI is authorized by this pack.

---

## 1. Product boundary

Official R2 name: **Revenue Operations**.

FreelanceOS is **not**:

- billing / accounting software
- fiscal accounting
- profitability / cost accounting
- invoice generation
- payment processing
- AI / ML forecasting

FreelanceOS **is** an operations system whose R2 layer is:

1. operational revenue visibility
2. invoice tracking
3. operational payment tracking / reconciliation
4. contract / project time allocation
5. deterministic forecasting / capacity visibility
6. advanced reporting / export where explicitly scoped

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

## 2. Approved high-level decisions

These are PRODUCT DECISIONS APPROVED. They are not proposals.

### D1 — Time Tracking first — APPROVED

R2 remains centered on operational Time Tracking and revenue visibility. No fiscal / accounting / profitability model.

### D2 — Invoice Tracking only — APPROVED

Invoice Lifecycle / generation is withdrawn. R2 tracks invoices; it does not generate fiscal invoices.

**Out of R2:**

- invoice generation
- invoice PDF / fiscal document generation
- invoice numbering / SDI
- e-invoicing
- fiscal invoice workflow
- invoice line-item engine
- credit / debit notes
- accounting invoice lifecycle

**In R2:** INVOICE TRACKING only.

### D3 — Profitability out — APPROVED

Profitability, PIVA balance, costs and fiscality remain outside R2. No R2 integration with that domain.

**Out of FreelanceOS / out of R2:**

- profit margin
- cost allocation
- profitability analytics
- tax calculations
- accounting calculations
- FreelanceOS ↔ PIVA Balance integration

### D4 — Accrued / Expected / Forecast independent — APPROVED

Accrued, Expected and Forecast are separate operational concepts. No ML / AI.

| Concept | Meaning | Source |
| --- | --- | --- |
| Accrued Revenue | Consuntivo economic value of billable work already recorded | TimeEntry + applicable historical commercial value (R2-OD-003) |
| Expected Revenue | Contract-capacity value for the reporting period | Contract / contractual capacity. Independent of TimeEntry, Invoice, Payment |
| Forecast Revenue | Deterministic linear projection of Accrued to period end | Accrued / elapsedFraction on the certified current period (R2-OD-005 CLOSED) |

Accrued formulas:

- Hourly: `billable minutes / 60 × hourly rate`
- Daily: `billable days × daily rate`, where a billable day follows R2-OD-001

Accrued Revenue is independent of invoice and payment.

Forecast Revenue is **not** ML, AI, a statistical forecasting engine, a probabilistic forecast, or accounting revenue recognition.

```text
TimeEntry + commercial snapshot   → Accrued Revenue
Contract / contractual capacity   → Expected Revenue
Current-period Accrued + elapsed  → Forecast Revenue
```

Revenue, Invoice Tracking, and Payment Tracking remain separate.

### D5 — Operational payments — APPROVED

Operational payment tracking. Not accounts receivable / accounting.

```text
expected payment date = invoiceDate + paymentTermsDays
```

Multiple payment events are supported. Invoice payment status is **derived**.

Payment event (conceptual):

- paymentDate
- amount
- currency consistent with Contract
- optional notes

Amount-derived invoice payment status (R2-OD-009):

| paidAmount vs invoice amount | Status |
| --- | --- |
| 0 | UNPAID |
| > 0 and < invoice amount | PARTIAL |
| = invoice amount | PAID |
| > invoice amount | MISMATCH |

`PAYMENT_OVERDUE` is independent of amount status:

```text
dueDate < today AND paidAmount < invoice.amount
```

PARTIAL + OVERDUE is valid. No payment schedule / installment engine.

D5’s earlier combined status list (NOT_DUE / OVERDUE / PARTIALLY_PAID / PAID / OVERPAID) is **superseded** by R2-OD-009. Overdue is an independent deterministic condition, not a mutually exclusive amount status.

### D6 — Deterministic payment alerts / status — APPROVED

`PAYMENT_OVERDUE` / `PAYMENT_PARTIAL` / `PAYMENT_MISMATCH` are deterministic.

No risk scores, percentages, AI, or probabilistic thresholds.

Reuse existing `AlertService` when technically appropriate.

P-E03-03 implementation contract (closed; confirmed by P-E03-05 QA):

- Future `paymentDate` allowed. Calendar date only. Not an alert input.
- T3 on-write evaluation. No scheduler. Calendar `PAYMENT_OVERDUE` gap accepted.
- Predicates are Invoice-level R2-OD-009. No per-Payment-row alerts. PAID/UNPAID are not alerts. PARTIAL + OVERDUE may coexist. MISMATCH does not imply OVERDUE.
- Severity: PARTIAL=INFO, OVERDUE=WARNING, MISMATCH=ERROR.
- Shape: extend `AlertType`; nullable `Alert.invoiceId`; unique dedup key; S2 semantic identity / resolve by invoiceId + type.
- Existing E02 Alert / Notification lifecycle is reused. CONTRACT_* unchanged.
- VOID resolve of active PAYMENT_* alerts is transactional. No new PAYMENT_* on VOID.

**Not in this version:**

- arbitrary percentage thresholds
- risk scoring
- payment prediction
- AI
- sophisticated rule engines
- advanced grace periods

### D7 — Currency — APPROVED

Currency belongs to Contract. No FX. Aggregates must remain separated by currency.

- TimeEntry is currency-agnostic.
- Invoice Tracking and Payment Tracking must be consistent with Contract currency.
- Use ISO 4217 codes (EUR, USD, GBP, CHF, …).
- Contract currency may change only before monetary records exist (R2-OD-011).

**Not in R2:**

- automatic FX conversion
- workspace base currency for aggregation
- historical exchange-rate engine
- external FX APIs
- cross-currency financial aggregation
- retroactive currency conversion

**Principle:** TIME TRACKING REMAINS CURRENCY-AGNOSTIC.

Existing R1 `Workspace.currency` remains a create-form default for Contract. It is **not** a reporting base currency.

---

## 3. Approved open-decision resolutions

These close the corresponding register entries as **product decisions**. They do not invent Prisma fields, APIs, or UI.

### R2-OD-001 — DAILY accrued rule — APPROVED

A DAILY Contract contributes one accrued billable day if at least one TimeEntry exists for that Contract on that calendar date.

- Multiple entries on the same day count once.
- No work-calendar model.

Accrued Daily remains `billable days × daily rate`. BR-007 still applies: only billable work contributes to Accrued Revenue.

### R2-OD-002 — Monetary rounding — APPROVED

Published / displayed monetary amounts are rounded to the nearest integer.

- Do not prematurely round intermediate calculations.
- No accounting-grade monetary precision is introduced.

R1 `NUMERIC(19,4)` rate storage remains the existing persistence representation. Rounding is a publication rule, not a new money type.

### R2-OD-003 — Historical commercial meaning — APPROVED

Commercial Snapshot semantics.

- Historical accrued revenue uses the commercial value applicable when the work occurred.
- Later Contract changes must not rewrite historical revenue.
- New work uses the current commercial value.

**Persistence dependency:** the current R1 model stores `TimeEntry.contractId` only. No historical commercial snapshot field exists (`P102-F-001` / proposed OBD-016). Do not invent the field here. R2-E01 must plan the persistence mechanism before Accrued implementation.

### R2-OD-004 — Expected Revenue — APPROVED

Expected Revenue is Contract-capacity based and independent of TimeEntry, Invoice and Payment.

For HOURLY:

- use contractual capacity applicable to the reporting period
- respect Contract validity
- reuse existing pro-rata capacity semantics (`docs/domain-model.md` §9 / PD-105-005)
- if contractual capacity is unavailable (`monthlyContractedMinutes` null), Expected Revenue = null

DAILY does not receive Expected Revenue in R2: there is no contractual expected-day capacity model.

No calendar inference or heuristic capacity.

### R2-OD-006 — Invoice model — APPROVED

MVP:

- one Contract → many Invoice
- one Invoice → exactly one Contract
- `invoiceDate` required
- amount
- currency tied to Contract
- status derived from payment events
- optional reference
- `dueDate` where `paymentTermsDays` allows it
- payment events

**No:** invoice lines, pro-forma, credit / debit notes, recurring invoice engine, PDF fiscal generation, fiscal numbering, SDI, accounting semantics.

### R2-OD-007 — Invoice reference / period / editing — APPROVED (product)

- reference is optional free text
- `invoiceDate` is required
- no invoice competence period in R2
- Invoice remains editable
- historical invoices are not physically deleted
- use VOID / soft-delete semantics when removed from active tracking
- no fiscal immutability model

VOID list / restore closed by R2-E02 P-E02-00 (`docs/release/r2-e02-invoice-tracking.md` E02-D02): one-way soft-delete; default lists exclude VOID; get-by-id remains; no restore in R2.

E03-D-VOID-PAYMENTS closed by R2-E03 P-E03-00 (`docs/release/r2-e03-payment-tracking.md`): Option A freeze writes on VOID. Existing Payments may remain and stay readable. No create / update / delete on VOID. No cascade-delete.

### R2-OD-008 — Missing payment terms — APPROVED

`paymentTermsDays = null` means:

- no `dueDate`
- no automatic overdue state

Do not assume 30 days or another default.

### R2-OD-009 — Payment status — APPROVED

```text
paidAmount = sum(paymentEvents.amount)
```

Amount status: UNPAID / PARTIAL / PAID / MISMATCH as in D5.

`PAYMENT_OVERDUE` is independent: `dueDate < today AND paidAmount < invoice.amount`.

No tolerance, percentage threshold, risk model or AI.

### R2-OD-010 — Payment event editing — APPROVED

Payment events may be edited and deleted in R2.

- Invoice payment status is derived, not independent persisted truth.
- Payment mutations trigger recalculation of derived state.
- No immutable ledger / reversal-event / audit-ledger model in R2.

### R2-OD-011 — Contract currency mutation — APPROVED (product)

Contract currency may be changed before monetary records exist.

Once the first monetary record exists, Contract currency is immutable.

No FX or retroactive currency conversion.

**Reconciliation with Invoice currency:** D7 requires Invoice / Payment consistency with Contract currency. After the first Invoice or Payment event exists, Contract currency cannot change, so live Contract currency and historical Invoice currency cannot diverge under this rule. R2-E02 P-E02-00 closes the representation: Invoice persists a currency snapshot that must match Contract at write and is immutable after create (`docs/release/r2-e02-invoice-tracking.md` E02-D01). Not FX.

### R2-OD-013 — Contract Time Allocation — APPROVED (product)

R2 does **not** introduce generic workspace capacity alerts.

R2 supports optional Contract / Project Time Allocation:

- `allocatedMinutes` is an optional Contract-level total time budget
- manually configurable and editable
- conceptually distinct from `monthlyContractedMinutes`
- TimeEntry consumption is compared against `allocatedMinutes`
- no allocation alert exists when `allocatedMinutes = null`

Allocation alerts are project / Contract operational alerts, not workspace capacity alerts.

```text
monthlyContractedMinutes = recurring contractual capacity
allocatedMinutes         = total project / Contract time budget
```

Do not conflate them.

WARNING threshold = 80%. EXCEEDED only when consumption `>` allocatedMinutes. Exactly 100% is WARNING, not EXCEEDED. Closed by P-E04-00 (`docs/release/r2-e04-forecasting-allocation.md` E04-D-ALLOCATION-WARNING / E04-D-ALLOCATION-EXCEEDED). Zero allocation has no status and no allocation alert regardless of consumption (E04-D-ALLOCATION-ZERO-STATUS / 8-C). CERTIFIED (P-E04-00…P-E04-07).

### R2-OD-014 — Period closure — APPROVED OUT OF R2

Do not introduce period-close / accounting-lock semantics in R2.

OBD-007 remains historically open for a later release. It does not block R2.

### R2-OD-015 — Audit — APPROVED OUT OF R2

Do not introduce a dedicated audit ledger in R2.

Normal application persistence / history remains sufficient.

OBD-008 remains historically open for a later release. It does not block R2.

---

## 4. Residual planning / product questions

R2-OD-005 and the R2-OD-013 WARNING residual are CLOSED by P-E04-00. R2-OD-012 remains open and is joined by E05-D-REPORT-SCOPE, E05-D-TEMPORAL-MODEL, and E05-D-REPORT-FILTERS (`docs/release/r2-e05-advanced-reporting-export.md`). Closed rows stay as register history. They are **not** approved implementation assumptions for still-open items.

| ID | Topic | Needed by |
| --- | --- | --- |
| R2-OD-005 | CLOSED — Forecast = Accrued / elapsedFraction on the certified current period (`docs/release/r2-e04-forecasting-allocation.md` E04-D-FORECAST-ARITHMETIC) | R2-E04 |
| R2-OD-012 | Whether simple tabular / CSV export belongs in R2-E05. PDF / document generation is out of core R2. Recovered as E05-D-EXPORT-FORMATS; still OPEN | R2-E05 |
| R2-OD-013 residual | CLOSED — WARNING 80%; EXCEEDED only when consumption `>` allocation (`docs/release/r2-e04-forecasting-allocation.md`) | R2-E04 |
| R2-OD-007 residual | CLOSED — VOID one-way soft-delete; default lists exclude; no restore (`docs/release/r2-e02-invoice-tracking.md` E02-D02) | R2-E02 P-E02-00 |
| R2-OD-011 residual | CLOSED — Invoice currency snapshot; must match Contract at write (`docs/release/r2-e02-invoice-tracking.md` E02-D01) | R2-E02 P-E02-00 |
| R2-OD-003 residual | CLOSED — TimeEntry `snapshotBillingModel` / `snapshotRate` / `snapshotCurrency` | R2-E01 P-E01-01 |
| R2-OD-016 | APPROVED — weighted-average daily rate; Accrued arithmetic in P-E01-02 | R2-E01 P-E01-02 |
| R2-OD-017 | CLOSED — existing TimeEntries backfilled from current Contract | R2-E01 P-E01-01 |

Direction already approved and **not** reopened:

- Forecast is simple deterministic linear from Accrued + elapsed time. No ML / AI / extra signals (R2-OD-005).
- Document / PDF generation is not part of core R2 (R2-OD-012).

Full residual text: `docs/release/r2-open-decisions.md`.

---

## 5. R2 scope

R2 concentrates on Financial / Revenue Operations, always secondary to Time Tracking.

| Theme | In R2 | Notes |
| --- | --- | --- |
| Revenue visibility | Yes | Accrued + Expected; Forecast is the projection companion |
| Invoice Tracking | Yes | Tracking record only |
| Payment Tracking & Reconciliation | Yes | D5 / D6 / R2-OD-009 |
| Forecasting / Contract Time Allocation | Yes | Linear Forecast + optional `allocatedMinutes`. No workspace capacity alerts |
| Advanced Reporting & Export | Conditional | Planning recovered (`docs/release/r2-e05-advanced-reporting-export.md`). Advanced filtering, report columns, temporal joins, and CSV remain PO blockers. No fiscal PDF |
| Cross-cutting | Yes as required | Currency, rounding, commercial snapshot |

---

## 6. Out of scope

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
- workspace capacity model / generic capacity alerts
- period-close / accounting-lock
- dedicated audit ledger
- calendar integration (R3)
- accounting-system adapters (R3)
- AI assistants (R4)
- reopening accepted R1 limitations as R2 bugs without a new Product Owner decision

---

## 7. Domain boundaries

| Concept | Owner | R2 role |
| --- | --- | --- |
| TimeEntry | FreelanceOS | Source of Accrued quantity; currency-agnostic |
| Contract | FreelanceOS | Economic conditions, currency, payment terms, expected capacity, optional `allocatedMinutes` |
| Commercial snapshot | FreelanceOS | Historical Accrued commercial value. Persistence not yet present |
| Accrued / Expected / Forecast Revenue | FreelanceOS | Derived economic visibility |
| Invoice Tracking | FreelanceOS | Operational record |
| Payment | FreelanceOS | Operational events + derived status |
| Costs / profitability / fiscality | PIVA Balance | External domain |
| Fiscal invoice / SDI / e-invoicing | Future integration (R3+) or external | Not R2 |

---

## 8. Historical R2 themes — reconciliation

| Previous theme | Disposition |
| --- | --- |
| R2-E01 Invoice Lifecycle | **INVALID.** Replaced by Invoice Tracking (D2). |
| R2-E02 Payment Tracking | **VALID** within D5 / D6 / R2-OD-009. |
| R2-E03 Forecasting & Capacity | **RENAMED / REDUCED.** Forecast Revenue + Contract Time Allocation. No ML/AI. No workspace capacity alerts. |
| R2-E04 Advanced Reporting & Export | **CONDITIONAL.** Simple CSV possible in R2-E05; PDF / document generation out of core R2. Excel not assumed. |
| R2-E05 Commercial Intelligence | **INVALID** as profitability / commercial scoring. Useful operational analytics fold into reporting. |

The label “Billing & Intelligence” is **not binding**. Official R2 name: **Revenue Operations**.

Current executable map: `docs/release/r2-epic-map.md`.

---

## 9. Gated historical OBDs

| ID | Decision | R2 status |
| --- | --- | --- |
| OBD-007 | Period closure / post-closure edit-delete | **OUT OF R2** (R2-OD-014). Remains historically open for a later release. |
| OBD-008 | Audit / TimeEntry audit | **OUT OF R2** (R2-OD-015). Remains historically open for a later release. |
| OBD-011 | Multi-currency | **Direction CLOSED by D7.** Mutation after monetary records: CLOSED by R2-OD-011. Invoice currency snapshot: CLOSED by R2-E02 E02-D01. |

R1 freeze deferred these items. Freeze deferral is historical. It does not force them into R2.

---

## 10. Historical conflicts

| Conflict | Classification |
| --- | --- |
| Revenue / billing calculation ambiguities | **RESOLVED BY PRODUCT DECISION** (D4, R2-OD-001, R2-OD-002, R2-OD-004, R2-OD-005 CLOSED). |
| EPIC-105 “billing → R2-E02” vs MASTER_PLAN separate invoice/payment | **RESOLVED BY PRODUCT DECISION.** Invoice Tracking and Payment Tracking are separate. Invoice Lifecycle is withdrawn. |
| Invoice commercial snapshot vs TimeEntry commercial snapshot | **RESOLVED as product semantics** (R2-OD-003 Commercial Snapshot). Persistence mechanism is an R2-E01 planning dependency. Invoice-generation snapshot is **HISTORICAL / NO LONGER RELEVANT** (D2). |
| OBD needed-by R2 vs freeze deferral | **HISTORICAL.** 007/008 are out of R2. D7 + R2-OD-011 close OBD-011 direction and mutation. |
| Capacity alerts vs forecasting | **RESOLVED BY PRODUCT DECISION.** No workspace capacity alerts. Contract Time Allocation instead (R2-OD-013). WARNING / EXCEEDED CLOSED by P-E04-00. |
| Calendar view vs calendar integration | **HISTORICAL / NO LONGER RELEVANT** to R2. Calendar view was deferred in EPIC-103; calendar integration remains R3. |
| TD ID collisions (`MASTER_PLAN` TD-* vs `testing-strategy` TD-* vs EPIC-001 TD-*) | **DOCUMENTATION CONFLICT.** Do not reuse IDs. Do not “fix” history in this pack. |
| Excel in EPIC-105 non-goals vs product OD-011 CSV/PDF | **RESOLVED.** Excel was never a Product Owner decision. Not R2. PDF / document generation is out of core R2. |

R1 accepted limitations remain historical. They are not R2 bugs unless the Product Owner reopens them.

---

## 11. Architectural implications

Domain implications (not an implementation plan):

- Contract already carries `currency`, `paymentTermsDays`, `billingModel`, `rate`, and `monthlyContractedMinutes` in R1. R2 consumes them; it does not reinvent them.
- `allocatedMinutes` is a new optional Contract concept. It does not exist in the current persistence model.
- TimeEntry stays currency-agnostic and remains the Accrued quantity fact.
- Historical Accrued requires a commercial snapshot that does not yet exist in persistence.
- Invoice Tracking and Payment are new operational aggregates.
- Payment status and discrepancies are derived.
- Revenue is a derived read model unless a later technical plan proves a persistence need.
- Payment alerts and allocation alerts should extend the existing deterministic AlertService.
- No FX, profitability, invoice-generation, period-close, audit-ledger, or accounting modules.

See `docs/release/r2-architecture-delta.md`.

---

## 12. Decision status

| Kind | Items |
| --- | --- |
| APPROVED | D1, D2, D3, D4, D5, D6, D7 |
| APPROVED OD resolutions | R2-OD-001, R2-OD-002, R2-OD-003 (semantics), R2-OD-004, R2-OD-005 (arithmetic CLOSED by P-E04-00), R2-OD-006, R2-OD-007 (product + VOID semantics), R2-OD-008, R2-OD-009, R2-OD-010, R2-OD-011 (product + Invoice currency snapshot), R2-OD-013 (product + WARNING / EXCEEDED CLOSED by P-E04-00), R2-OD-014, R2-OD-015 |
| RESIDUAL PLANNING / PRODUCT | R2-OD-012 CSV-in-E05; E05-D-REPORT-SCOPE; E05-D-TEMPORAL-MODEL; E05-D-REPORT-FILTERS |
| DEFERRED / FUTURE | FX, installment engine, PIVA Balance integration, e-invoicing, calendar integration, AI, Excel, profitability, advanced grace / risk, workspace capacity alerts, period-close, audit ledger |

---

## 13. R1 integrity

R1 remains FROZEN / GRANTED.

| Item | Value |
| --- | --- |
| Freeze commit | `8f79216d8e89c414ce2bb517859d3278c8e1f65f` |
| Production candidate | `c6712224e8d093b6f64cb46a17823a20de356a31` |
| Production | https://freelance-os-timeplan.vercel.app |
| EPIC-110 | CLOSED |
| This pack | Does not reopen R1, rewrite freeze evidence, or treat accepted R1 limitations as R2 defects |
