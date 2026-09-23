# R2-E04 — Forecasting & Contract Time Allocation — Epic Plan

**Epic:** R2-E04 — Forecasting & Contract Time Allocation  
**Release:** Release 2 — Revenue Operations  
**MASTER_PLAN identifier:** R2-E04 (`MASTER_PLAN.md` §19)  
**Status:** P-E04-05 COMPLETE — QA PASS WITH FINDINGS. Not certified.  
**Date:** 2026-09-24  
**Authority:** `docs/release/r2-decision-pack.md`  
**Companions:** `docs/release/r2-epic-map.md`, `docs/release/r2-architecture-delta.md`, `docs/release/r2-open-decisions.md`  
**Predecessors:** R2-E01 COMPLETE / RELEASE-READY. R2-E02 COMPLETE WITH NON-BLOCKING FINDING. R2-E03 CERTIFIED (`2ad1a1e1e032709bb5de7c228f083259ac5d5ecd`).  
**Does not assign:** an EPIC-2xx number  
**Does not authorize:** P-E04-06 Release Validation, P-E04-07 Certification, or production release

```text
P-E04-00  PLANNING / DECISION GATE                 COMPLETE — PO DECISIONS CLOSED
P-E04-01  PERSISTENCE / DOMAIN                     COMPLETE — ENGINEERING REVIEW APPROVED WITH FINDINGS
P-E04-02  APPLICATION / CALCULATIONS               COMPLETE — ENGINEERING REVIEW APPROVED WITH FINDINGS
P-E04-03  FORECAST / ALLOCATION INTEGRATION        COMPLETE — ENGINEERING REVIEW APPROVED WITH FINDINGS
P-E04-04  UI                                       COMPLETE — ENGINEERING REVIEW APPROVED WITH FINDINGS
P-E04-05  QA / DOCUMENTATION                       COMPLETE — QA PASS WITH FINDINGS
P-E04-06  RELEASE VALIDATION                       NOT STARTED / NOT AUTHORIZED
P-E04-07  CERTIFICATION                            NOT STARTED / NOT AUTHORIZED

R2-E04: P-E04-05 COMPLETE — NOT CERTIFIED
R2-E03: CERTIFIED
R2-E02: COMPLETE WITH NON-BLOCKING FINDING
R2-E01: COMPLETE / RELEASE-READY
R1: FROZEN / GRANTED
R2: NOT PRODUCTION-READY
```

---

## P-E04-00 verdict

**COMPLETE — PO DECISIONS CLOSED**

All seven blocking PO decisions are CLOSED — PO APPROVED. The resulting E04 contract is recorded below. Alert technical lifecycle is CLOSED as implementation detail (not a PO residual). This phase does not implement.

Implementation beyond persistence/domain is not authorized.

---

## P-E04-01 verdict

**COMPLETE** — Engineering Review **APPROVED WITH FINDINGS** (`3012b47`). Persistence / domain only.

| Item | Value |
| --- | --- |
| Schema | `Contract.allocatedMinutes Int?`. Null = no allocation. Zero is valid. |
| CHECK | `Contract_allocatedMinutes_non_negative`: `allocatedMinutes IS NULL OR allocatedMinutes >= 0` |
| Migration | `20260923230000_add_contract_allocated_minutes` |
| Domain | `ContractRecord.allocatedMinutes: number \| null`. Create/update input optional. |
| Repository | `createContract` / `updateContract` persist the field. Workspace scoped. Existing `lockContract`. |
| Application plumbing | `parseAllocatedMinutes` on the existing Contract write parser. |

The P-E04-01 form-omit write-surface finding is closed by P-E04-04.

---

## P-E04-02 verdict

**COMPLETE** — Engineering Review **APPROVED WITH FINDINGS** (`ca1b4cc`). Zero-allocation status was implementation-defined; closed by **E04-D-ALLOCATION-ZERO-STATUS / 8-C** before P-E04-03.

## P-E04-03 verdict

**COMPLETE** — Engineering Review **APPROVED WITH FINDINGS** (`7c4ad5d`). ReportingService publishes Forecast + contract allocations. `ALLOCATION_WARNING` / `ALLOCATION_EXCEEDED` reuse AlertService.

## P-E04-04 verdict

