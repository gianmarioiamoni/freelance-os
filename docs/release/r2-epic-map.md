# R2 Epic Map — Planning Baseline

**Status:** Executable planning baseline. R2-E01 COMPLETE / RELEASE-READY. R2-E02 COMPLETE WITH NON-BLOCKING FINDING. R2-E03 CERTIFIED (P-E03-00…P-E03-07). R2-E04 CERTIFIED (P-E04-00…P-E04-07). E05 detailed plan exists (`docs/release/r2-e05-advanced-reporting-export.md`). P-E05-00 COMPLETE — PO DECISIONS CLOSED. P-E05-01 AUTHORIZED. E05 is not certified. No EPIC-2xx opened. R2 is not production-ready.  
**Date:** 2026-09-24  
**Authority:** `docs/release/r2-decision-pack.md`  
**E01 plan:** `docs/release/r2-e01-revenue-visibility.md`  
**E02 plan:** `docs/release/r2-e02-invoice-tracking.md`  
**E03 plan:** `docs/release/r2-e03-payment-tracking.md`  
**E04 plan:** `docs/release/r2-e04-forecasting-allocation.md`  
**E05 plan:** `docs/release/r2-e05-advanced-reporting-export.md`  
**Does not:** authorize E05 implementation.

```text
PLANNING BASELINE (E05 P-E05-00 CLOSED; P-E05-01 AUTHORIZED)
R2-E01: COMPLETE / RELEASE-READY
R2-E02: COMPLETE WITH NON-BLOCKING FINDING
R2-E03: CERTIFIED
R2-E04: CERTIFIED
IMPLEMENTATION: E01 DONE; E02 DONE; E03 CERTIFIED; E04 CERTIFIED; E05 P-E05-01 AUTHORIZED / NOT STARTED
R1: FROZEN / GRANTED
R2: NOT PRODUCTION-READY
```

Priority:

```text
TIME TRACKING (exists)
      >
CONTRACT (exists)
      >
REVENUE VISIBILITY
      >
PAYMENT TRACKING
```

---

## Historical map (superseded)

| Old ID | Old name | Disposition |
| --- | --- | --- |
| R2-E01 | Invoice Lifecycle | **Withdrawn.** Replaced by Invoice Tracking. |
| R2-E02 | Payment Tracking | Retained as current R2-E03, narrowed to D5 / D6. |
| R2-E03 | Forecasting & Capacity | Retained as current R2-E04. No ML/AI. Workspace capacity withdrawn. |
| R2-E04 | Advanced Reporting & Export | Retained as current R2-E05, conditional CSV. |
| R2-E05 | Commercial Intelligence | **Withdrawn.** No profitability / client scoring. |

---

## Dependency order

Conceptual product order:

```text
R2-E01 Revenue Visibility
        ↓
R2-E02 Invoice Tracking
        ↓
R2-E03 Payment Tracking & Reconciliation
```

```text
R2-E04 Forecasting & Contract Time Allocation
        depends on R2-E01
        depends on existing TimeEntry / Contract analytics
        depends on Contract Time Allocation semantics
```

```text
R2-E05 Advanced Reporting & Export
        depends on finalized revenue / invoice / payment semantics
        must not block E01–E03 operational flows
```

Safe parallelization:

| Work | May start when |
| --- | --- |
| R2-E01 | R1 Contract + TimeEntry exist (now) |
| R2-E02 | R1 Contract exists (now). Does **not** depend on Accrued |
| R2-E03 | After R2-E02 Invoice Tracking exists |
| R2-E04 Forecast | After R2-E01 Accrued exists |
| R2-E04 `allocatedMinutes` | After Contract write-path is available; may proceed in parallel with E02 |
| R2-E05 | After the figures it reports are semantically stable. Revenue-only reports may follow E01; invoice/payment columns follow E02/E03 |

E01 and E02 may be planned and implemented in parallel. E03 is sequential on E02. E04 is sequential on E01 for Forecast. E05 is a trailing read-model epic.

