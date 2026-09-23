# R2-E04 — Forecasting & Contract Time Allocation — Epic Plan

**Epic:** R2-E04 — Forecasting & Contract Time Allocation  
**Release:** Release 2 — Revenue Operations  
**MASTER_PLAN identifier:** R2-E04 (`MASTER_PLAN.md` §19)  
**Status:** P-E04-00 COMPLETE — **BLOCKED — PO DECISIONS REQUIRED**  
**Date:** 2026-09-23  
**Authority:** `docs/release/r2-decision-pack.md`  
**Companions:** `docs/release/r2-epic-map.md`, `docs/release/r2-architecture-delta.md`, `docs/release/r2-open-decisions.md`  
**Predecessors:** R2-E01 COMPLETE / RELEASE-READY. R2-E02 COMPLETE WITH NON-BLOCKING FINDING. R2-E03 CERTIFIED (`2ad1a1e1e032709bb5de7c228f083259ac5d5ecd`).  
**Does not assign:** an EPIC-2xx number  
**Does not authorize:** P-E04-01, `src/` changes, Prisma changes, migrations, services, UI, or routes

```text
P-E04-00  PLANNING / DECISION GATE                 COMPLETE — BLOCKED — PO DECISIONS REQUIRED
P-E04-01  PERSISTENCE / DOMAIN                     NOT STARTED / NOT AUTHORIZED
P-E04-02  APPLICATION / CALCULATIONS               NOT STARTED / NOT AUTHORIZED
P-E04-03  FORECAST / ALLOCATION INTEGRATION        NOT STARTED / NOT AUTHORIZED
P-E04-04  UI                                       NOT STARTED / NOT AUTHORIZED
P-E04-05  QA / DOCUMENTATION                       NOT STARTED / NOT AUTHORIZED
P-E04-06  RELEASE VALIDATION                       NOT STARTED / NOT AUTHORIZED
P-E04-07  CERTIFICATION                            NOT STARTED / NOT AUTHORIZED

R2-E04: BLOCKED — PO DECISIONS REQUIRED
R2-E03: CERTIFIED
R2-E02: COMPLETE WITH NON-BLOCKING FINDING
R2-E01: COMPLETE / RELEASE-READY
R1: FROZEN / GRANTED
R2: NOT PRODUCTION-READY
```

---

## P-E04-00 verdict

**BLOCKED — PO DECISIONS REQUIRED**

Architecture and product planning recovered the certified E01/E02/E03 contracts and the approved E04 direction. Residual product arithmetic and allocation predicates are not closed. This phase does not invent them.

Implementation is not authorized.

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
| `prisma/schema.prisma` | No `allocatedMinutes`. Contract / TimeEntry / Invoice / Payment / Alert as certified |
| `src/application/analytics/*` | Accrued / Expected / pro-rata owners |
| `src/lib/analytics-periods.ts` | Timezone / current / historical periods |
| `src/application/alerts/alert-service.ts` | CONTRACT_* / PAYMENT_*; no allocation types |

Where a historical R1 document and the decision pack disagree, the decision pack wins for R2 meaning. Certified E01/E02/E03 contracts are immutable here.

---

## 2. Repository / Git state (inspection)

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `2ad1a1e1e032709bb5de7c228f083259ac5d5ecd` |
| HEAD subject | `chore(r2-e03): certify payment tracking` |
| Working tree at inspection | clean; identical to E03 certification |
| Diff vs certification | empty |
| Migrations present | foundation → TimeEntry snapshot → Invoice → Payment → payment alerts |
| `allocatedMinutes` in schema | **absent** |
| Forecast code | **absent**. `ReportingService` non-goal: “No Forecast” |
| Accrued / Expected code | present; dashboard / reports **do not render money** |

Inspection did not change `src/` or `prisma/`.

---

## 3. Recovered E04 product contract

Legend: **FACT** = repository text. **IMPLIED** = follows a certified contract; not a new decision. **OPEN** = unanswered.