**COMPLETE** — Engineering Review **APPROVED WITH FINDINGS** (`ab68c84`). Contract form persists `allocatedMinutes`. Contract detail renders server allocation facts. Existing E01 revenue surfaces show Accrued + current-period Forecast.

## P-E04-05 verdict

**COMPLETE — QA PASS WITH FINDINGS.** Documentation synchronized. E04 is **not** certified. P-E04-06 is **not** authorized.

Accepted nonblocking findings remain: P-E04-02 consumption duplication / list efficiency / selected test gaps; P-E04-03 TimeEntry trigger unit omit `contractId` and allocation trigger coverage integration-only; P-E04-04 extra workspace-context load on Contract detail and optional E2E gaps (zero → positive; WARNING/EXCEEDED with actual consumption). Parallel `contracts` E2E timed out once under load and passed in isolation.

---

## 1. Source documents

| Document | Used for |
| --- | --- |
| `docs/release/r2-decision-pack.md` | D4, D7, R2-OD-001…005, R2-OD-013 |
| `docs/release/r2-open-decisions.md` | Residual #1 WARNING threshold; residual #2 Forecast arithmetic |
| `docs/release/r2-architecture-delta.md` | `allocatedMinutes` CONFIRMED REQUIREMENT; Forecast derived |
| `docs/release/r2-epic-map.md` | E04 envelope, non-goals, phase labels |
| `docs/release/r2-e01-revenue-visibility.md` | Certified Accrued / Expected; reused periods |
| `docs/release/r2-e02-invoice-tracking.md` | Invoice independence |
| `docs/release/r2-e03-payment-tracking.md` | Payment independence; AlertService reuse |
| `MASTER_PLAN.md` §19 | R2 scope pointer |
| `docs/product-vision.md` §8 | Forecast deferred from MVP; R2 linear direction |
| `docs/domain-model.md` §2, §7.3, §9, §10 | Allocation vs monthly capacity; utilization; alerts |
| `docs/architecture.md` | Shared analytics; planned allocation alerts |
| `prisma/schema.prisma` | `allocatedMinutes Int?` on Contract (P-E04-01). TimeEntry / Invoice / Payment / Alert unchanged |
| `src/application/analytics/*` | Accrued / Expected / pro-rata owners |
| `src/lib/analytics-periods.ts` | Timezone / current / historical periods |
| `src/application/alerts/alert-service.ts` | CONTRACT_* / PAYMENT_* / ALLOCATION_WARNING / ALLOCATION_EXCEEDED |

Where a historical R1 document and the decision pack disagree, the decision pack wins for R2 meaning. Certified E01/E02/E03 contracts are immutable here.

---

## 2. Repository / Git state (inspection)

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `2ad1a1e1e032709bb5de7c228f083259ac5d5ecd` |
| HEAD subject | `chore(r2-e03): certify payment tracking` |
| Working tree at inspection | planning artifacts only; no `src/` / Prisma change |
| Migrations present | foundation → TimeEntry snapshot → Invoice → Payment → payment alerts |
| `allocatedMinutes` in schema | **present** (`Int?`, P-E04-01) |
| Forecast code | **present** (P-E04-02+). Derived. Current certified period only |
| Accrued / Expected / Forecast UI | published on Dashboard, Reports, Annual Overview (P-E04-04) |
| Migrations | `20260923230000_add_contract_allocated_minutes`; `20260923235000_add_allocation_alerts` |

P-E04-00 inspection was planning-only. P-E04-01…P-E04-04 implemented persistence, calculations, reporting, alerts, and UI.

---

## 3. Recovered E04 product contract

Legend: **FACT** = repository text. **CLOSED** = PO approved in this phase. **IMPLIED** = follows a certified or closed contract.

### A. Forecasting