---

## R2-E01 — Revenue Visibility

Detailed plan: `docs/release/r2-e01-revenue-visibility.md`.  
Status: **COMPLETE / RELEASE-READY.** P-E01-00…P-E01-07 COMPLETE. Engineering Review PASS WITH FINDINGS. QA PASS WITH FINDINGS. F-E01-001 CLOSED. F-E01-002 CLOSED.

### 1. Objective

Publish deterministic Accrued Revenue and Expected Revenue so the freelancer understands the economic value of recorded work and of HOURLY contractual capacity — without invoicing or accounting.

### 2. User value

See what work is already worth (Accrued) and what the HOURLY contract economically expects in the period (Expected), separated by currency.

### 3. In scope

- Accrued Revenue from TimeEntry + historical commercial value (D4, R2-OD-003).
- HOURLY Accrued: `billable minutes / 60 × hourly rate`.
- DAILY Accrued: one billable day per Contract per calendar date with at least one TimeEntry; multiples count once (R2-OD-001).
- Expected Revenue for HOURLY from contractual capacity, validity, and existing pro-rata semantics (R2-OD-004).
- Expected Revenue = null when HOURLY contractual capacity is unavailable.
- Published amounts rounded to nearest integer; intermediates not prematurely rounded (R2-OD-002).
- Per-currency presentation (D7).
- Surfaces that reuse shared calculation services (dashboard / reports — exact UI in the later epic plan).

### 4. Explicitly out of scope

- Invoice Tracking (R2-E02) and Payment (R2-E03).
- Forecast Revenue (R2-E04).
- Expected Revenue for DAILY.
- Profitability, tax, FX rollup, accounting recognition, ML.
- Inventing Prisma field names for E02–E05 concepts. R2-OD-016 / R2-OD-017 are closed.

### 5. Dependencies

- R1 TimeEntry and Contract.
- Existing pro-rata capacity (PD-105-005).
- Commercial snapshot class B implemented: TimeEntry `snapshotBillingModel`, `snapshotRate`, `snapshotCurrency` (R2-OD-003 residual CLOSED).
- R2-OD-016 APPROVED (weighted-average daily rate). Implemented in P-E01-02.
- R2-OD-017 APPROVED (existing TimeEntries backfilled from the current associated Contract). Implemented in P-E01-01.

### 6. Domain objects affected

- TimeEntry (read; snapshot write if the persistence plan requires it).
- Contract (read commercial conditions for new work).
- Derived Accrued / Expected Revenue.

### 7. Application services / capabilities affected

- Implemented: `AnalyticsService` extension (`getAccruedRevenue` / `getExpectedRevenue`). No parallel RevenueService.
- `ReportingService` / dashboard read paths publish Accrued / Expected on existing DTOs. UI does not render money.

### 8. Persistence impact

- Implemented: **B — TimeEntry** `snapshotBillingModel`, `snapshotRate`, `snapshotCurrency`. Not A. C not required.
- Closed: R2-OD-003 residual; R2-OD-017 backfill; R2-OD-016 weighted-average daily rate.
- Revenue totals remain derived unless a later plan proves persistence.
- Migration was P-E01-01 only.

### 9. Analytics / reporting impact

- First publication of monetary figures in analytics / reporting.
- Must stay on shared calculation services (A-006).
- Aggregates separated by currency.

### 10. Alerts / notifications impact

- None in this epic.

### 11. Authorization / workspace isolation

- All reads workspace-scoped via existing `WorkspaceContext`.
- No browser-supplied tenant grant.
- OBD-009 roles unchanged.

### 12. E2E implications

- Accrued changes when billable TimeEntries change.
- Later Contract rate changes must not rewrite historical Accrued (once snapshot exists).
- HOURLY Expected follows pro-rata capacity; null capacity → null Expected.
- DAILY Expected is absent.
- Mixed-currency workspaces never show a single converted total.

