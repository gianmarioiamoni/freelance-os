# R2 Epic Map — Planning Baseline

**Status:** Executable planning baseline. R2-E01 detailed plan complete. Not implementation. No EPIC-2xx opened.  
**Date:** 2026-09-22  
**Authority:** `docs/release/r2-decision-pack.md`  
**E01 plan:** `docs/release/r2-e01-revenue-visibility.md`  
**Does not:** authorize schema, migrations, APIs, UI, or implementation branches.

```text
PLANNING BASELINE
IMPLEMENTATION: NOT STARTED
R1: FROZEN / GRANTED
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
Status: **P-E01-00 COMPLETE. P-E01-01 COMPLETE.** Accrued not started.

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
- Inventing Prisma field names or resolving R2-OD-016 / R2-OD-017 by assumption.

### 5. Dependencies

- R1 TimeEntry and Contract.
- Existing pro-rata capacity (PD-105-005).
- Commercial snapshot class B (new field(s) on the TimeEntry quantity fact). Representation names still open (R2-OD-003 residual).
- R2-OD-016 (DAILY same-day conflicting snapshots) and R2-OD-017 (pre-snapshot TimeEntry treatment) before the phases that need them.

### 6. Domain objects affected

- TimeEntry (read; snapshot write if the persistence plan requires it).
- Contract (read commercial conditions for new work).
- Derived Accrued / Expected Revenue.

### 7. Application services / capabilities affected

- Candidate: `AnalyticsService` extension or a dedicated Revenue application service.
- `ReportingService` / dashboard read paths if they publish money.

### 8. Persistence impact

- Classified in the E01 plan: **B — new field(s) on the TimeEntry quantity fact** for billing model, rate, and currency at work time. Not A. C not required. Names not invented.
- Open: exact representation (R2-OD-003 residual); existing-row treatment (R2-OD-017); DAILY same-day collision (R2-OD-016).
- Revenue totals remain derived unless a later plan proves persistence.
- Migration authorized only in P-E01-01, not by this map.

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

- None for persistence. R2-OD-003 representation, R2-OD-016, and R2-OD-017 are closed/approved. Accrued arithmetic remains P-E01-02.

### 15. Risks / architectural constraints

- Implementing Accrued against live Contract fields would violate R2-OD-003.
- Do not introduce accounting-grade money types.
- Do not treat BR-007 as revoked: Accrued remains billable work.
- R1 P102-F-001 is the historical gap this epic must close, not a reason to skip the snapshot.

---

## R2-E02 — Invoice Tracking

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
- Residual VOID UI and Invoice currency snapshot questions.

Independent of R2-E01.

### 6. Domain objects affected

- New Invoice Tracking aggregate.
- Contract (currency immutability write rule).

### 7. Application services / capabilities affected

- New Invoice Tracking application service.
- Contract update path (currency mutation guard).

### 8. Persistence impact

- Confirmed: new Invoice Tracking record; VOID / soft-delete.
- Open: table/field names; Invoice currency snapshot vs live Contract currency.
- No invoice-line table.

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

- Exact Invoice VOID UI / list / restore semantics (residual #4).
- Invoice currency snapshot representation (residual #3).

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
- Payment events editable and deletable; status recalculated (R2-OD-010).
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

- Confirmed: Payment event records.
- Confirmed: status is derived, not independent persisted truth.
- Open: repository shape; overdue “today” timezone authority (reuse likely).

### 9. Analytics / reporting impact

- Payment status / paid / outstanding become reportable facts for R2-E05.
- Must not alter Accrued or Expected.

### 10. Alerts / notifications impact

- New deterministic payment alert types.
- Dedup / resolve rules to be designed.
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

### 13. Acceptance criteria

- Status always derivable from events.
- Predicates match R2-OD-009 with no tolerance.
- Alerts are deterministic.
- Workspace isolation holds.

### 14. Product decisions still required

- VOID invoices’ interaction with payment lists (depends on residual #4).
- No new payment-status product decision.

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

- Deterministic linear Forecast from Accrued and elapsed time in the current reporting period (R2-OD-005 direction).
- Optional Contract `allocatedMinutes`, manually configurable and editable (R2-OD-013).
- Consumption compared against `allocatedMinutes`.
- No allocation alert when `allocatedMinutes` is null.
- Allocation alerts are Contract / project operational alerts.

### 4. Explicitly out of scope

- ML / AI / probabilistic / historical-behaviour engines.
- Extra forecasting signals beyond Accrued + elapsed time.
- Workspace capacity model and generic `CAPACITY_WARNING` / `CAPACITY_EXCEEDED`.
- Conflating `allocatedMinutes` with `monthlyContractedMinutes`.
- Inventing the WARNING threshold.

### 5. Dependencies

- R2-E01 Accrued Revenue (Forecast).
- Existing TimeEntry / Contract analytics (consumption, periods).
- Contract Time Allocation semantics (R2-OD-013).
- Residual Forecast arithmetic and WARNING threshold.

### 6. Domain objects affected

- Contract (`allocatedMinutes` concept).
- TimeEntry (consumption read).
- Derived Forecast Revenue.
- Alert / Notification (allocation).

### 7. Application services / capabilities affected

- Revenue / analytics read path for Forecast.
- Contract write path for `allocatedMinutes`.
- `AlertService` for allocation alerts once the threshold exists.

### 8. Persistence impact

- Confirmed: optional `allocatedMinutes` on Contract. **Not in current schema.** Conceptual name only.
- Forecast remains derived.
- WARNING threshold is configuration or a constant only after the Product Owner decides it.

### 9. Analytics / reporting impact

- Forecast is a current-period projection companion to Accrued.
- Allocation consumption may appear on contract / report surfaces.

### 10. Alerts / notifications impact

- New Contract allocation alerts only after the WARNING threshold is decided.
- No workspace capacity alerts.

### 11. Authorization / workspace isolation

- Same workspace-scoped Contract and TimeEntry rules as R1.
- Allocation alerts inherit existing Alert / Notification isolation.

### 12. E2E implications

- Forecast uses only Accrued and elapsed time once arithmetic is defined.
- Setting / clearing `allocatedMinutes` enables / disables allocation alerts.
- `monthlyContractedMinutes` utilization alerts remain a separate R1 mechanism.

### 13. Acceptance criteria

- Forecast is linear and deterministic; no ML.
- `allocatedMinutes` is optional and distinct from monthly capacity.
- Null allocation produces no allocation alert.
- Workspace isolation holds.

### 14. Product decisions still required

- Exact Forecast arithmetic (residual #2).
- Allocation WARNING threshold (residual #1).

### 15. Risks / architectural constraints

- Product vision §8 “historical behavior” is **not** adopted.
- Do not treat PD-106-001 workspace capacity as approved.
- Do not ship allocation WARNING with an invented percentage.

---

## R2-E05 — Advanced Reporting & Export

### 1. Objective

Extend operational reporting so revenue, invoice tracking, and payment status can be inspected and, if justified, exported as a simple table.

### 2. User value

Inspect R2 operational facts over existing period selection without building a second source of truth or a document generator.

### 3. In scope

- Advanced filtering on existing / R2 operational facts.
- Revenue / invoice / payment columns once those semantics are finalized.
- Simple tabular / CSV export **only if** planning shows low complexity and clear value (R2-OD-012 residual).
- Shared calculation services only.

### 4. Explicitly out of scope

- Core-R2 document / PDF / fiscal generation.
- Excel.
- Profitability, client scoring, commercial intelligence.
- Cross-currency totals (D7).
- Blocking E01–E03 until export is decided.

### 5. Dependencies

- R2-E01 for revenue reports.
- R2-E02 / R2-E03 if invoice / payment columns are included.
- Residual CSV decision.

### 6. Domain objects affected

- None as write model. Read models over TimeEntry, Contract, Invoice, Payment, derived revenue.

### 7. Application services / capabilities affected

- `ReportingService` / analytics read path.
- Optional export adapter if CSV is approved.

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
- Period parameters are view state, not tenant grants.

### 12. E2E implications

- Revenue / invoice / payment figures agree with the originating services.
- Per-currency separation.
- Export, if present, is tabular and non-fiscal.

### 13. Acceptance criteria

- Reporting remains a read model over shared services.
- No fiscal PDF exists.
- CSV exists only if explicitly approved during this epic’s planning.
- Workspace isolation holds.

### 14. Product decisions still required

- Whether simple CSV belongs in this epic (residual #5).

### 15. Risks / architectural constraints

- Do not let export pull document-generation architecture into the monolith.
- Do not wait to start E01–E03 on this epic.

---

## Cross-cutting (not a standalone epic)

| Topic | Handling |
| --- | --- |
| Rounding | APPROVED (R2-OD-002) — apply before any published money |
| DAILY accrued | APPROVED (R2-OD-001) |
| Commercial snapshot semantics | APPROVED; persistence is E01 dependency |
| Period closure | OUT OF R2 (R2-OD-014) |
| Audit ledger | OUT OF R2 (R2-OD-015) |
| Multi-currency | D7 + R2-OD-011; Invoice snapshot residual |
| Workspace isolation | Unchanged R1 rule for every new aggregate |

---

## Remaining product decisions

Do not implement these as assumptions.

1. Contract Time Allocation WARNING threshold.
2. Exact Forecast calculation semantics (elapsed time, full-period projection, elapsed = 0, Accrued = 0, historical periods).
3. Invoice currency snapshot representation.
4. Exact Invoice VOID behaviour and UI semantics.
5. Whether simple CSV export belongs in R2-E05.
6. Commercial snapshot persistence: CLOSED — TimeEntry `snapshotBillingModel` / `snapshotRate` / `snapshotCurrency`.
7. R2-OD-016 — APPROVED weighted-average daily rate (Accrued arithmetic in P-E01-02).
8. R2-OD-017 — CLOSED — existing TimeEntries backfilled from current Contract.

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

This document is the release-level planning baseline. R2-E01 detailed planning is complete (`docs/release/r2-e01-revenue-visibility.md`). It does not open implementation phases or invent commit hashes.

### Release-level

| Stage | R2 status |
| --- | --- |
| Vision | Complete — decision pack |
| Architecture | Complete as domain delta — `r2-architecture-delta.md` |
| Planning | This baseline. Detailed EPIC-2xx plans still required before implementation |
| Implementation | Not started |
| Engineering Review → Release | Not started. Do not mark R2 production-ready |

### Proposed small phases (planning labels only)

**R2-E01** — detailed plan: `docs/release/r2-e01-revenue-visibility.md`

| Phase | Intent | Status |
| --- | --- | --- |
| P-E01-00 | Planning / architecture freeze | COMPLETE |
| P-E01-01 | Persistence / domain foundation (class B snapshot; migration) | COMPLETE |
| P-E01-02 | Accrued Revenue | Not started |
| P-E01-03 | Expected Revenue | Not started |
| P-E01-04 | Integration with existing analytics / reporting | Not started |
| P-E01-05 | Engineering Review | Not started |
| P-E01-06 | QA | Not started |
| P-E01-07 | Documentation / Epic closure | Not started |

**R2-E02**

| Phase | Intent |
| --- | --- |
| E02-P00 | Detailed epic plan, including VOID UI and currency snapshot choice |
| E02-P01 | Invoice Tracking persistence + domain |
| E02-P02 | Application service, authorization, Contract currency guard |
| E02-P03 | Invoice Tracking UI |
| E02-P04 | Tests, documentation, Engineering Review |

**R2-E03**

| Phase | Intent |
| --- | --- |
| E03-P00 | Detailed epic plan |
| E03-P01 | Payment events + derived status |
| E03-P02 | Payment alerts via AlertService |
| E03-P03 | Payment UI |
| E03-P04 | Tests, documentation, Engineering Review |

**R2-E04**

| Phase | Intent |
| --- | --- |
| E04-P00 | Detailed epic plan; resolve Forecast arithmetic and WARNING threshold |
| E04-P01 | Forecast calculation on Accrued |
| E04-P02 | `allocatedMinutes` + consumption |
| E04-P03 | Allocation alerts (only after threshold exists) |
| E04-P04 | Surfaces, tests, documentation, Engineering Review |

**R2-E05**

| Phase | Intent |
| --- | --- |
| E05-P00 | Detailed epic plan; decide CSV |
| E05-P01 | Reporting extensions over finalized R2 facts |
| E05-P02 | Simple tabular export only if approved |
| E05-P03 | Tests, documentation, Engineering Review |

Release gates (QA, UX, Production Validation, Certification, Release) run after the implemented R2 scope is reviewable. They are not claimed here.

No EPIC-2xx number is assigned by this document.