| Claim | Class |
| --- | --- |
| Forecast is **Forecast Revenue** | FACT — D4 |
| Deterministic linear projection of Accrued using elapsed time in the current reporting period | FACT — D4 / R2-OD-005 / E04-D-FORECAST-ARITHMETIC |
| `Forecast = Accrued / elapsedFraction`; `elapsedFraction = elapsedPeriod / totalPeriod` | **CLOSED** — E04-D-FORECAST-ARITHMETIC |
| `elapsedPeriod` includes today | **CLOSED** |
| `elapsedPeriod = 0` ⇒ Forecast = 0 | **CLOSED** |
| Accrued = 0 ⇒ Forecast = 0 | **CLOSED** |
| No Forecast for historical / custom periods | **CLOSED** |
| Independent of Invoice and Payment | FACT — D4 |
| Invoice, Payment, Expected, Allocation are not Forecast inputs | **CLOSED** — E04-D-FORECAST-INPUTS |
| No ML / AI / historical-behaviour / extra signals | FACT — D4 |
| Derived; not persisted | FACT — architecture-delta §5 |
| Hours / capacity are not Forecast | FACT — D4 |

### B. Contract Time Allocation

| Claim | Class |
| --- | --- |
| Optional Contract-level **total** time budget `allocatedMinutes` | FACT — R2-OD-013 |
| Integer minutes. Manually editable. Distinct from `monthlyContractedMinutes` | FACT / **CLOSED** |
| One Contract-level value. No allocation table. No allocation snapshot | FACT / **CLOSED** |
| No persisted consumption / remaining | **CLOSED** |
| No allocation when `allocatedMinutes` is null | FACT — R2-OD-013 |
| Consumption = `SUM(TimeEntry.minutes)` for the Contract inside `[validFrom, validTo)` | **CLOSED** — E04-D-CONSUMPTION-* |
| All TimeEntries count. No billable-only filter. No new billability concept | **CLOSED** — E04-D-CONSUMPTION-NUMERATOR |
| Out-of-validity TimeEntries do not consume allocation; records stay untouched | **CLOSED** — E04-D-OUT-OF-VALIDITY-CONSUMPTION |
| `remaining = max(allocatedMinutes - consumption, 0)` when allocation is present | **CLOSED** |
| `<80%` no alert; `>=80%` and `<=100%` WARNING; `>100%` EXCEEDED | **CLOSED** — E04-D-ALLOCATION-WARNING / EXCEEDED |
| Exactly 100% is WARNING, not EXCEEDED | **CLOSED** |
| Null allocation ⇒ no allocation status / alert | **CLOSED** |

### C. TimeEntry consumption (certified, reused)

| Claim | Class |
| --- | --- |
| Duration integer minutes; explicit `contractId`; workspace-scoped | FACT — R1 / E01 |
| Validity `[validFrom, validTo)` at create | FACT |
| Historical out-of-validity TimeEntries retained and flagged (PD-105-006) | FACT — reporting / utilization. **Not** the allocation numerator |
| Utilization numerator = all minutes (PD-104-002) | FACT — monthly utilization. Allocation reuses the all-minutes numerator by PO close, not by silent reuse |
| Accrued numerator = billable only (BR-007) | FACT — revenue. Not the allocation numerator |

### D–J. Other required classifications

| Topic | Class |
| --- | --- |
| Contract validity | FACT — unchanged `[validFrom, validTo)` |
| Billing model HOURLY / DAILY | FACT — unchanged. Allocation unit is minutes for both. No `1 day = N hours` |
| Accrued | FACT — certified E01. Forecast input. Unchanged |
| Expected | FACT — certified E01 HOURLY pro-rata; DAILY null. Not a Forecast input. Unchanged |
| Capacity / allocation | FACT — `monthlyContractedMinutes` = recurring monthly capacity. `allocatedMinutes` = total project budget. Workspace capacity alerts out of R2 |
| Reporting / export | **CLOSED** — Forecast beside Accrued on existing E01 revenue surfaces. E05 owns CSV. No E01/E02 redesign |

---

## 4. Forecasting semantics

```text
TimeEntry + commercial snapshot  → Accrued Revenue
Accrued + elapsed time           → Forecast Revenue (linear, current reporting period)
```

```text
Forecast Revenue = Accrued / elapsedFraction
elapsedFraction  = elapsedPeriod / totalPeriod
```

- Period = the existing certified **current** period.
- `Workspace.timezone` is period-boundary authority.
- `elapsedPeriod` includes today.
- `elapsedPeriod = 0` ⇒ Forecast = 0.
- Accrued = 0 ⇒ Forecast = 0.
- No Forecast for historical or custom periods.
- No ML or additional signals.
- Forecast is derived, not persisted.
- Invoice, Payment, Expected, and Allocation are not inputs.