### 13. Acceptance criteria

- Accrued is independent of Invoice and Payment.
- DAILY billable-day rule matches R2-OD-001.
- Published money matches R2-OD-002.
- Historical Accrued uses work-time commercial value.
- HOURLY Expected uses contractual capacity / pro-rata or is null.
- Workspace isolation holds.

### 14. Product decisions still required

- None for E01. R2-OD-003 representation, R2-OD-016, and R2-OD-017 are closed/implemented.

### 15. Risks / architectural constraints

- Implementing Accrued against live Contract fields would violate R2-OD-003.
- Do not introduce accounting-grade money types.
- Do not treat BR-007 as revoked: Accrued remains billable work.
- R1 P102-F-001 is the historical gap this epic must close, not a reason to skip the snapshot.

---

## R2-E02 — Invoice Tracking

Detailed plan: `docs/release/r2-e02-invoice-tracking.md`.  
Status: **COMPLETE WITH NON-BLOCKING FINDING.** P-E02-00…P-E02-07 COMPLETE. Engineering Review PASS WITH FINDINGS. QA PASS WITH FINDINGS. F-E02-001 CLOSED. F-E02-002 CLOSED. F-E02-003 CLOSED. F-E02-004 OPEN (non-blocking / test hygiene).

### 1. Objective

Register operational invoice tracking records so payments can be expected and reconciled. Not fiscal invoicing.

### 2. User value

Record that an invoice exists for a Contract, with date, amount, and optional reference, without generating a fiscal document.

### 3. In scope

- 1 Contract → many Invoice; 1 Invoice → exactly 1 Contract (R2-OD-006).
- `invoiceDate`, amount, currency tied to Contract, optional reference.
- `dueDate` only when `paymentTermsDays` is present (R2-OD-008).
- Invoice remains editable.
- VOID / soft-delete instead of physical delete (R2-OD-007).
- Currency mutation guard: Contract currency immutable after the first monetary record (R2-OD-011).

### 4. Explicitly out of scope

- Generation, PDF, numbering, e-invoicing, line items, credit / debit notes, pro-forma, recurring engine, SDI, fiscal workflow.
- Payment events (R2-E03).
- Treating the record as Accrued Revenue.
- Invoice competence period.
- Fiscal immutability.

### 5. Dependencies

- R1 Contract (`currency`, `paymentTermsDays`).
- VOID domain / list semantics closed (E02-D02).
- Invoice currency snapshot closed (E02-D01).

Independent of R2-E01. Detailed plan: `docs/release/r2-e02-invoice-tracking.md`.

### 6. Domain objects affected

- New Invoice Tracking aggregate.
- Contract (currency immutability write rule).

### 7. Application services / capabilities affected

- New Invoice Tracking application service.
- Contract update path (currency mutation guard).

### 8. Persistence impact

- Implemented (P-E02-01): `Invoice` table; VOID / soft-delete via `voidedAt`.
- Implemented: Invoice currency snapshot (E02-D01); `paymentTermsDays` / `dueDate` snapshots (E02-D11).
- No invoice-line table. No Payment table.

### 9. Analytics / reporting impact

- Invoice facts become available to R2-E05.
- Invoice is not Accrued and must not be summed into Accrued.

### 10. Alerts / notifications impact

- None until R2-E03.

### 11. Authorization / workspace isolation

- Invoice is workspace-scoped through Contract / explicit `workspaceId`.
- Server-side membership required for every read/write.
- Resource ids are not tenant grants.

### 12. E2E implications

- Create / edit / VOID Invoice on a Contract.
- Reject Invoice currency that diverges from Contract.
- Reject Contract currency change after the first Invoice exists.
- VOID removes the record from active tracking without physical delete.
- `paymentTermsDays = null` yields no due date.

### 13. Acceptance criteria

- Cardinality and fields match R2-OD-006 / R2-OD-007.
- No fiscal document is generated.
- Historical invoices are not physically deleted.
- Workspace isolation holds.