### A. Forecasting

| Claim | Class |
| --- | --- |
| Forecast is **Forecast Revenue** | FACT — D4 |
| Deterministic linear projection of Accrued using elapsed time in the current reporting period | FACT — D4 / R2-OD-005 direction / product-vision §8 |
| Independent of Invoice and Payment | FACT — D4 |
| No ML / AI / historical-behaviour / extra signals | FACT — D4 / epic-map E04 out of scope |
| Derived; not persisted | FACT — architecture-delta §5 |
| Exact arithmetic (elapsed, full-period projection, elapsed = 0, Accrued = 0, historical periods) | **OPEN** — R2-OD-005 / E04-D-FORECAST-ARITHMETIC |
| Whether Forecast is hours, capacity, or a mix | FACT — revenue only. Hours/capacity are not Forecast |
| Authoritative input | FACT — Accrued + elapsed time. Expected / allocation / Invoice / Payment are not inputs |
| E01 line “Forecast consumes Accrued / Expected” | FACT as E01 wording. **Not** adopted. D4 / R2-OD-005 / epic-map extra-signal exclusion win |

### B. Contract Time Allocation

| Claim | Class |
| --- | --- |
| Optional Contract-level **total** time budget `allocatedMinutes` | FACT — R2-OD-013 |
| Manually configurable and editable | FACT — R2-OD-013 |
| Distinct from `monthlyContractedMinutes` | FACT — R2-OD-013 |
| Unit is minutes | FACT — name + existing Contract minutes persistence |
| One Contract-level value, not a period table | FACT — “Contract-level total”; architecture-delta: no new Contract entity; conceptual field on Contract |
| TimeEntry consumption compared against `allocatedMinutes` | FACT — R2-OD-013 |
| No allocation alert when `allocatedMinutes` is null | FACT — R2-OD-013 |
| Allocation alerts are Contract / project operational alerts | FACT — R2-OD-013 |
| WARNING threshold | **OPEN** — R2-OD-013 residual / E04-D-ALLOCATION-WARNING |
| EXCEEDED at 100% | **OPEN** — register says “not assumed” / E04-D-ALLOCATION-EXCEEDED |
| Which TimeEntries count (all vs billable) | **OPEN** — E04-D-CONSUMPTION-NUMERATOR |
| Consumption window (lifetime vs reporting period vs validity overlap) | **OPEN** — E04-D-CONSUMPTION-WINDOW |
| Out-of-validity TimeEntries in consumption | **OPEN** — E04-D-OUT-OF-VALIDITY-CONSUMPTION |
| Remaining / overrun persisted | IMPLIED — derived preferred; no persist-aggregates rule (E03) |
| Historical allocation snapshot / immutability | IMPLIED — field is editable; no snapshot required. Same live-read pattern as `monthlyContractedMinutes` |
| Recurring / multiple allocation periods | FACT — not specified. Do not invent a period table |
| Affects Forecast | FACT — no. Extra signals out of scope |
| Affects Accrued / Expected / Invoice / Payment / billing | IMPLIED — D4 independence. Allocation is a time budget, not a commercial rate |

### C. TimeEntry consumption (certified, reused)

| Claim | Class |
| --- | --- |
| Duration integer minutes; explicit `contractId`; workspace-scoped | FACT — R1 / E01 |
| Validity `[validFrom, validTo)` at create | FACT |
| Historical out-of-validity TimeEntries retained and flagged (PD-105-006) | FACT — reporting / utilization. **Not** automatically the allocation rule |
| Utilization numerator = all minutes, no billable filter (PD-104-002) | FACT — monthly utilization. **Not** automatically the allocation rule |
| Accrued numerator = billable only (BR-007) | FACT — revenue. **Not** automatically the allocation rule |

### D–J. Other required classifications