**Accepted consequence of reusing the certified current period:** when that period already ends today (PD-105-002), `elapsedPeriod = totalPeriod`, `elapsedFraction = 1`, and Forecast = Accrued (unless Accrued = 0 or `elapsedPeriod` = 0). Do not invent a natural calendar end. Do not introduce a second temporal model.

**Authority / persistence**

- Authoritative calculation: deterministic application/domain arithmetic over Accrued.
- Derived at read time.
- No Forecast snapshot table.

| Case | Answer |
| --- | --- |
| Invoice / Payment exist | Ignored |
| Allocation missing or present | Ignored |
| Contract expired mid-period | Accrued follows E01. Forecast uses Accrued and the current-period fraction |
| HOURLY vs DAILY | Forecast is of Accrued. Accrued already applies R2-OD-001 / D4. No distinct DAILY Forecast formula |
| Mixed currency | Per-currency, no FX (D7). Forecast per Accrued currency |
| Historical month / custom range | No Forecast |

---

## 5. Contract Time Allocation semantics

```text
monthlyContractedMinutes = recurring contractual capacity
allocatedMinutes         = optional total project / Contract time budget
```

- Optional. Null = no allocation and no allocation status / alert.
- Manual create/update on Contract.
- Conceptual persistence: optional integer minutes on Contract. **Not in current schema.**
- Distinct from utilization alerts (`CONTRACT_WARNING` / `CONTRACT_EXCEEDED` on monthly capacity).
- Not a period allocation. No allocation table. No allocation snapshot.
- Consumption, remaining, and status are derived. Do not persist them.

```text
consumption = SUM(TimeEntry.minutes)
              for the Contract
              where TimeEntry.workDate is within [validFrom, validTo)
```

All TimeEntries count. No billable-only filter. Do not introduce a new billability concept.

TimeEntries outside `[validFrom, validTo)`:

- do not contribute to allocation consumption
- remain existing records
- are not modified
- are not invalidated
- do not receive a new TimeEntry validation error from E04

```text
remaining = max(allocatedMinutes - consumption, 0)
            when allocatedMinutes != null
```

**Allocation status (do not invent a different model)**

| Condition | Status / alert |
| --- | --- |
| `allocatedMinutes` is null | no allocation status / alert |
| consumption / allocation `< 80%` | normal / no allocation alert |
| `>= 80%` and `<= 100%` | WARNING |
| `> 100%` | EXCEEDED |
| exactly 100% | WARNING, not EXCEEDED |

**Does not affect**

Accrued, Expected, Forecast inputs, Invoice, Payment, FX, billing rates.

Integer minutes bounds follow the existing Contract minutes family in P-E04-01. Do not invent a zero-denominator product rule in this phase.

---

## 6. HOURLY vs DAILY

| Concern | Status |
| --- | --- |
| Accrued HOURLY / DAILY | Certified E01. Unchanged |
| Expected DAILY | Null in R2. Unchanged |
| Forecast | Based on Accrued. No distinct DAILY Forecast formula |
| `1 day = N hours` | **Not defined.** Do not invent |
| Allocation unit | Minutes for both billing models |

---

## 7. Temporal semantics

**Do not introduce a second temporal model.**

Reuse only:

| Rule | Authority |
| --- | --- |
| `Workspace.timezone` is period-boundary authority | PD-105-003 |
| Current month/week/year end **through today** | PD-104-003 / PD-105-002 |
| Historical month = full calendar month | `getMonthPeriod` |
| Contract validity `[validFrom, validTo)` | Domain / EPIC-102 |
| TimeEntry `workDate` is a calendar date | EPIC-103 |
| Invoice `invoiceDate` / `dueDate`; Payment `paymentDate` | E02 / E03 — **not Forecast inputs** |
| Alert “today” | `Workspace.timezone` |

Forecast uses the existing current-period constructors. Allocation consumption uses Contract validity and `workDate`. No extra clock, period-end, or billable-day model.

---

## 8. Proposed domain / data model