### 14. Product decisions still required

- None for E02. Residual #3 (currency snapshot) and #4 (VOID list / restore) are closed in `docs/release/r2-e02-invoice-tracking.md`. E03-D-VOID-PAYMENTS is closed in `docs/release/r2-e03-payment-tracking.md` (Option A).

### 15. Risks / architectural constraints

- Do not silently reuse historical “invoice generation snapshot” language.
- Do not invent a default `paymentTermsDays`.
- Currency snapshot must not become an FX or retroactive-conversion mechanism.

---

## R2-E03 — Payment Tracking & Reconciliation

### 1. Objective

Track expected versus actual payments operationally and surface simple deterministic discrepancies.

### 2. User value

Know whether an invoice is unpaid, partial, paid, mismatched, and/or overdue — without an accounting subsystem.

### 3. In scope

- Derived expected payment date: `invoiceDate + paymentTermsDays` (D5).
- Multiple payment events per Invoice.
- `paidAmount = sum(paymentEvents.amount)`.
- Derived amount status: UNPAID / PARTIAL / PAID / MISMATCH (R2-OD-009).
- Independent `PAYMENT_OVERDUE` when `dueDate < today AND paidAmount < invoice.amount`.
- Alerts: `PAYMENT_OVERDUE`, `PAYMENT_PARTIAL`, `PAYMENT_MISMATCH` (D6).
- Payment events editable and deletable on ACTIVE invoices; status recalculated (R2-OD-010).
- VOID freeze: no Payment create / update / delete on VOID (E03-D-VOID-PAYMENTS A). Existing payments remain readable.
- Reuse `AlertService` when technically appropriate.

### 4. Explicitly out of scope

- Accounts receivable / accounting.
- Installment / schedule engine.
- Risk scoring, prediction, AI, percentage thresholds, grace periods.
- Immutable ledger / reversal events / audit ledger.
- Overdue when `paymentTermsDays` is null.

### 5. Dependencies

- R2-E02 Invoice Tracking.
- `Contract.paymentTermsDays`.
- Likely `Workspace.timezone` for “today”.

### 6. Domain objects affected

- New Payment event.
- Invoice Tracking (derived status).
- Alert / Notification.

### 7. Application services / capabilities affected

- Payment write/read service.
- Pure domain status derivation.
- `AlertService` extension.

### 8. Persistence impact

- Implemented: `Payment` table. `Decimal(19,4)`. `CHAR(3)` currency snapshot. Calendar `DATE`. Composite Invoice relation. `CHECK (amount > 0)`.
- Implemented: status is derived, not independent persisted truth.
- Implemented: `Workspace.timezone` is the overdue “today” authority.

### 9. Analytics / reporting impact

- Payment status / paid / outstanding become reportable facts for R2-E05.
- Must not alter Accrued or Expected.

### 10. Alerts / notifications impact

- Implemented: `PAYMENT_PARTIAL` / `PAYMENT_OVERDUE` / `PAYMENT_MISMATCH`.
- Implemented: T3 on-write. `Alert.invoiceId` semantic identity. E02 lifecycle reused.
- Existing CONTRACT_WARNING / CONTRACT_EXCEEDED unchanged.

### 11. Authorization / workspace isolation

- Payment events scoped through Invoice / Contract / workspace.
- Server-side membership on every mutation.
- Alert and notification queries remain `workspaceId` + `userId` scoped.

### 12. E2E implications

- Multiple payments update derived status.
- Edit / delete payment recalculates status.
- PARTIAL + OVERDUE can appear together.
- Over-payment is MISMATCH, not a hidden PAID.
- Null payment terms never produce OVERDUE.
- VOID Invoice rejects Payment create / update / delete; existing events remain readable.

### 13. Acceptance criteria

- Status always derivable from events.
- Predicates match R2-OD-009 with no tolerance.
- Alerts are deterministic.
- Workspace isolation holds.

### 14. Product decisions still required