| Topic | Class |
| --- | --- |
| Contract validity | FACT — unchanged `[validFrom, validTo)` |
| Billing model HOURLY / DAILY | FACT — unchanged. Accrued already distinct. Allocation unit is minutes for both |
| Accrued | FACT — certified E01. Forecast input. Unchanged |
| Expected | FACT — certified E01 HOURLY pro-rata; DAILY null. Not a Forecast input |
| Capacity / allocation | FACT — `monthlyContractedMinutes` = recurring monthly capacity. `allocatedMinutes` = total project budget. Workspace capacity alerts out of R2 |
| Reporting / export | FACT — Forecast companion to Accrued; allocation may appear on contract / report. E05 owns CSV. Do not redesign E01/E02 reporting |

---

## 4. Forecasting semantics

**FACT — meaning**

```text
TimeEntry + commercial snapshot  → Accrued Revenue
Accrued + elapsed time           → Forecast Revenue (linear, current reporting period)
```

Forecast is a current-period **revenue** projection companion to Accrued. It is not hours, not capacity, not Expected, not Invoice, not Payment.

**FACT — authority / persistence**

- Authoritative calculation: deterministic application/domain arithmetic over Accrued.
- Derived at read time.
- No Forecast snapshot table unless a later plan proves need. None is justified now.

**OPEN — R2-OD-005 / E04-D-FORECAST-ARITHMETIC must define**

1. What “elapsed time in the current reporting period” is (calendar days? inclusive/exclusive? workspace-today?).
2. What “period end” is when the certified current month/week/year already ends **today** (PD-105-002). Projecting to that end makes Forecast ≡ Accrued on the default dashboard.
3. Full-period projection formula.
4. Elapsed = 0.
5. Accrued = 0 (including no TimeEntry).
6. Historical / completed / custom periods.
7. Which period kinds receive Forecast (`month` only vs today/week/month/year/custom).

Do not implement a formula until the Product Owner closes this.

**FACT — incomplete / adjacent cases that are already answered**

| Case | Answer |
| --- | --- |
| Invoice / Payment exist | Ignored. Forecast does not read them |
| Allocation missing or present | Ignored. Extra signal |
| Contract expired mid-period | Accrued still follows E01 period facts. Forecast formula still OPEN |
| HOURLY vs DAILY | Forecast is of Accrued. Accrued already applies R2-OD-001 / D4. No second billing formula is defined for Forecast |
| Mixed currency | Per-currency, no FX (D7). Implied: Forecast per Accrued currency |

---

## 5. Contract Time Allocation semantics

**FACT**

```text
monthlyContractedMinutes = recurring contractual capacity
allocatedMinutes         = optional total project / Contract time budget
```

- Optional. Null = no allocation alert.
- Manual create/update on Contract.
- Conceptual persistence: optional field on Contract. **Not in current schema.**
- Consumption is compared against `allocatedMinutes`.
- Distinct from utilization alerts (`CONTRACT_WARNING` / `CONTRACT_EXCEEDED` on monthly capacity).

**OPEN — required before allocation application**

| ID | Question |
| --- | --- |
| E04-D-CONSUMPTION-NUMERATOR | All TimeEntry minutes (PD-104-002 style) or billable only (BR-007 style)? |
| E04-D-CONSUMPTION-WINDOW | Lifetime Contract total, current reporting period, or validity-overlap only? |
| E04-D-OUT-OF-VALIDITY-CONSUMPTION | Include retained out-of-validity TimeEntries (PD-105-006) or exclude them? |
| E04-D-ALLOCATION-WARNING | Consumption / allocation WARNING ratio |
| E04-D-ALLOCATION-EXCEEDED | Whether / when EXCEEDED fires. 100% is not assumed |

**IMPLIED — not converted into new product decisions**