| Candidate | Verdict |
| --- | --- |
| A. New persistence aggregate | Not required |
| B. Extension of Contract | **Confirmed:** optional `allocatedMinutes`. Implemented in P-E04-01 |
| C. Extension of analytics read model | Required for Forecast + allocation consumption (derived) |
| D. Derived read model only | Forecast, remaining, consumption, allocation status |
| E. Period allocation table | Forbidden |
| F. Forecast snapshot | Not justified |
| G. No new persistence | Insufficient: `allocatedMinutes` is a confirmed write-model field and is absent |

Implemented in P-E04-01:

- Nullable integer minutes on Contract, workspace-scoped, same family as `monthlyContractedMinutes`.
- No allocation history table.
- No persisted remaining / forecast / consumption totals.
- Prisma name remains an implementation detail.

---

## 9. Architecture impact

```text
Domain
  → Application Services
  → Repositories
  → Infrastructure
  → UI
```

Expected increment:

```text
Domain types (Forecast, allocation consumption / status)
  → AnalyticsService (Forecast + allocation consumption)
  → Contract application service (allocatedMinutes write)
  → ContractRepository (persist optional field)
  → AlertService (allocation alerts only after P-E04-02 predicates exist)
  → ReportingService (thin publish, no new formula)
  → UI (Contract write; existing revenue surfaces)
```

Reuse: `WorkspaceContext`, membership guard, `runInTransaction`, `lockContract`, overlap exclusion, `analytics-periods`, `publishMonetaryAmount`, existing AlertService infrastructure, existing error types, existing derived analytics utilities.

Do **not**: new RevenueService, new forecast framework, Prisma from UI/Server Actions, business logic in React, business logic in Server Actions, Prisma business logic.

---

## 10. Concurrency / invariants

| Write | Invariant | Strategy |
| --- | --- | --- |
| Contract `allocatedMinutes` | Workspace isolation; optional null; integer minutes bounds (existing minutes max family) | Existing `updateContract` + `lockContract`. No new overlap rule |
| TimeEntry C/U/D | Existing validity / snapshot / alert trigger | Unchanged. Allocation alerts evaluate on TimeEntry write and allocation write |
| Forecast | Read-only derived | No write invariant |
| Forecast configuration | **Not specified.** No config entity | None |

No new concurrent write invariant beyond existing Contract update. Do not introduce global Serializable transactions.

---

## 11. Alerts impact

**Product (CLOSED)**

- Allocation alerts are in E04 scope.
- None when `allocatedMinutes` is null.
- Predicates: `<80%` none; `>=80%` and `<=100%` WARNING; `>100%` EXCEEDED.
- Not workspace `CAPACITY_*`.
- `CONTRACT_WARNING` / `CONTRACT_EXCEEDED` remain monthly-capacity alerts. Do not reuse them as allocation alerts.
- `PAYMENT_*` unchanged. Do not silently reuse PAYMENT_* semantics.

**Technical lifecycle (CLOSED — implementation detail, not PO)**

See §17 E04-D-ALERT-*. Alert implementation stays in P-E04-03. This phase does not implement alerts.

---

## 12. Reporting / analytics impact

| Surface | Today | E04 |
| --- | --- | --- |
| `AnalyticsService.getAccruedRevenue` | Certified | Forecast input. Unchanged formula |
| `AnalyticsService.getExpectedRevenue` | Certified | Unchanged. Not a Forecast input |
| Existing E01 revenue DTOs / surfaces | Accrued + Expected on DTO; money **not rendered** | Publish Accrued + Forecast on those same surfaces when the period is the current period |
| Dashboard / Analytics / Reports | Reuse existing revenue surfaces | No dedicated Forecast page. No E01/E02 redesign. No new revenue framework |
| `ReportingService` | Thin publisher; “No Forecast” | Publish Forecast / allocation after formulas exist. No new formula |
| Contract detail | No allocation | Allocation, consumption, remaining, allocation status |
| E05 | Trailing | Must consume E04 outputs; no formula duplication |

---

## 13. UI scope (not CSS)

**CLOSED — E04-D-UI-REVENUE-SURFACE**

| Screen | Actions | R/W |
| --- | --- | --- |
| Contract create / edit / detail | Set / clear allocation; view consumption, remaining, allocation status | W / R |
| Existing E01 revenue surfaces (dashboard / analytics / reports) | Accrued + Forecast where those surfaces already expose the revenue metrics | R |
| Alerts | Allocation alerts after P-E04-03 | R |