- None. VOID payment-list / write residual is closed by E03-D-VOID-PAYMENTS Option A (`docs/release/r2-e03-payment-tracking.md`).
- No new payment-status product decision.
- Alert trigger / shape / paymentDate future / amount sign / currency representation are CLOSED by P-E03-01…P-E03-03. They are not PO residuals.

### 15. Risks / architectural constraints

- Do not persist status as a second source of truth.
- Do not introduce D5’s superseded mutually exclusive OVERDUE amount status.
- Do not add percentage / risk logic in the evaluator.

---

## R2-E04 — Forecasting & Contract Time Allocation

### 1. Objective

Project Accrued Revenue to period end with a simple linear Forecast, and compare TimeEntry consumption against an optional Contract / Project time budget.

### 2. User value

See where current-period Accrued is heading, and whether a Contract’s total allocated time is being consumed — without ML or a workspace capacity model.

### 3. In scope

- Deterministic linear Forecast from Accrued and elapsed time in the current reporting period (R2-OD-005 CLOSED).
- Optional Contract `allocatedMinutes`, manually configurable and editable (R2-OD-013).
- Consumption = SUM(TimeEntry.minutes) inside Contract `[validFrom, validTo)`.
- No allocation status or alert when `allocatedMinutes` is null or `0` (8-C).
- Allocation alerts when `allocatedMinutes > 0`: `<80%` NORMAL (no alert); `>=80%` and `<=100%` WARNING; `>100%` EXCEEDED.

### 4. Explicitly out of scope

- ML / AI / probabilistic / historical-behaviour engines.
- Extra forecasting signals beyond Accrued + elapsed time.
- Workspace capacity model and generic `CAPACITY_WARNING` / `CAPACITY_EXCEEDED`.
- Conflating `allocatedMinutes` with `monthlyContractedMinutes`.
- Inventing a different WARNING / EXCEEDED model than the closed 80% / `>100%` predicates.

### 5. Dependencies

- R2-E01 Accrued Revenue (Forecast).
- Existing TimeEntry / Contract analytics (consumption, periods).
- Contract Time Allocation semantics (R2-OD-013).
- Closed Forecast arithmetic and allocation predicates (`docs/release/r2-e04-forecasting-allocation.md` §17).

### 6. Domain objects affected

- Contract (`allocatedMinutes` concept).
- TimeEntry (consumption read).
- Derived Forecast Revenue.
- Alert / Notification (allocation).

### 7. Application services / capabilities affected

- Revenue / analytics read path for Forecast.
- Contract write path for `allocatedMinutes`.
- `AlertService` for `ALLOCATION_WARNING` / `ALLOCATION_EXCEEDED` in P-E04-03.

### 8. Persistence impact

- Confirmed and implemented: optional `allocatedMinutes` on Contract (`Int?`, migration `20260923230000_add_contract_allocated_minutes`).
- Forecast remains derived.
- WARNING threshold is the closed constant 80%. EXCEEDED only when consumption `>` allocatedMinutes.

### 9. Analytics / reporting impact

- Forecast is a current-period projection companion to Accrued on existing E01 revenue surfaces.
- Contract detail shows allocation, consumption, remaining, and allocation status.

### 10. Alerts / notifications impact

- New Contract allocation alerts `ALLOCATION_WARNING` / `ALLOCATION_EXCEEDED` after predicates exist in application code. Technical lifecycle is closed in the E04 register.
- No workspace capacity alerts. Do not reuse `PAYMENT_*` or monthly `CONTRACT_*` types.

### 11. Authorization / workspace isolation

- Same workspace-scoped Contract and TimeEntry rules as R1.
- Allocation alerts inherit existing Alert / Notification isolation.

### 12. E2E implications

- Forecast uses only Accrued and elapsed time on the certified current period.
- Setting / clearing `allocatedMinutes` enables / disables allocation alerts.
- `monthlyContractedMinutes` utilization alerts remain a separate R1 mechanism.