- Remaining = `allocatedMinutes − consumedMinutes` when allocation is present; derived, not persisted.
- Over-allocation is representable once consumption and allocation exist; display/alert predicates remain OPEN.
- Edit of `allocatedMinutes` is a live Contract write. No historical allocation snapshot is specified.
- No allocation → no allocation alert. Remaining / percentage without a denominator follows the existing “do not invent a denominator” utilization pattern only if PO confirms the numerator/window.

**FACT — does not affect**

Accrued, Expected, Forecast inputs, Invoice, Payment, FX, billing rates.

---

## 6. HOURLY vs DAILY

| Concern | Status |
| --- | --- |
| Accrued HOURLY / DAILY | Certified E01. Unchanged |
| Expected DAILY | Null in R2. Unchanged |
| Forecast formula per billing model | Not defined. Forecast is of Accrued (already model-aware) |
| `1 day = N hours` | **Not defined.** Do not invent |
| Allocation unit for DAILY | FACT — `allocatedMinutes` (minutes). No day-budget field exists |
| Distinct DAILY allocation/forecast formula | **Missing.** Do not invent. If PO wants days, that is a new decision |

---

## 7. Temporal semantics

**Do not introduce a second temporal model.**

Reuse:

| Rule | Authority |
| --- | --- |
| `Workspace.timezone` is period-boundary authority | PD-105-003 |
| Current month/week/year end **through today** | PD-104-003 / PD-105-002 |
| Historical month = full calendar month | `getMonthPeriod` |
| Contract validity `[validFrom, validTo)` | Domain / EPIC-102 |
| TimeEntry `workDate` is a calendar date | EPIC-103 |
| Invoice `invoiceDate` / `dueDate`; Payment `paymentDate` | E02 / E03 — **not Forecast inputs** |
| Alert “today” | `Workspace.timezone` |

**OPEN (part of Forecast arithmetic):** whether Forecast’s “period end” is the truncated current period or the natural calendar end of that kind.

Partial / expired / future contracts already have E01/R1 reporting rules. Allocation interaction with those rules is OPEN where listed in §5.

---

## 8. Proposed domain / data model

Product contract first. Schema is not chosen beyond what is already confirmed.

| Candidate | Verdict |
| --- | --- |
| A. New persistence aggregate | Not required |
| B. Extension of Contract | **Confirmed requirement:** optional `allocatedMinutes`. Conceptual name only until P-E04-01 |
| C. Extension of analytics read model | Required for Forecast + allocation consumption (derived) |
| D. Derived read model only | Forecast, remaining, consumption ratio |
| E. Period allocation table | Not specified. Do not invent |
| F. Forecast snapshot | Not justified |
| G. No new persistence | Insufficient: `allocatedMinutes` is a confirmed write-model field and is absent |

Recommended **after PO close**, not authorized now:

- Nullable integer minutes on Contract, workspace-scoped, same family as `monthlyContractedMinutes`.
- No allocation history table.
- No persisted remaining / forecast / consumption totals.
- Prisma name remains an implementation detail. Do not invent it in this phase.

---

## 9. Architecture impact

Smallest Modular Monolith increment:

```text
Domain types (Forecast, allocation consumption)
  → AnalyticsService (Forecast + consumption formulas)
  → Contract application service (allocatedMinutes write)
  → ContractRepository (persist optional field)
  → AlertService (allocation alerts only after threshold exists)
  → ReportingService (thin publish, no new formula)
  → UI (Contract write; dashboard/report read)
```

Reuse: `WorkspaceContext`, membership guard, `runInTransaction`, `lockContract`, overlap exclusion, `analytics-periods`, `publishMonetaryAmount`, Alert dedup / resolve / retrigger, existing error types.

Do **not**: new RevenueService, new forecast framework, Prisma from UI/Server Actions, business logic in React.

---

## 10. Concurrency / invariants