Permissions: existing workspace membership. OBD-009 unchanged.

Empty: null allocation → no allocation status / remaining % / allocation alert.  
Error: existing Contract / analytics errors.  
VOID: Invoice VOID only. Contracts have no VOID/archive.  
Expired: validity unchanged; consumption uses `[validFrom, validTo)` only.

No dedicated Forecast page. No E01/E02 redesign.

---

## 14. Security / workspace isolation

E04 must not:

- read another workspace’s Contract or TimeEntry
- allocate against another workspace’s Contract
- forecast across workspaces
- leak money/time through unscope aggregates

Required: every repository query includes `workspaceId`. Composite Contract uniqueness `@@unique([workspaceId, id])` remains. Resource ids are not tenant grants. Membership guard on AnalyticsService / Contract writes / AlertService unchanged.

---

## 15. Performance

No premature indexes beyond the write/read shapes already implied.

| Pattern | Shape |
| --- | --- |
| Contract allocation read | Single Contract row |
| Consumption | TimeEntry grouped by `workspaceId`, `contractId`, `workDate` inside `[validFrom, validTo)` |
| Forecast | Accrued (already computed) + elapsed arithmetic. No extra scan if Accrued is reused |
| Dashboard / reports | Same period queries as E01 |

New index only if validity-window aggregation proves existing indexes insufficient. Measure later.

---

## 16. Test strategy (no tests in P-E04-00)

**Unit:** Forecast arithmetic; current-period only; elapsed=0; Accrued=0; historical/custom omitted; allocation consumption inside validity; out-of-validity excluded; all minutes; null allocation; 79.99 / 80 / 100 / 100+; remaining floor at 0; HOURLY/DAILY Accrued reuse.

**Integration:** Contract `allocatedMinutes` persist / update / null; workspace isolation; TimeEntry relation; no Forecast/remaining persistence.

**E2E:** allocation set/clear; Forecast beside Accrued on existing revenue surfaces; Contract allocation read; existing dashboard / reports / contract journeys.

**Regression (must stay green):**

- E01 Accrued / Expected (`tests/unit/application/analytics/accrued-revenue.test.ts`, `expected-revenue.test.ts`, integration twins)
- E02 Invoice
- E03 Payment / payment alerts
- R1 utilization / CONTRACT_* alerts / periods / TimeEntry validity

---

## 17. E04 decision register

### E04-D-FORECAST-ARITHMETIC

**Question:** Exact linear Forecast arithmetic.  
**Decision:** Forecast Revenue = Accrued / elapsedFraction. elapsedFraction = elapsedPeriod / totalPeriod. Use the existing certified current period and `Workspace.timezone`. elapsedPeriod includes today. elapsedPeriod = 0 ⇒ Forecast = 0. Accrued = 0 ⇒ Forecast = 0. No Forecast for historical / custom periods. No ML or extra signals. Derived, not persisted. Invoice, Payment, Expected, Allocation are not inputs.  
**Status:** **CLOSED — PO APPROVED** (closes R2-OD-005)

### E04-D-ALLOCATION-WARNING

**Question:** Consumption / allocation WARNING ratio.  
**Decision:** WARNING threshold = 80%. consumption < 80% ⇒ no allocation alert. 80% <= consumption <= 100% ⇒ WARNING.  
**Status:** **CLOSED — PO APPROVED** (closes R2-OD-013 residual)

### E04-D-ALLOCATION-EXCEEDED

**Question:** Does EXCEEDED exist, and at what ratio?  
**Decision:** EXCEEDED exists. EXCEEDED only when consumption > allocatedMinutes. Exactly 100% is not EXCEEDED.  
**Status:** **CLOSED — PO APPROVED**

### E04-D-CONSUMPTION-NUMERATOR

**Question:** Which TimeEntries consume `allocatedMinutes`?  
**Decision:** consumption = SUM(TimeEntry.minutes). All TimeEntries count. No billable-only filter. Do not introduce a new billability concept.  
**Status:** **CLOSED — PO APPROVED**

### E04-D-CONSUMPTION-WINDOW

**Question:** Over what time window is consumption summed?  
**Decision:** Consumption window = Contract validity. Use existing `[validFrom, validTo)` semantics.  
**Status:** **CLOSED — PO APPROVED**