### 13. Acceptance criteria

- Forecast is linear and deterministic; no ML.
- `allocatedMinutes` is optional and distinct from monthly capacity.
- Null allocation produces no allocation alert.
- Workspace isolation holds.

### 14. Product decisions still required

None. See `docs/release/r2-e04-forecasting-allocation.md` §17. Forecast arithmetic, allocation WARNING / EXCEEDED, consumption rules, and revenue UI surface are CLOSED — PO APPROVED. Alert lifecycle is CLOSED TECHNICAL.

### 15. Risks / architectural constraints

- Product vision §8 “historical behavior” is **not** adopted.
- Do not treat PD-106-001 workspace capacity as approved.
- Do not ship allocation WARNING with a percentage other than the closed 80%.

---

## R2-E05 — Advanced Reporting & Export

### 1. Objective

Extend operational reporting so revenue, invoice tracking, and payment status can be inspected and, if justified, exported as a simple table.

### 2. User value

Inspect R2 operational facts over existing period selection without building a second source of truth or a document generator.

### 3. In scope

- Existing `/reports` surfaces only. Publish already-loaded Expected and Contract Allocation (E05-D-REPORT-SCOPE A).
- Filters: Period + Client + Contract (E05-D-REPORT-FILTERS B).
- Native CSV of the same approved filtered dataset (E05-D-EXPORT-FORMATS B / R2-OD-012 CLOSED).
- Shared calculation services only.

### 4. Explicitly out of scope

- Core-R2 document / PDF / fiscal generation.
- Excel.
- Profitability, client scoring, commercial intelligence.
- Cross-currency totals (D7).
- Invoice/Payment report axis, temporal reporting, or workspace indexes.
- Currency / VOID / amountStatus / overdue filters.
- Blocking E01–E03 until export is decided.

### 5. Dependencies

- R2-E01 for Accrued / Expected.
- R2-E04 for Forecast / allocation.
- Closed P-E05-00 contract. No Invoice/Payment reporting dependency.

### 6. Domain objects affected

- None as write model. Read models over TimeEntry, Contract, derived Accrued / Expected / Forecast / allocation.

### 7. Application services / capabilities affected

- `ReportingService` / analytics read path.
- Native CSV serializer in P-E05-03.

### 8. Persistence impact

- None expected. Reports remain derived.
- No document store.

### 9. Analytics / reporting impact

- This epic **is** the reporting impact of R2.
- Must not duplicate revenue / payment formulas.

### 10. Alerts / notifications impact

- None.

### 11. Authorization / workspace isolation

- Same RSC / `WorkspaceContext` rules as EPIC-105 `/reports`.
- Period / Client / Contract parameters are view state, not tenant grants.

### 12. E2E implications

- Accrued / Expected / Forecast / allocation figures agree with AnalyticsService.
- Per-currency separation.
- CSV is tabular and non-fiscal.

### 13. Acceptance criteria

- Reporting remains a read model over shared services.
- No fiscal PDF exists.
- Native CSV of the approved filtered dataset.
- Workspace isolation holds.

### 14. Product decisions still required

None. Closed in `docs/release/r2-e05-advanced-reporting-export.md` §17:

- E05-D-REPORT-SCOPE A
- E05-D-TEMPORAL-MODEL D
- E05-D-REPORT-FILTERS B
- E05-D-EXPORT-FORMATS B (R2-OD-012)

### 15. Risks / architectural constraints

- Do not let export pull document-generation architecture into the monolith.
- Do not wait to start E01–E03 on this epic.

---

## Cross-cutting (not a standalone epic)

| Topic | Handling |
| --- | --- |
| Rounding | APPROVED (R2-OD-002) — apply before any published money |
| DAILY accrued | APPROVED (R2-OD-001) |
| Commercial snapshot semantics | APPROVED; TimeEntry snapshot implemented in E01 |
| Period closure | OUT OF R2 (R2-OD-014) |
| Audit ledger | OUT OF R2 (R2-OD-015) |
| Multi-currency | D7 + R2-OD-011; Invoice snapshot implemented (E02-D01) |
| Workspace isolation | Unchanged R1 rule for every new aggregate |