| Write | Invariant | Strategy |
| --- | --- | --- |
| Contract `allocatedMinutes` | Workspace isolation; optional null; integer minutes bounds (to be specified with existing minutes max family) | Existing `updateContract` + `lockContract`. No new overlap rule |
| TimeEntry C/U/D | Existing validity / snapshot / alert trigger | Unchanged. Allocation alerts, if later approved, evaluate on the same TimeEntry trigger path |
| Forecast | Read-only derived | No write invariant |
| Forecast configuration | **Not specified.** No config entity | None |

No new concurrent write invariant is specified beyond existing Contract update. Do not introduce global Serializable transactions.

---

## 11. Alerts impact

**FACT**

- Allocation alerts are in E04 conceptual scope.
- None when `allocatedMinutes` is null.
- Not workspace `CAPACITY_WARNING` / `CAPACITY_EXCEEDED` (PD-106-001 remains deferred / out of R2).
- `CONTRACT_WARNING` / `CONTRACT_EXCEEDED` remain monthly-capacity alerts. Do not reuse them as allocation alerts.
- `PAYMENT_*` unchanged.

**OPEN**

Predicates, severity, lifecycle, dedup, retrigger, temporal window, and names are **not** specified. Do not implement allocation alerts until E04-D-ALLOCATION-WARNING and E04-D-ALLOCATION-EXCEEDED close.

If later approved, reuse `AlertService` + `contractId` + existing notification lifecycle. Do not invent types or percentages in implementation.

---

## 12. Reporting / analytics impact

| Surface | Today | E04 |
| --- | --- | --- |
| `AnalyticsService.getAccruedRevenue` | Certified | Forecast input. Unchanged formula |
| `AnalyticsService.getExpectedRevenue` | Certified | Unchanged. Not a Forecast input |
| `ReportingService.getContractReport` | Accrued + Expected on DTO; “No Forecast” | May publish Forecast / allocation after formulas exist |
| Dashboard Monthly Summary | Hours only. Accrued/Expected on DTO, **not rendered** | Companion UI is OPEN (E04-D-UI-REVENUE-SURFACE) |
| E05 | Trailing | Must consume E04 outputs; no formula duplication |

Do not redesign E01/E02 reporting. Shared deterministic services only.

---

## 13. UI scope (not CSS)

**FACT — write**

`allocatedMinutes` is manually configurable and editable. Existing Contract create/update + `/contracts` is the write surface family.

**FACT — read**

Forecast is a current-period companion to Accrued. Allocation consumption may appear on contract / report surfaces. Exact screens were deferred to this epic plan.

**OPEN — E04-D-UI-REVENUE-SURFACE**

Accrued / Expected are computed and **not shown**. Whether E04 introduces the first money UI (Accrued + Forecast), only Forecast, or defers rendering to E05 is not decided.

**Proposed screens after PO close (planning labels, not design)**

| Screen | Actions | R/W |
| --- | --- | --- |
| Contract create / edit / detail | Set / clear allocation (hours UI → minutes persist, same as monthly hours) | W / R |
| Dashboard current period | Forecast companion; allocation remaining / over if defined | R |
| Reports contract report | Same figures via ReportingService | R |
| Alerts | Allocation alerts only after predicates exist | R |

Permissions: existing workspace membership. OBD-009 unchanged.

Empty: null allocation → no allocation alert; no invented remaining %.  
Error: existing Contract / analytics errors.  
VOID: Invoice VOID only. Contracts have no VOID/archive.  
Expired: validity unchanged; allocation display depends on OPEN consumption window.

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
| Consumption | Existing TimeEntry period / contract grouping (`workspaceId`, `contractId`, `workDate`) |
| Forecast | Accrued (already computed) + elapsed arithmetic. No extra scan if Accrued is reused |
| Dashboard / reports / export | Same period queries as E01 |

New index only if lifetime-all-TimeEntries-per-Contract becomes the approved consumption window and existing indexes are insufficient. Measure later.

---

## 16. Test strategy (no tests in P-E04-00)

**Unit:** Forecast arithmetic once closed; period boundaries; allocation consumption; HOURLY/DAILY Accrued reuse; elapsed=0; Accrued=0; null allocation; over-allocation representation.