### E04-D-OUT-OF-VALIDITY-CONSUMPTION

**Question:** Do TimeEntries outside `[validFrom, validTo)` count?  
**Decision:** They do not contribute to allocation consumption. Existing TimeEntry records remain, are not modified, and are not invalidated. E04 introduces no new TimeEntry validation error.  
**Status:** **CLOSED — PO APPROVED**

### E04-D-UI-REVENUE-SURFACE

**Question:** Where is Forecast / allocation shown?  
**Decision:** Contract detail: allocation, consumption, remaining, allocation status. Existing E01 revenue surfaces: Accrued + Forecast where those DTOs / surfaces already expose the metrics. Dashboard / Analytics / Reports reuse existing revenue surfaces. No dedicated Forecast page. No E01/E02 redesign. No new revenue framework.  
**Status:** **CLOSED — PO APPROVED**

### E04-D-ALERT-TYPES

**Question:** Allocation alert type names.  
**Decision:** New `AlertType` values `ALLOCATION_WARNING` and `ALLOCATION_EXCEEDED`. Do not reuse `CONTRACT_*`, `PAYMENT_*`, or `CAPACITY_*`.  
**Status:** **CLOSED — TECHNICAL**

### E04-D-ALERT-SEVERITY

**Question:** Severity mapping.  
**Decision:** `ALLOCATION_WARNING` = `WARNING`. `ALLOCATION_EXCEEDED` = `ERROR`. This follows the R1 contract-utilization severity family, not PAYMENT_*.  
**Status:** **CLOSED — TECHNICAL**

### E04-D-ALERT-SHAPE

**Question:** Identity, deduplication, contract identity.  
**Decision:** Allocation alerts are Contract-level, not period-based and not invoice-based. `Alert.contractId` is required. `Alert.invoiceId` is null. `periodStart` / `periodEnd` are unused. Dedup uniqueness remains `(workspaceId, deduplicationKey)`. Semantic identity = `workspaceId` + `contractId` + `type` + `resolvedAt IS NULL`. Dedup key family is allocation-specific (`aw:` / `ae:` + workspace + contract), not `cw`/`ce` and not PAYMENT_* keys.  
**Status:** **CLOSED — TECHNICAL**

### E04-D-ALERT-TRIGGER

**Question:** Evaluation triggers.  
**Decision:** On-write. No scheduler. Evaluate on TimeEntry create / update / delete, and on Contract `allocatedMinutes` set / update / clear, and on Contract validity writes that change `[validFrom, validTo)`. Do not evaluate on Invoice or Payment writes. Do not attach to VOID. Do not reuse E03-D-ALERT-TRIGGER.  
**Status:** **CLOSED — TECHNICAL**

### E04-D-ALERT-LIFECYCLE

**Question:** Resolution, retrigger, exclusive states.  
**Decision:** Product buckets are mutually exclusive. Null allocation resolves any active `ALLOCATION_*` for that Contract. `<80%` resolves both. `>=80%` and `<=100%` keeps `ALLOCATION_WARNING` and resolves `ALLOCATION_EXCEEDED`. `>100%` keeps `ALLOCATION_EXCEEDED` and resolves `ALLOCATION_WARNING`. Retrigger uses existing AlertService retrigger-suffix behaviour when a resolved condition becomes true again. Do not keep WARNING and EXCEEDED active together (unlike monthly `CONTRACT_*`).  
**Status:** **CLOSED — TECHNICAL**

### E04-D-ALLOCATION-ZERO-STATUS

**Question:** Status and alert semantics when `allocatedMinutes = 0`.  
**Decision (8-C — PO APPROVED):** Zero allocation has no status and no allocation alert, regardless of consumption. Do not generate WARNING or EXCEEDED. Do not divide by zero. Null allocation remains no status / no alert. A transition from a positive allocation to zero or null resolves any active `ALLOCATION_*` and creates nothing. Status bands apply only when `allocatedMinutes > 0`.  
**Status:** **CLOSED — PO APPROVED — 8-C**

### Previously closed / not new PO decisions