---

## Remaining product decisions

Do not implement these as assumptions.

1. Contract Time Allocation WARNING threshold — CLOSED (E04-D-ALLOCATION-WARNING / E04-D-ALLOCATION-EXCEEDED).
2. Exact Forecast calculation semantics — CLOSED (E04-D-FORECAST-ARITHMETIC).
3. Invoice currency snapshot representation — CLOSED (E02-D01).
4. Exact Invoice VOID behaviour and UI semantics — CLOSED (E02-D02).
5. Simple CSV in R2-E05 — CLOSED (E05-D-EXPORT-FORMATS B / R2-OD-012). E05-D-REPORT-SCOPE A, E05-D-TEMPORAL-MODEL D, E05-D-REPORT-FILTERS B CLOSED. See `docs/release/r2-e05-advanced-reporting-export.md`.
6. Commercial snapshot persistence: CLOSED — TimeEntry `snapshotBillingModel` / `snapshotRate` / `snapshotCurrency`.
7. R2-OD-016 — APPROVED / implemented — weighted-average daily rate (P-E01-02).
8. R2-OD-017 — CLOSED / implemented — existing TimeEntries backfilled from current Contract.
9. E04 allocation EXCEEDED, consumption numerator/window/out-of-validity, and revenue UI surface — CLOSED. See `docs/release/r2-e04-forecasting-allocation.md` §17.

---

## R2 implementation phasing

Methodology (`MASTER_PLAN.md` §2):

```text
Vision → Architecture → Planning → Implementation → Engineering Review
  → QA → Documentation → UX Review → UX Polish
  → Production Validation → Certification → Release
```

```text
Release → Epic → Phase → Commit
```

This document is the release-level planning baseline. R2-E01 is COMPLETE / RELEASE-READY (`docs/release/r2-e01-revenue-visibility.md`). R2-E02 is COMPLETE WITH NON-BLOCKING FINDING (`docs/release/r2-e02-invoice-tracking.md`). R2-E03 is CERTIFIED (`docs/release/r2-e03-payment-tracking.md`). R2-E04 is CERTIFIED (`docs/release/r2-e04-forecasting-allocation.md`). R2-E05 detailed plan exists (`docs/release/r2-e05-advanced-reporting-export.md`). P-E05-00 is COMPLETE — PO DECISIONS CLOSED. P-E05-01 is AUTHORIZED. E05 is not certified. It does not start P-E05-01 in this document.

### Release-level

| Stage | R2 status |
| --- | --- |
| Vision | Complete — decision pack |
| Architecture | Complete as domain delta — `r2-architecture-delta.md` |
| Planning | This baseline. E01–E04 detailed plans complete. E05 P-E05-00 CLOSED |
| Implementation | R2-E01 COMPLETE / RELEASE-READY. R2-E02 COMPLETE WITH NON-BLOCKING FINDING. R2-E03 CERTIFIED. R2-E04 CERTIFIED. E05 P-E05-01 AUTHORIZED / NOT STARTED |
| Engineering Review → Release | E01–E04 ER + QA complete. E03 CERTIFIED. E04 CERTIFIED. R2 release gates not started. Do not mark R2 production-ready |

### Proposed small phases (planning labels only)

**R2-E01** — detailed plan: `docs/release/r2-e01-revenue-visibility.md`

| Phase | Intent | Status |
| --- | --- | --- |
| P-E01-00 | Planning / architecture freeze | COMPLETE |
| P-E01-01 | Persistence / domain foundation (class B snapshot; migration) | COMPLETE |
| P-E01-02 | Accrued Revenue | COMPLETE |
| P-E01-03 | Expected Revenue | COMPLETE |
| P-E01-04 | Integration with existing analytics / reporting | COMPLETE |
| P-E01-05 | Engineering Review | COMPLETE — PASS WITH FINDINGS |
| P-E01-06 | QA | COMPLETE — PASS WITH FINDINGS |
| P-E01-07 | Documentation / Epic closure | COMPLETE |