**Integration:** Contract `allocatedMinutes` persist / update / null; workspace isolation; TimeEntry relation; no Forecast/remaining persistence.

**E2E:** allocation set/clear; Forecast on approved surface; existing dashboard / reports / contract journeys.

**Regression (must stay green):**

- E01 Accrued / Expected (`tests/unit/application/analytics/accrued-revenue.test.ts`, `expected-revenue.test.ts`, integration twins)
- E02 Invoice
- E03 Payment / payment alerts
- R1 utilization / CONTRACT_* alerts / periods / TimeEntry validity

---

## 17. E04 decision register

### E04-D-FORECAST-ARITHMETIC

**Question:** Exact linear Forecast arithmetic (elapsed, period end vs “through today”, projection, elapsed=0, Accrued=0, historical/custom periods, period kinds).  
**Evidence:** D4 / R2-OD-005 residual; PD-105-002 current period ends today.  
**Options:** PO must define. A vacuous Forecast≡Accrued reading exists if “period end” = truncated current period.  
**Recommendation:** PO close. Do not implement Option-by-assumption.  
**Impact:** Blocks Forecast application, Forecast UI, Forecast tests.  
**Status:** **OPEN — PO REQUIRED**

### E04-D-ALLOCATION-WARNING

**Question:** Consumption / allocation ratio that fires WARNING.  
**Evidence:** R2-OD-013 forbids inventing the threshold. R1 monthly warning default 80% is a different mechanism.  
**Options:** PO percentage; or no WARNING in R2.  
**Recommendation:** PO close. Do not copy 80%.  
**Impact:** Blocks allocation WARNING alerts.  
**Status:** **OPEN — PO REQUIRED**

### E04-D-ALLOCATION-EXCEEDED

**Question:** Does EXCEEDED exist, and at what ratio?  
**Evidence:** Open-decisions: “EXCEEDED at 100% of allocation is not assumed.”  
**Options:** 100%; another ratio; no EXCEEDED in R2.  
**Recommendation:** PO close.  
**Impact:** Blocks allocation EXCEEDED alerts.  
**Status:** **OPEN — PO REQUIRED**

### E04-D-CONSUMPTION-NUMERATOR

**Question:** Which TimeEntries consume `allocatedMinutes`?  
**Evidence:** R2-OD-013 says “TimeEntry consumption” without a billable filter. PD-104-002 = all minutes. BR-007 = billable for Accrued.  
**Options:** (A) all minutes (B) billable only.  
**Recommendation:** Do not silently pick. Closest existing **word** is utilization “consumption,” but that is not authorization.  
**Impact:** Blocks allocation application formulas and UI remaining/over.  
**Status:** **OPEN — PO REQUIRED**

### E04-D-CONSUMPTION-WINDOW

**Question:** Over what time window is consumption summed?  
**Evidence:** “Contract-level **total** time budget” vs existing period analytics. Not explicit.  
**Options:** (A) all TimeEntries on the Contract (B) current reporting period (C) validity-overlap days only.  
**Recommendation:** Do not silently pick. (A) matches “total project budget” language but is not closed.  
**Impact:** Blocks allocation application and likely query shape.  
**Status:** **OPEN — PO REQUIRED**

### E04-D-OUT-OF-VALIDITY-CONSUMPTION

**Question:** Do TimeEntries outside `[validFrom, validTo)` count?  
**Evidence:** PD-105-006 retains and flags them for reports. Write path rejects new ones. Allocation rule missing.  
**Options:** (A) include and flag (B) exclude.  
**Recommendation:** Do not silently reuse PD-105-006.  
**Impact:** Blocks allocation application edge cases.  
**Status:** **OPEN — PO REQUIRED**

### E04-D-UI-REVENUE-SURFACE