| ID | Status | Note |
| --- | --- | --- |
| E04-D-FORECAST-KIND | CLOSED | Forecast Revenue, not hours/capacity (D4) |
| E04-D-FORECAST-INPUTS | CLOSED | Accrued + elapsed only |
| E04-D-FORECAST-PERSISTENCE | CLOSED | Derived |
| E04-D-ALLOCATION-FIELD | CLOSED | Optional Contract-level `allocatedMinutes`; editable; ≠ monthly capacity |
| E04-D-ALLOCATION-UNIT | CLOSED | Minutes. No `1 day = N hours` |
| E04-D-NO-WORKSPACE-CAPACITY | CLOSED | Out of R2 |
| E04-D-NULL-ALLOCATION-ALERT | CLOSED | No allocation alert when null |
| E04-D-NO-PERIOD-TABLE | CLOSED | Not specified; do not invent |
| E04-D-NO-NEW-SERIALIZABLE | CLOSED | No new write invariant requiring it |
| E04-D-TEMPORAL-REUSE | CLOSED | Reuse `Workspace.timezone` + existing period constructors |

---

## 18. Proposed phase plan

| Phase | Objective | Depends | Artifacts | Test gate | Commit | Blockers |
| --- | --- | --- | --- | --- | --- | --- |
| P-E04-00 | Planning / decision gate | E01 Accrued; E03 certified | This document | None | `docs(r2-e04): close PO decisions` | — |
| P-E04-01 | Persistence / domain: optional Contract minutes field | Closed field shape | Prisma + domain types. **No** Forecast formula | Isolation / null / bounds | `3012b47` | Engineering Review APPROVED WITH FINDINGS |
| P-E04-02 | Application calculations | Closed Forecast + consumption | AnalyticsService Forecast + consumption / status | Unit formulas | `ca1b4cc` | Engineering Review APPROVED WITH FINDINGS |
| P-E04-03 | Integration: reporting publish + allocation alerts | P-E04-02; E04-D-ALERT-*; 8-C | ReportingService; AlertService allocation types | Integration + isolation | `7c4ad5d` | Engineering Review APPROVED WITH FINDINGS |
| P-E04-04 | UI | Closed UI surface; write path | Contract form; existing revenue surfaces | E2E | `ab68c84` | Engineering Review APPROVED WITH FINDINGS |
| P-E04-05 | QA / documentation | P-E04-04 | Sync docs to implemented behavior | QA | this P-E04-05 commit | — |
| P-E04-06 | Release validation | P-E04-05 | Validation record | Gate | TBD | — |
| P-E04-07 | Certification | P-E04-06 | Certification | — | TBD | PO release later |

P-E04-00…P-E04-05 are **COMPLETE**. E04 is **not** certified. P-E04-06 is **not** authorized.

---

## 19. Critical path

**NO REMAINING PO BLOCKERS**

**NON-BLOCKING / TECHNICAL (closed in §17; implement later)**

- Prisma column name
- Alert types / severity / shape / trigger / lifecycle (E04-D-ALERT-*)
- Index later if validity-window consumption needs it

---

## 20. Closed PO decisions

1. **E04-D-FORECAST-ARITHMETIC** (R2-OD-005) — CLOSED — PO APPROVED.
2. **E04-D-ALLOCATION-WARNING** (R2-OD-013 residual) — CLOSED — PO APPROVED.
3. **E04-D-ALLOCATION-EXCEEDED** — CLOSED — PO APPROVED.
4. **E04-D-CONSUMPTION-NUMERATOR** — CLOSED — PO APPROVED.
5. **E04-D-CONSUMPTION-WINDOW** — CLOSED — PO APPROVED.
6. **E04-D-OUT-OF-VALIDITY-CONSUMPTION** — CLOSED — PO APPROVED.
7. **E04-D-UI-REVENUE-SURFACE** — CLOSED — PO APPROVED.
8. **E04-D-ALLOCATION-ZERO-STATUS** — CLOSED — PO APPROVED — 8-C.

P-E04-00 closed the original seven. 8-C closed zero-allocation status after the P-E04-02 Engineering Review.

---

## 21. Recommendation for next phase

Stop. Do **not** start P-E04-06 or P-E04-07 in this chat.

Next gate is P-E04-06 Release Validation. E04 remains **NOT CERTIFIED**.

R2 remains not production-ready. E05 remains unplanned.