**R2-E02** — detailed plan: `docs/release/r2-e02-invoice-tracking.md`

| Phase | Intent | Status |
| --- | --- | --- |
| P-E02-00 | Planning / decision closure | COMPLETE |
| P-E02-01 | Persistence / domain foundation | COMPLETE |
| P-E02-02 | Invoice application service + Contract currency guard | COMPLETE |
| P-E02-03 | Derived status / due-date behaviour | COMPLETE |
| P-E02-04 | Contract-scoped invoice UI | COMPLETE |
| P-E02-05 | Engineering Review | COMPLETE — PASS WITH FINDINGS |
| P-E02-06 | QA | COMPLETE — PASS WITH FINDINGS |
| P-E02-07 | Documentation / Epic closure | COMPLETE |

**R2-E03** — detailed plan: `docs/release/r2-e03-payment-tracking.md`

| Phase | Intent | Status |
| --- | --- | --- |
| P-E03-00 | Planning / VOID policy closure | COMPLETE |
| P-E03-01 | Payment events + derived status | COMPLETE |
| P-E03-02 | Payment application service | COMPLETE |
| P-E03-03 | Payment alerts via AlertService | COMPLETE — ER APPROVED WITH FINDINGS |
| P-E03-04 | Payment UI | COMPLETE — ER APPROVED WITH FINDINGS |
| P-E03-05 | QA + Documentation Synchronization | COMPLETE — PASS WITH FINDINGS |
| P-E03-06 | Release Validation | COMPLETE — PASS WITH FINDINGS / GATE B |
| P-E03-07 | Certification | COMPLETE — CERTIFIED |

**R2-E04** — detailed plan: `docs/release/r2-e04-forecasting-allocation.md`

| Phase | Intent | Status |
| --- | --- | --- |
| P-E04-00 | Planning / decision gate | COMPLETE — PO DECISIONS CLOSED |
| P-E04-01 | Persistence / domain | COMPLETE — ENGINEERING REVIEW APPROVED WITH FINDINGS |
| P-E04-02 | Application / calculations | COMPLETE — ENGINEERING REVIEW APPROVED WITH FINDINGS |
| P-E04-03 | Forecast / allocation integration | COMPLETE — ENGINEERING REVIEW APPROVED WITH FINDINGS |
| P-E04-04 | UI | COMPLETE — ENGINEERING REVIEW APPROVED WITH FINDINGS |
| P-E04-05 | QA / documentation | COMPLETE — QA PASS WITH FINDINGS |
| P-E04-06 | Release validation | COMPLETE — READY WITH EXPLICIT FINDINGS / GATE B |
| P-E04-07 | Certification | COMPLETE — CERTIFIED |

**R2-E05** — detailed plan: `docs/release/r2-e05-advanced-reporting-export.md`

| Phase | Intent | Status |
| --- | --- | --- |
| P-E05-00 | Planning / decision gate | COMPLETE — PO DECISIONS CLOSED |
| P-E05-01 | Report read model + filters | AUTHORIZED / NOT STARTED |
| P-E05-02 | Additive `/reports` UI | NOT STARTED / NOT AUTHORIZED |
| P-E05-03 | Native CSV export | NOT STARTED / NOT AUTHORIZED |
| P-E05-04 | QA / documentation | NOT STARTED / NOT AUTHORIZED |
| P-E05-05 | Release validation | NOT STARTED / NOT AUTHORIZED |
| P-E05-06 | Certification | NOT STARTED / NOT AUTHORIZED |

Release gates (QA, UX, Production Validation, Certification, Release) run after the implemented R2 scope is reviewable. They are not claimed here.

No EPIC-2xx number is assigned by this document.