**Question:** Where is Forecast (and Accrued) shown?  
**Evidence:** E01 DTOs unpublished in UI. E04 “companion to Accrued.” E05 is reporting.  
**Options:** (A) E04 dashboard + reports render Accrued + Forecast (B) Forecast only (C) compute in E04, render in E05.  
**Impact:** Blocks UI phase. Not schema.  
**Status:** **OPEN — PO REQUIRED** (UI only)

### Closed / not new PO decisions

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

Adjusted from epic-map E04-P00…P04 to the requested P-E04-00…07. Persistence stays before Forecast because `allocatedMinutes` is a confirmed write field and Forecast is derived.

| Phase | Objective | Depends | Artifacts | Test gate | Commit | Blockers |
| --- | --- | --- | --- | --- | --- | --- |
| P-E04-00 | Planning / decision gate | E01 Accrued; E03 certified | This document | None | `docs(r2-e04): complete planning` | — |
| P-E04-01 | Persistence / domain: optional Contract minutes field | PO may proceed on field shape alone | Prisma + domain types. **No** Forecast formula | Isolation / null / bounds | TBD | None for the field itself |
| P-E04-02 | Application calculations | E04-D-FORECAST-ARITHMETIC; E04-D-CONSUMPTION-* | AnalyticsService Forecast + consumption | Unit formulas | TBD | **PO** |
| P-E04-03 | Integration: reporting publish + alerts if predicates exist | P-E04-02; WARNING/EXCEEDED if alerts in scope | ReportingService; AlertService only if closed | Integration + isolation | TBD | Alerts **PO** |
| P-E04-04 | UI | E04-D-UI-REVENUE-SURFACE; write path | Contract form; approved read surfaces | E2E | TBD | **PO** UI |
| P-E04-05 | QA / documentation | P-E04-04 | Sync docs to implemented behavior | QA | TBD | — |
| P-E04-06 | Release validation | P-E04-05 | Validation record | Gate | TBD | — |
| P-E04-07 | Certification | P-E04-06 | Certification | — | TBD | PO release later |

P-E04-01 is **not** authorized by this commit even though the field is confirmed.

---

## 19. Critical path

**BLOCKING PO — schema not strictly blocked, application is**

- E04-D-FORECAST-ARITHMETIC
- E04-D-CONSUMPTION-NUMERATOR
- E04-D-CONSUMPTION-WINDOW
- E04-D-OUT-OF-VALIDITY-CONSUMPTION

**BLOCKING PO — alerts**

- E04-D-ALLOCATION-WARNING
- E04-D-ALLOCATION-EXCEEDED

**BLOCKING PO — UI**

- E04-D-UI-REVENUE-SURFACE
- plus all calculation decisions above

**NON-BLOCKING / TECHNICAL**

- Prisma column name
- Remaining derived vs persisted (derived)
- No Forecast snapshot
- No period allocation table
- Index later if lifetime consumption needs it
- Alert type strings after predicates exist

---

## 20. Explicit PO decisions required

1. **E04-D-FORECAST-ARITHMETIC** (R2-OD-005) — elapsed, period end vs through-today, zeros, historical/custom, period kinds.
2. **E04-D-ALLOCATION-WARNING** (R2-OD-013 residual).
3. **E04-D-ALLOCATION-EXCEEDED** — 100% not assumed.
4. **E04-D-CONSUMPTION-NUMERATOR** — all minutes vs billable.
5. **E04-D-CONSUMPTION-WINDOW** — lifetime vs period vs validity overlap.
6. **E04-D-OUT-OF-VALIDITY-CONSUMPTION**.
7. **E04-D-UI-REVENUE-SURFACE** — where money/Forecast is shown.

Stop. Do not start P-E04-01.

---

## 21. Recommendation for next phase

Do **not** open P-E04-01.

Next authorized work is a Product Owner decision session on the seven items in §20. After those close, a new chat may update this plan and then authorize P-E04-01.

R2 remains not production-ready. E05 remains unplanned.
