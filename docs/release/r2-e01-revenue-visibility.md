# R2-E01 — Revenue Visibility — Epic Plan

**Epic:** R2-E01 — Revenue Visibility  
**Release:** Release 2 — Revenue Operations  
**MASTER_PLAN identifier:** R2-E01 (`MASTER_PLAN.md` §19)  
**Status:** COMPLETE / RELEASE-READY — P-E01-00…P-E01-07 COMPLETE. Engineering Review PASS WITH FINDINGS. QA PASS WITH FINDINGS. F-E01-001 CLOSED. F-E01-002 CLOSED.  
**Authority:** `docs/release/r2-decision-pack.md`  
**Companions:** `docs/release/r2-epic-map.md`, `docs/release/r2-architecture-delta.md`, `docs/release/r2-open-decisions.md`  
**Does not assign:** an EPIC-2xx number

```text
P-E01-00  PLANNING / ARCHITECTURE FREEZE   COMPLETE
P-E01-01  PERSISTENCE / DOMAIN FOUNDATION  COMPLETE
P-E01-02  ACCRUED REVENUE                  COMPLETE
P-E01-03  EXPECTED REVENUE                 COMPLETE
P-E01-04  ANALYTICS / REPORTING INTEGRATION COMPLETE
P-E01-05  ENGINEERING REVIEW               COMPLETE — PASS WITH FINDINGS
P-E01-06  QA                               COMPLETE — PASS WITH FINDINGS
P-E01-07  DOCUMENTATION / EPIC CLOSURE     COMPLETE

R2-E01: COMPLETE / RELEASE-READY
IMPLEMENTATION: P-E01-01 + P-E01-02 + P-E01-03 + P-E01-04
R1: FROZEN / GRANTED
R2: NOT PRODUCTION-READY
```

This plan is produced from the R2 planning baseline and from the R1
Contract / TimeEntry / analytics / reporting implementation as it exists
after R1 freeze. It does not invent product decisions. It does not
implement Accrued, Expected, Forecast, Invoice, Payment, or
`allocatedMinutes`.

---

## 1. Source documents

| Document | Used for |
| --- | --- |
| `docs/release/r2-decision-pack.md` | D1, D3, D4, D7; R2-OD-001…004 |
| `docs/release/r2-open-decisions.md` | Residual #6 and residuals that stay out of E01 |
| `docs/release/r2-architecture-delta.md` | Domain / persistence planning classes |
| `docs/release/r2-epic-map.md` | Release-level E01 envelope |
| `MASTER_PLAN.md` §19 | R2 scope pointer |
| `docs/product-vision.md` | Operational revenue visibility; Forecast deferred to E04 |
| `docs/architecture.md` | A-006, A-007, A-008; AnalyticsService / ReportingService |
| `docs/domain-model.md` §6–§9, §11 | Validity, BR-002/003/007, pro-rata, historical correctness |
| `docs/epics/EPIC-102/engineering-review.md` | P102-F-001; no commercial snapshot today |
| `docs/epics/EPIC-103/epic-plan.md` | TimeEntry immutability; validity at create |
| `docs/epics/EPIC-104/engineering-review.md` | Analytics non-goal: no revenue |
| `docs/epics/EPIC-105/epic-plan.md` | Periods, PD-105-*; PD-105-001 excluded revenue |
| `prisma/schema.prisma` | Contract / TimeEntry fields actually present |
| `src/application/analytics/analytics-service.ts` | Membership guard; `calculateProRataCapacity` |
| `src/application/reporting/reporting-service.ts` | Period-kind resolution; thin orchestration |
| `src/lib/analytics-periods.ts` | Timezone-aware current / historical / custom periods |
| `src/application/time-entries/contract-validation.ts` | `[validFrom, validTo)` at create |
| `src/infrastructure/persistence/analytics-repository.ts` | Relevance union; `isOutOfValidity`; `workspaceId` on every query |

Where a historical R1 document and the R2 decision pack disagree, the
decision pack wins for R2 meaning. R1 certification / freeze snapshots
are not rewritten.

---

## 2. Product objective

Publish deterministic **Accrued Revenue** and **Expected Revenue** so the
freelancer can see the economic value of recorded billable work and of
HOURLY contractual capacity — without invoicing, accounting, or Forecast.

```text
TimeEntry + commercial snapshot   → Accrued Revenue
Contract / contractual capacity   → Expected Revenue
```

E01 is the foundation for:

- R2-E03 Payment Tracking & Reconciliation (must not redefine Accrued / Expected)
- R2-E04 Forecasting & Contract Time Allocation (Forecast consumes Accrued / Expected)
- R2-E05 Advanced Reporting & Export (consumes authoritative E01 figures)

### Explicit non-scope

- Invoice Tracking, Invoice VOID, Invoice currency snapshot (E02)
- PaymentEvent, payment reconciliation, payment alerts (E03)
- Forecast Revenue and Forecast arithmetic (E04 / R2-OD-005)
- `allocatedMinutes` and allocation alerts (E04 / R2-OD-013)
- CSV / PDF / Excel (E05 / R2-OD-012)
- Profitability, costs, margins, tax, fiscal accounting (D3)
- FX, workspace-base currency totals (D7)
- ML / AI
- Period-close / audit ledger (R2-OD-014 / R2-OD-015)
- A new custom-period UX (R1 `/reports` already has one)
- Inventing Prisma field names in this document
- Resolving residuals owned by E02 / E03 / E04 / E05

---

## 3. Reused R1 semantics

Do not duplicate these rules. E01 consumes them.

| Semantic | Authority | E01 use |
| --- | --- | --- |
| Contract validity `[validFrom, validTo)`; `validTo = null` is ongoing | `docs/domain-model.md` §8; `isContractValidForDate` | Create still rejects new out-of-validity TimeEntries. Accrued does not drop historical out-of-validity entries (PD-105-006). Expected pro-rata uses the same exclusive `validTo`. |
| Ongoing ≡ `validTo === null` | PD-105-004 / BR-105-016 | Expected overlap treats effective inclusive end as the period end. Independent of capacity. |
| `monthlyContractedMinutes` | Contract; EPIC-102 | HOURLY Expected capacity only. Null → Expected = null. Not `allocatedMinutes`. |
| HOURLY billing | `BillingModel.HOURLY`; domain §7.1 | Accrued = billable minutes / 60 × applicable hourly rate (D4). |
| DAILY billing | `BillingModel.DAILY`; R2-OD-001 | One billable day per Contract / calendar date with at least one billable TimeEntry. |
| Contract `rate` | `Contract.rate` `Decimal(19,4)` | Live rate is current commercial configuration. Historical Accrued must not reread it (R2-OD-003). Expected reads the live rate (see §7). |
| Contract `currency` | ISO 4217; D7 | Accrued / Expected grouped by currency. No FX. `Workspace.currency` is create-form default only. |
| Timezone authority | `Workspace.timezone`; PD-105-003; `analytics-periods.ts` | All period boundaries. Never process-local time. |
| Current period ends today | PD-104-003 / PD-105-002 | Current week / month / year end on workspace-local today. |
| Historical month = full calendar month | `getMonthPeriod` | Historical Expected / Accrued use the natural period end. |
| Custom range | `ReportingPeriodKind.custom`; `getDateRangePeriod` | Already supported by ReportingService. E01 reuses it. No new picker. |
| Pro-rata capacity | PD-105-005; `AnalyticsService.calculateProRataCapacity` | Expected capacity = `monthlyContractedMinutes × (overlapDays / periodDays)`. Null capacity stays null. Zero overlap → `0`, not null. No rollover (OBD-012). |
| Relevance union | PD-105-006 | Contract appears if validity overlaps the period **or** it has in-period consumption. |
| Out-of-validity time retained | PD-105-006 / BR-105-018 | Historical TimeEntries outside `[validFrom, validTo)` stay in Accrued and are flagged, not dropped. |
| Billable eligibility | BR-007 | Only billable work contributes to Accrued. Utilization still uses all minutes (PD-104-002) — do not change that. |
| Stored associations authoritative | EPIC-104 | Analytics reads stored `clientId` / `contractId`. Never re-resolves. |
| Archived clients included | PD-104-001 | Accrued / Expected include archived-client history. New TimeEntries for archived clients remain rejected. |
| No Contract archive | schema | Contracts have no status field. Isolation is workspace-scoped. |
| TimeEntry immutability | PD-103-002 / 003 | `workDate`, `clientId`, `contractId` immutable. Update may change `durationMinutes`, `description`, `billable` only. |
| TimeEntry hard-delete | PD-103-001 | Delete removes the quantity fact. Accrued must follow. |
| Duplicate entries same date | PD-103-005 | HOURLY additive. DAILY still one billable day. |
| Workspace isolation | A-007; `AnalyticsService.requireMembership` | Every E01 read/write is workspace-scoped. Resource ids are not tenant grants. |
| Shared calculation services | A-006; BR-010 | Dashboard and reports must publish the same E01 figures. |
| Hours / utilization unchanged | EPIC-104 / 105 | E01 adds money. It must not change existing minute / percentage / utilization formulas. |
| P102-F-001 | EPIC-102 ER | Current model stores `TimeEntry.contractId` only. Live Contract commercial edits rewrite any calculation that rereads Contract. E01 closes this gap **for Accrued only**. |

Reusable capabilities (do not reimplement):

- `AnalyticsService` membership guard, period validation, `calculateProRataCapacity`
- `ReportingService.resolvePeriod`
- `getTodayPeriod` / `getCurrentWeekPeriod` / `getCurrentMonthPeriod` / `getCurrentYearPeriod` / `getMonthPeriod` / `getDateRangePeriod`
- `AnalyticsRepository` workspace-scoped TimeEntry / Contract reads
- `isContractValidForDate` for write-path eligibility (unchanged)

---

## 4. Domain model

Five concepts must stay distinct.

| # | Concept | Kind | Source |
| --- | --- | --- | --- |
| 1 | Contract commercial configuration | Live write model | `Contract.billingModel`, `rate`, `currency`, `monthlyContractedMinutes`, `[validFrom, validTo)` |
| 2 | Historical commercial snapshot | Persistence required for Accrued | Commercial value applicable when the work occurred (R2-OD-003). **Not present today.** |
| 3 | Time consumed | Quantity fact | `TimeEntry.durationMinutes`, `workDate`, `billable`, `contractId` |
| 4 | Accrued Revenue | Derived read model | Time consumed × historical commercial snapshot |
| 5 | Expected Revenue | Derived read model | Live HOURLY rate × pro-rata `monthlyContractedMinutes` |

`allocatedMinutes` is E04. Do not read, persist, or display it in E01.

### 4.1 Contract

Authoritative live fields E01 reads:

- `id`, `workspaceId`, `clientId`
- `validFrom`, `validTo`
- `billingModel` (`HOURLY` \| `DAILY`)
- `rate` (`Decimal(19,4)`, `rate > 0`)
- `currency` (ISO 4217)
- `monthlyContractedMinutes` (`Int?`)

Derived (already exist):

- `isOngoing` ≡ `validTo === null`
- unlimited capacity ≡ `monthlyContractedMinutes === null`
- pro-rata `contractedMinutes` for a period (`calculateProRataCapacity`)

Historical invariants:

- Live edits of `rate` / `billingModel` / `currency` remain allowed in R1 until a later write rule says otherwise. E01 must not rely on forbidding those edits to protect Accrued.
- R2-OD-011 currency immutability starts at the first Invoice / Payment, **not** at the first TimeEntry. Accrued therefore cannot treat live `Contract.currency` as historically stable.
- `monthlyContractedMinutes` remains live for Expected and for R1 utilization (P102-F-001 continues for capacity / utilization).

Workspace: every Contract is `workspaceId`-scoped. Cross-workspace Contract ids are not readable.

Validity: Expected uses live `[validFrom, validTo)` overlap with the reporting period. Accrued uses TimeEntry quantity + snapshot and does not require the work date to still fall inside live validity.

### 4.2 TimeEntry

Authoritative fields:

- `id`, `workspaceId`, `userId`, `clientId`, `contractId`
- `workDate` (calendar date, UTC midnight)
- `durationMinutes` (1…1440)
- `billable`
- `createdAt` / `updatedAt` (audit timestamps only; not commercial)

Derived today: none monetary.

Currency-agnostic as a time-tracking fact (D7). Duration is not money.

Historical invariants:

- Stored `contractId` is authoritative and immutable.
- No commercial snapshot field exists (`P102-F-001`).
- Hard-delete removes the quantity fact from Accrued.
- Updating `durationMinutes` or `billable` changes quantity, not the snapshotted commercial value (once a snapshot exists).
- Recreate (the only way to change `workDate` / `contractId`) is new work and captures the **current** Contract commercial value.

Workspace: `workspaceId` on every row. Repository queries already filter by it.

Validity: create validates `[validFrom, validTo)`. Later validity edits can make existing rows out-of-validity; Accrued retains them.

### 4.3 Revenue calculation

Accrued and Expected are derived. Prefer no revenue table unless a later phase proves a persistence need (`r2-architecture-delta.md` §5). E01 does not introduce persisted totals.

Publication (R2-OD-002):

- Intermediates stay unrounded (`minutes / 60 × rate`, using stored `Decimal(19,4)` rate).
- Each **published** monetary figure is rounded to the nearest integer once, from the unrounded sum for that figure.
- Do not sum already-rounded parts to produce another published total.
- Halfway cases for positive amounts use ordinary half-up (away from zero). No banker's rounding. No accounting-grade money type.

Currency: every published Accrued / Expected figure is per currency. EUR and USD are never added.

### 4.4 Commercial Snapshot

See §9. Required persisted information (names not invented):

- billing model applicable when the work occurred
- rate applicable when the work occurred
- currency applicable when the work occurred

Not part of the Accrued snapshot:

- `monthlyContractedMinutes` (Expected / utilization; live)
- `paymentTermsDays` / `paymentTermsNote` (E03)
- `allocatedMinutes` (E04)
- `validFrom` / `validTo` (live; Accrued quantity is the TimeEntry)

---

## 5. Accrued Revenue

Accrued is the consuntivo economic value of **billable** work already
recorded. Independent of Invoice, Payment, Expected, and Forecast.

### 5.1 HOURLY

```text
entryAccrued   = billableMinutes / 60 × snapshotRate
periodAccrued  = Σ entryAccrued for billable TimeEntries in the period
published      = round_to_nearest_integer(periodAccrued)
```

- Non-billable entries contribute `0`.
- Multiple TimeEntries are additive.
- Each entry uses **its own** snapshot rate / billing model / currency.
- A later live `Contract.rate` change must not change those entries.

### 5.2 DAILY

Implemented in `AnalyticsService.calculateAccruedRevenue` (P-E01-02).

```text
billableDay(contract, date) =
  1 if ≥ 1 billable TimeEntry exists for that Contract on that
    workspace calendar date
  0 otherwise

totalBillableMinutes(contract, date) =
  Σ billable durationMinutes for that Contract / date
  (all snapshotCurrency values; non-billable excluded)

dayTerms =
  Σ (snapshotMinutes / totalBillableMinutes × snapshotDailyRate)

Each term is published in its own snapshotCurrency.
No FX. No mixed-currency total.
published = round_to_nearest_integer(unrounded per currency)
```

Binding composition of R2-OD-001, R2-OD-016, BR-007, and D7:

- A date contributes one accrued billable day only if at least one
  **billable** TimeEntry exists for that Contract on that date.
- Multiple entries on the same Contract / date count once.
- Non-billable-only dates do not accrue.
- Non-billable minutes are excluded from the weighted-average denominator.
- Different Contracts on the same date are calculated independently.
- No work-calendar model.
- Same-day conflicting snapshot rates use the approved minute-weighted
  daily rate (R2-OD-016). First/last-wins is not used.

Timezone for the DAILY calendar date:

- `TimeEntry.workDate` is a workspace calendar date stored at UTC midnight.
- DAILY grouping uses that stored calendar date (`getCalendarDateKey`,
  same convention as `isDateInPeriod`).
- `Workspace.timezone` is the authority for resolving the reporting
  period / “today”. Stored `workDate` values are not reinterpreted as
  instants through the timezone (FINDING-108-001).

Same Contract / date with different `snapshotCurrency` values:

- The write path allows this. R2-OD-011 immutability starts at the first
  Invoice / Payment, not at the first TimeEntry.
- The approved denominator remains **all billable minutes for that
  Contract/date**, not a per-currency denominator.
- Each weighted term is attributed to its `snapshotCurrency`.
- Example: 3h @ €78 + 5h @ $90 → EUR 29.25 and USD 56.25. No €+$ total.
- This is D7 + R2-OD-016 applied together. It is not a new product
  decision and not FX.

### 5.3 Contract validity

| Situation | Accrued |
| --- | --- |
| TimeEntry created while contract valid | Accrues using snapshot at create |
| TimeEntry later falls outside live `[validFrom, validTo)` because validity was edited | **Retained.** Not dropped. Same as PD-105-006. Flag `isOutOfValidity` when the contract row is published. |
| New TimeEntry on an out-of-validity contract | Still rejected at create (`isContractValidForDate`) |
| Ongoing contract (`validTo = null`) | Accrues normally for recorded billable work |
| Future `workDate` (PD-103-004) | Accrues in the period that contains `workDate` |

Do not silently drop historical TimeEntries.

### 5.4 Currency

- Group Accrued by snapshotted currency (not live `Contract.currency`, not `Workspace.currency`).
- No FX.
- No single mixed-currency total.

### 5.5 Rounding

See §4.3. Do not round per TimeEntry and then sum.

### 5.6 Period membership

A TimeEntry belongs to a reporting period when `workDate` is inside the
inclusive `AnalyticsPeriod` (`isDateInPeriod`). Calendar date, not
server timestamp.

---

## 6. Expected Revenue

Expected is Contract-capacity value for the reporting period.
Independent of TimeEntry, Invoice, Payment, Accrued, and Forecast.
No inferred capacity. No calendar heuristics.

### 6.1 HOURLY

```text
proRataMinutes = AnalyticsService.calculateProRataCapacity(
  monthlyContractedMinutes, validFrom, validTo, period
)

if monthlyContractedMinutes is null:
  Expected = null
else:
  Expected = liveRate × (proRataMinutes / 60)
  published = round_to_nearest_integer(Expected)
```

Reuse PD-105-005 exactly:

- `overlapDays` = days in `[validFrom, validTo) ∩ period`
- `validTo` exclusive; ongoing → effective inclusive end = period end
- `proRataMinutes = monthlyContractedMinutes × (overlapDays / periodDays)`
- capacity unavailable (`monthlyContractedMinutes === null`) → **null**
- overlap `0` with capacity present → pro-rata `0` → Expected `0` (not null)

Live commercial configuration:

- Expected uses **live** `Contract.rate`, `billingModel`, `currency`,
  `monthlyContractedMinutes`, and validity.
- R2-OD-003 does **not** apply to Expected.
- Editing capacity or rate retroactively changes historical Expected,
  the same way R1 utilization denominators remain live (P102-F-001).
  That is reused R1 semantics, not a new snapshot.

### 6.2 DAILY

Expected Revenue = **null** for every DAILY Contract in R2.
No expected-day capacity model.

### 6.3 Period capability

| Capability | E01 behaviour |
| --- | --- |
| Current-period | Yes. Current week / month / year end today in `Workspace.timezone`. |
| Historical-period | Yes. Full historical months via `getMonthPeriod`; any resolved `AnalyticsPeriod`. |
| Ongoing-contract | Yes. `validTo === null` overlaps through the period end. |
| Custom period | Yes, when the caller already supplies a valid custom `AnalyticsPeriod`. No new UX. |

Use the existing reporting architecture. Do not invent a second period model.

---

## 7. Reporting periods

`Workspace.timezone` is the sole domain authority for “today” and for
named current periods. Server local time is not.

| Request | Constructor | E01 Accrued / Expected |
| --- | --- | --- |
| Current week | `getCurrentWeekPeriod(timezone)` Monday → today | Through today |
| Current month | `getCurrentMonthPeriod(timezone)` 1st → today | Through today |
| Current year | `getCurrentYearPeriod(timezone)` Jan 1 → today | Through today |
| Historical month | `getMonthPeriod(year, month)` full month | Full month |
| Custom | `getDateRangePeriod` / `ReportingPeriodKind.custom` | Inclusive UTC-midnight calendar range already supported by ReportingService |

`ReportingService.resolvePeriod` remains the period-kind authority.
E01 calculations accept an `AnalyticsPeriod` already resolved against
`context.timezone`.

Do not add a second custom-period feature. The `/reports` custom selector
is R1 (EPIC-108 Stream C). E01 only publishes money into the existing
period machinery.

---

## 8. Commercial Snapshot — conclusion

### 8.1 Evidence

`TimeEntry` persists quantity facts plus the P-E01-01 commercial snapshot:

- `snapshotBillingModel` (`BillingModel`)
- `snapshotRate` (`Decimal(19,4)`)
- `snapshotCurrency` (`Char(3)`)

These are historical snapshot columns on the TimeEntry quantity fact.
They are not live Contract fields.

`Contract` persists live `billingModel`, `rate`, `currency`.
`updateContract` may change those fields after TimeEntries exist
(P102-F-001 / temporary OBD-016 default).

Therefore any Accrued formula that reads live Contract commercial
fields violates R2-OD-003 and A-008.

### 8.2 Information that must be persisted

For Accrued to remain historically correct, each TimeEntry quantity fact
must be associated with the commercial value applicable when that work
was recorded:

| Information | Why |
| --- | --- |
| Billing model | HOURLY vs DAILY changes the formula. A later live switch would rewrite history. |
| Rate | Core commercial value. |
| Currency | D7 groups by currency. R2-OD-011 allows Contract currency to change until the first Invoice / Payment, so live currency is not historically stable for Accrued. |

This is commercial metadata for revenue reads. It does not make Time
Tracking currency-bearing (D7). Duration remains currency-agnostic.

### 8.3 Classification

| Option | Verdict |
| --- | --- |
| **A. Already supported by current persistence** | **No.** P102-F-001. |
| **B. Requires a new persistence field** | **Selected class.** Persist the three values above on the TimeEntry quantity fact. Minimal mechanism that satisfies R2-OD-003 without a new aggregate. |
| **C. Dedicated historical commercial snapshot / Contract revision table** | **Not required** by the approved semantic. Would also work, but it introduces Contract versioning that R1 explicitly deferred and that R2-OD-003 does not demand. |
| **D. Other minimal mechanism** (forbid commercial edits; force a new Contract on rate change) | **Not selected.** That is a product-policy change, not approved, and it contradicts the current R1 write default. |

P-E01-01 representation (class B, implemented):

| Column | Type |
| --- | --- |
| `snapshotBillingModel` | `BillingModel` |
| `snapshotRate` | `Decimal(19,4)` |
| `snapshotCurrency` | `CHAR(3)` |

Migration `20260922010000_add_time_entry_commercial_snapshot` backfills
existing rows from the live associated Contract (R2-OD-017).

### 8.4 Write timing (planning constraints, not schema)

- **TimeEntry create:** capture the live Contract billing model, rate, and currency.
- **Contract update:** must not rewrite existing snapshots.
- **TimeEntry update** of `durationMinutes` / `billable` / `description`: must not recapture commercial value.
- **TimeEntry delete:** snapshot goes with the row (hard-delete).
- **TimeEntry recreate:** new row captures current Contract commercial value.

### 8.5 Decision status after P-E01-01

| ID | Status |
| --- | --- |
| R2-OD-003 residual | **CLOSED** as `snapshotBillingModel` / `snapshotRate` / `snapshotCurrency` on TimeEntry |
| R2-OD-016 | **APPROVED** — weighted-average daily rate by billable minutes. Calculation is P-E01-02 |
| R2-OD-017 | **APPROVED** — migrate/backfill existing TimeEntries from the current associated Contract |

Accrued calculation is implemented in P-E01-02. Historical Accrued reads
only TimeEntry snapshot columns. Live Contract commercial fields are not
reread.

---

## 9. Application architecture

```text
UI (Dashboard / Reports)
  → ReportingService   (period-kind → AnalyticsPeriod; no money formula)
    → AnalyticsService (authoritative hours AND revenue)
      → AnalyticsRepository / domain ports
        → persistence
```

**Authoritative revenue calculation belongs in `AnalyticsService`.**

Reasons:

- A-006 / BR-010: dashboard, reports, later alerts / AI share one calculation owner.
- `AnalyticsService` already owns workspace membership, period validation, and `calculateProRataCapacity`.
- `ReportingService` is documented as a thin orchestrator with **no** percentage, capacity, or (today) revenue formula (`reporting-service.ts` non-goals).
- `r2-architecture-delta.md` §5 prefers extending analytics over a parallel service unless a later plan proves need.
- A dedicated `RevenueService` would create a second calculation owner and recreate the reporting-divergence risk EPIC-105 exists to prevent.

Do **not** put Accrued / Expected formulas in:

- React components
- route handlers / Server Actions
- UI utilities / formatters

`architecture.md` §18 still describes a conceptual “billing calculation
service”. That language is satisfied by extending AnalyticsService; it
does not require a new module in E01.

TimeEntry create remains the write path that must capture the snapshot
(P-E01-01 / P-E01-02). That write belongs in the existing TimeEntry
application service, not in the UI.

---

## 10. Persistence impact (planning only)

No schema or migration is authorized by this document.

| Concept | Classification | Migration later? |
| --- | --- | --- |
| `TimeEntry` minutes, `workDate`, `billable`, `contractId`, `workspaceId` | Existing field/model reusable | No |
| `Contract.rate`, `billingModel`, `currency` | Existing field/model reusable (live configuration; Expected; create-time capture source) | No |
| `Contract.monthlyContractedMinutes`, `[validFrom, validTo)` | Existing field/model reusable (Expected / pro-rata) | No |
| `Workspace.timezone`, `Workspace.currency` | Existing; timezone = period authority; currency = create default only | No |
| TimeEntry ↔ Contract relation | Existing relation reusable | No |
| Accrued / Expected totals | No persistence change (derived) | No |
| `allocatedMinutes` | Out of E01 | No |
| Invoice / Payment | Out of E01 | No |
| Historical commercial snapshot (`billingModel`, `rate`, `currency` at work time) | **New field(s) required** on the TimeEntry quantity fact (class B). Names not invented. | **Yes, in P-E01-01** |
| Dedicated snapshot / revision table | Not required (class C rejected as necessary) | No unless P-E01-01 proves B cannot store the three values |
| New relation | None required for class B | No |
| New table | None required for class B | No |

P-E01-01 is the only E01 phase that may introduce a migration.

---

## 11. API / application-service impact

Capabilities. Concrete method names are not mandated except where an
existing method is the reuse point.

| Capability | Owner | Notes |
| --- | --- | --- |
| Resolve reporting period | `ReportingService.resolvePeriod` | Existing. |
| Pro-rata capacity | `AnalyticsService.calculateProRataCapacity` | Existing. Expected must call this. |
| Accrued by reporting period | `AnalyticsService.getAccruedRevenue` | Unrounded + published integer; per currency and per Contract. |
| Expected by reporting period | `AnalyticsService` | HOURLY capacity × live rate; null if no capacity or DAILY. |
| Revenue by currency | `AnalyticsService` | Separate figures. No mixed total. |
| Revenue by Contract | `AnalyticsService` | Compatible with existing contract-utilization rows. |
| Dashboard / report publication | Existing RSC pages via shared service | Presentation DTO carries already-published integers. |

Distinguish:

| Layer | Responsibility |
| --- | --- |
| Authoritative calculation | Unrounded Accrued / Expected in AnalyticsService |
| Published DTO | Integer amounts + currency + nullability |
| UI formatting | Display the published integer and currency code. Do not recompute or re-round with a different rule. |

No HTTP public API is required beyond existing RSC / Server Action
patterns. Do not invent REST resources in E01.

---

## 12. Authorization / isolation

Every E01 calculation is workspace-scoped.

| Requirement | Rule |
| --- | --- |
| Workspace membership | `AnalyticsService.requireMembership` (SI-105-005). Non-members → `UnauthorizedWorkspaceAccessError`. |
| Contract ownership | Contract `workspaceId` must match context. Foreign Contract id is not found / not readable. |
| TimeEntry ownership | TimeEntry `workspaceId` must match context. Foreign TimeEntry id is not found / not readable. |
| Browser input | `workspaceId` never accepted from the client as a tenant grant. |
| Cross-workspace | Workspace A totals ignore Workspace B rows even if ids leak. |
| Archived clients | Included in Accrued / Expected (PD-104-001). Not selectable for new work. |
| Archived contracts | N/A — no Contract archive. |
| Roles | OBD-009 unchanged. No new E01 role. |

### Required negative tests

- Member of A cannot read B Accrued / Expected.
- Contract id from B used in A context → empty / not found, never B money.
- TimeEntry id from B used in A context → empty / not found.
- Non-member of A → unauthorized.
- Mixed-currency workspace never returns a converted grand total.

---

## 13. Test strategy

Implementation phases own these tests. This document does not add them.

Reuse existing suites as regression baselines:

- `tests/unit/application/analytics/analytics-pro-rata.test.ts`
- `tests/unit/application/analytics/analytics-calculations.test.ts`
- `tests/unit/lib/analytics-periods*.test.ts`
- `tests/integration/analytics/analytics-isolation.test.ts`
- `tests/integration/analytics/analytics-workspace-isolation.test.ts`
- `tests/integration/analytics/analytics-membership-guard.test.ts`
- `tests/integration/analytics/analytics-timezone-propagation.test.ts`
- `tests/integration/analytics/analytics-product-decisions.test.ts`
- `tests/integration/reporting/reporting-service.test.ts`

### HOURLY Accrued

- One billable TimeEntry
- Multiple TimeEntries additive
- Non-billable excluded
- Different snapshot rates over time; live rate change does not rewrite history
- Contract validity: in-validity create; later validity edit retains history
- Ongoing contract
- Currency separation
- Duration update changes quantity, not snapshot
- Recreate captures current commercial value

### DAILY Accrued

- One billable entry → one day
- Multiple billable entries same day → one day
- Entries on multiple days → one day each
- Non-billable-only day → no day
- Historical rate change after a closed day does not rewrite that day
- Contract validity retained / flagged
- R2-OD-016 case: two same-day entries with different snapshots use the minute-weighted daily rate (implemented in P-E01-02)

### Expected

- HOURLY with `monthlyContractedMinutes` → rate × pro-rata hours
- HOURLY with null capacity → null
- DAILY → null even if `monthlyContractedMinutes` is set
- Pro-rata partial validity overlap
- Current period (through today)
- Historical full month
- Ongoing contract
- Zero overlap + capacity present → `0`, not null
- Independent of TimeEntries (adding / removing time does not change Expected)

### Timezone

- Period boundaries from `Workspace.timezone`
- TimeEntry `workDate` on the workspace-local day boundary
- Process TZ must not shift Accrued / Expected membership

### Isolation

- Workspace A cannot read Workspace B revenue
- Foreign Contract
- Foreign TimeEntry
- Non-member denied

### Rounding

- Intermediate `minutes/60 × rate` not rounded
- Published figure is nearest integer
- Currency total is rounded from the unrounded sum, not from rounded contract subtotals

### Regression

Preserve all existing R1 analytics behaviour (minutes, billable %,
utilization, pro-rata, relevance, isolation, timezone) unless an
approved R2 decision explicitly supersedes it. E01 supersedes only
“analytics computes no money” (PD-105-001) for Accrued / Expected
publication.

---

## 14. Acceptance criteria

Objectively testable.

| ID | Criterion |
| --- | --- |
| AC-01 | Accrued HOURLY = billable TimeEntry minutes / 60 × the commercial hourly rate applicable to that work (snapshot, not live Contract after a later edit). |
| AC-02 | After a Contract commercial change, previously recorded Accrued for earlier work is unchanged. |
| AC-03 | DAILY Accrued counts each Contract / calendar date at most once. |
| AC-04 | Expected HOURLY = live rate × pro-rata contractual capacity for the reporting period (`calculateProRataCapacity`). |
| AC-05 | Expected = null when `monthlyContractedMinutes` is null. |
| AC-06 | Expected = null for DAILY Contracts. |
| AC-07 | Contract validity `[validFrom, validTo)` and PD-105-005 pro-rata are respected for Expected. Accrued does not drop out-of-validity historical TimeEntries (PD-105-006). |
| AC-08 | Accrued and Expected remain separated by currency. No FX. No mixed-currency total. |
| AC-09 | Published / displayed money is nearest-integer rounding of the unrounded figure. Intermediates are not prematurely rounded. |
| AC-10 | All revenue calculations are workspace-isolated (membership + `workspaceId` on every read). |
| AC-11 | Only billable TimeEntries contribute to Accrued (BR-007). Non-billable-only DAILY dates do not accrue. |
| AC-12 | Archived-client history is included (PD-104-001). |
| AC-13 | Current named periods end today in `Workspace.timezone`. Historical months are full months. Custom ranges reuse existing ReportingService resolution. |
| AC-14 | Dashboard and reports consume the same AnalyticsService revenue figures (A-006 / BR-010). |
| AC-15 | Accrued and Expected are independent of Invoice and Payment (none of which exist in E01). |
| AC-16 | Forecast, `allocatedMinutes`, Invoice, Payment, CSV, and PDF are absent from E01. |
| AC-17 | Existing R1 minute / utilization / isolation / timezone analytics remain unchanged. |

Count: **17**.

---

## 15. Epic phasing

Methodology: Release → Epic → Phase → Commit.
No implementation commit is created by this plan.

### P-E01-00 — Planning / architecture freeze

| | |
| --- | --- |
| Objective | Freeze E01 semantics, reuse map, snapshot class, phases, and ACs. |
| Scope | This document and companion planning pointers. |
| Dependencies | R2 decision pack; R1 freeze. |
| Non-scope | Application code, schema, migrations, tests. |
| Tests | None. |
| Migration | No. |
| Depends on | None. |
| Exit criteria | Plan committed; no `src/` / Prisma / R1 snapshot changes; open decisions remain explicit. |

**Status: COMPLETE.**

### P-E01-01 — Persistence / domain foundation

| | |
| --- | --- |
| Objective | Persist the three commercial-snapshot values on the TimeEntry quantity fact (class B). Capture on TimeEntry create. Forbid Contract updates from rewriting snapshots. |
| Scope | Schema + migration (names chosen here, not in P-E01-00); TimeEntry create write-path; domain types; no Accrued formula publication yet. |
| Dependencies | P-E01-00. **R2-OD-017 must be decided before migration of existing rows.** R2-OD-003 residual representation closed as an implementation choice inside class B. |
| Non-scope | Accrued / Expected publication; UI money; Forecast; Invoice. |
| Tests | Create captures snapshot from live Contract; Contract edit does not rewrite; update duration / billable does not recapture; workspace isolation on write; backfill behaviour per R2-OD-017. |
| Migration | **Yes.** |
| Depends on | P-E01-00; R2-OD-017 for existing-row policy. |
| Exit criteria | New TimeEntries persist billing model + rate + currency at create; live Contract edits leave those values intact; R1 TimeEntry behaviour otherwise unchanged. |
| Status | **COMPLETE** |

### P-E01-02 — Accrued Revenue

| | |
| --- | --- |
| Objective | Authoritative Accrued in AnalyticsService. |
| Scope | HOURLY additive; DAILY unique billable day; BR-007; validity retain; per-currency; publication rounding. |
| Dependencies | P-E01-01. R2-OD-016 is APPROVED (weighted-average daily rate). |
| Non-scope | Expected; Forecast; UI polish beyond what is required to call the service in tests. |
| Tests | §13 HOURLY, DAILY, rounding, validity, isolation. |
| Migration | No. |
| Depends on | P-E01-01. |
| Exit criteria | AC-01, AC-02, AC-03, AC-08, AC-09, AC-11, AC-12 hold in service tests. |
| Status | **COMPLETE** |

Implemented:

- Calculation owner: `AnalyticsService.getAccruedRevenue` /
  `AnalyticsService.calculateAccruedRevenue`
  (`src/application/analytics/accrued-revenue.ts`).
- Quantity: `TimeEntry.durationMinutes` (live quantity fact).
- Commercial value: `snapshotBillingModel`, `snapshotRate`, `snapshotCurrency`.
- HOURLY: `billableMinutes / 60 × snapshotRate`, additive per TimeEntry.
- DAILY: one billable day per Contract / stored workspace calendar
  `workDate`, minute-weighted with denominator = all billable minutes for
  that Contract/date (R2-OD-016). Each term keeps its `snapshotCurrency`.
- Timezone: `Workspace.timezone` resolves the `AnalyticsPeriod`. DAILY
  grouping uses `getCalendarDateKey` on the persisted calendar `workDate`.
- Published money: `Math.round(unrounded_total)` once per published figure.
- Isolation: `requireMembership` + workspace-scoped
  `AnalyticsRepository.listTimeEntriesForPeriod`.
- Not introduced: Expected, Forecast, Invoice, Payment, mixed-currency total.
  Dashboard/report publication is P-E01-04.

Test evidence:

- Unit: `tests/unit/application/analytics/accrued-revenue.test.ts`
- Integration: `tests/integration/analytics/accrued-revenue.test.ts`
- R1 analytics regression suites remain green.

### P-E01-03 — Expected Revenue

| | |
| --- | --- |
| Objective | Authoritative Expected in AnalyticsService using live Contract + existing pro-rata. |
| Scope | HOURLY capacity × live rate; null capacity → null; DAILY → null; current / historical / ongoing / custom periods. |
| Dependencies | P-E01-00 (semantics); P-E01-01 (shared types / service shape). Does not need Accrued snapshot values. |
| Non-scope | Forecast; `allocatedMinutes`; inventing capacity when null. |
| Tests | §13 Expected + timezone + isolation. |
| Migration | No. |
| Depends on | P-E01-01 (for shared service extension). May proceed in parallel with P-E01-02 after P-E01-01. |
| Exit criteria | AC-04, AC-05, AC-06, AC-07 (Expected half), AC-13 hold. |
| Status | **COMPLETE** |

Implemented:

- Calculation owner: `AnalyticsService.getExpectedRevenue` /
  `AnalyticsService.calculateExpectedRevenue`
  (`src/application/analytics/expected-revenue.ts`).
- Source: live Contract `billingModel`, `rate`, `currency`,
  `monthlyContractedMinutes`, `[validFrom, validTo)`.
- HOURLY + capacity: `liveRate × (calculateProRataCapacity / 60)`.
- HOURLY + `monthlyContractedMinutes === null` → Expected `null`.
- DAILY → Expected `null`. No daily capacity is invented.
- Pro-rata: PD-105-005 via existing `calculateProRataCapacity`.
  `[validFrom, validTo)`; ongoing `validTo === null` overlaps through
  the period end. Overlap `0` with capacity present → `0`, not null.
- Periods: existing `AnalyticsPeriod` / `Workspace.timezone` constructors.
  Current / historical / ongoing / custom ranges already resolved by the caller.
- Live values: Expected rereads the current Contract. R2-OD-003 does not apply.
  A later live rate change rewrites Expected; Accrued snapshots stay unchanged.
- Currency: live Contract currency, grouped separately. No FX. No mixed total.
- Published money: `Math.round(unrounded_total)` once per published figure.
- Isolation: `requireMembership` + workspace-scoped
  `AnalyticsRepository.listExpectedContracts` (validity overlap only;
  TimeEntry consumption is not a relevance signal).
- Archived-client contracts contribute when validity overlaps the period.
- Not introduced: Forecast, Invoice, Payment, `allocatedMinutes`, mixed-currency
  total. Dashboard/report publication is P-E01-04.

Expected vs Accrued:

| | Accrued | Expected |
| --- | --- | --- |
| Source | TimeEntry quantity + snapshot | Live Contract capacity |
| HOURLY | `billableMinutes / 60 × snapshotRate` | `liveRate × (proRataMinutes / 60)` |
| DAILY | unique billable day (R2-OD-016) | `null` |
| Null capacity | n/a | `null` |
| Rate | snapshot (R2-OD-003) | live Contract |
| TimeEntry | required | never read |

Test evidence:

- Unit: `tests/unit/application/analytics/expected-revenue.test.ts`
- Integration: `tests/integration/analytics/expected-revenue.test.ts`
- R1 / Accrued analytics regression suites remain the baseline.

### P-E01-04 — Integration with existing analytics / reporting

| | |
| --- | --- |
| Objective | Publish Accrued / Expected on existing Dashboard / Reports through ReportingService orchestration. |
| Scope | DTOs; RSC read paths; per-currency presentation; no new period model. |
| Dependencies | P-E01-02 and P-E01-03. |
| Non-scope | New report types that belong to E05; CSV/PDF; Forecast widgets; custom-period UX rewrite. |
| Tests | Dashboard and reports agree (AC-14); R1 hours / utilization regression; isolation. |
| Migration | No. |
| Depends on | P-E01-02, P-E01-03. |
| Exit criteria | AC-14, AC-15, AC-16, AC-17 hold on the existing surfaces. |
| Status | **COMPLETE** |

Implemented application/reporting integration (no formula change):

- Calculation owner remains `AnalyticsService.getAccruedRevenue` /
  `getExpectedRevenue` / `calculateAccruedRevenue` / `calculateExpectedRevenue`.
- `AnalyticsService.getMonthlyAnalytics` / `getCurrentMonthAnalytics` compose
  R1 hours with `accrued` and `expected` in parallel
  (`getMonthlyAnalytics` + `listTimeEntriesForPeriod` + `listExpectedContracts`).
- `ReportingService.getContractReport` publishes the same AnalyticsService
  figures for the resolved period (`contractUtilizations` + `accrued` + `expected`).
- `ReportingService.getAnnualOverview` inherits per-month revenue through
  `MonthlyAnalytics`. Month buckets stay per-currency. No year mixed-currency total.
- `ReportingService.getHoursByClient` stays hours-only. No client-level revenue
  aggregation exists; inventing one would be a false client association.
- Dashboard RSC already consumes `getCurrentMonthAnalytics`. The DTO now carries
  Accrued / Expected. Monthly Summary / report tables are unchanged: no approved
  money UX. No new pages, cards, tables, CSV, PDF, or Forecast.
- Currency: `AccruedRevenue` / `ExpectedRevenue` remain per-currency. No FX.
  No mixed-currency total on MonthlyAnalytics, ContractReport, or AnnualOverview.
- Isolation: membership guard + workspace-scoped repository reads unchanged.

DTO / type changes:

- `MonthlyHoursAnalytics` — hours-only repository shape.
- `MonthlyAnalytics` — `MonthlyHoursAnalytics` + `accrued` + `expected`.
- `ContractReport` — added `accrued` and `expected`.
- `HoursByClientReport` — unchanged.

Exposure limitations (not blockers for this phase):

- Dashboard UI and existing report tables do not render money. Application DTOs
  publish the figures; UI display is a later UX decision.
- Hours-by-client has no Accrued / Expected. Client-level revenue is not an
  approved aggregation.
- Annual overview does not publish a single year monetary total.

Test evidence:

- Unit: `tests/unit/application/analytics/analytics-service.test.ts`
- Unit: `tests/unit/application/reporting/reporting-service.test.ts`
- Integration: `tests/integration/reporting/revenue-reporting.test.ts`
- Regression: analytics unit / analytics integration / reporting integration.

### P-E01-05 — E01 Engineering Review

| | |
| --- | --- |
| Objective | Review that implementation matches this plan and approved decisions. |
| Scope | ER document under the epic’s review convention once an EPIC-2xx home exists, or `docs/release/` if still unlabeled. |
| Dependencies | P-E01-04. |
| Non-scope | New features; closing R2-OD-005 / 012 / 013 / VOID / Invoice currency. |
| Tests | Review of existing evidence, not a new product surface. |
| Migration | No. |
| Depends on | P-E01-04. |
| Exit criteria | ER recorded; no silent product decisions; P102-F-001 closed **for Accrued** only. |
| Status | **COMPLETE** — PASS WITH FINDINGS |

**HEAD reviewed:** `cafa537611f4f26f1f8de26b286bdb7776e9dd23`

```text
VERDICT:                 PASS WITH FINDINGS
BLOCKING FINDINGS:       NONE
P102-F-001 (Accrued):    CLOSED
P-E01:                   NOT BLOCKED
P-E01-06 QA:             AUTHORIZED
PRODUCTION READINESS:    UNCHANGED (R2 not production-ready)
```

Full review: §19.

### P-E01-06 — QA

| | |
| --- | --- |
| Objective | QA the E01 money surfaces and isolation / timezone / rounding. |
| Scope | Focused QA against AC-01…AC-17. |
| Dependencies | P-E01-05. |
| Non-scope | Full R2 production validation; R1 recertification; E2E of E02–E05. |
| Tests | QA evidence for Accrued / Expected / isolation / timezone / rounding / regression. |
| Migration | No. |
| Depends on | P-E01-05. |
| Exit criteria | Blocking QA findings = 0 or explicitly deferred by Product Owner. |
| Status | **COMPLETE** — PASS WITH FINDINGS |

**HEAD reviewed:** `0e171a93e881b50c1e1102f251af6cf803732b84`

```text
VERDICT:                 PASS WITH FINDINGS
BLOCKING FINDINGS:       NONE
F-E01-001:               CLOSED
F-E01-002:               CLOSED — companions synchronized in P-E01-07
P-E01:                   COMPLETE / RELEASE-READY
P-E01-07:                COMPLETE
PRODUCTION READINESS:    UNCHANGED (R2 not production-ready)
```

Full QA: §20.

### P-E01-07 — Documentation / Epic closure

| | |
| --- | --- |
| Objective | Synchronize MASTER_PLAN / changelog / architecture / domain with implemented E01. |
| Scope | Documentation only. |
| Dependencies | P-E01-06. |
| Non-scope | Rewriting R1 freeze / certification snapshots. |
| Tests | None beyond doc consistency. |
| Migration | No. |
| Depends on | P-E01-06. |
| Exit criteria | Docs state E01 implemented scope honestly; open residuals remain open; R2 still not production-ready until later release gates. |
| Status | **COMPLETE** — E01 COMPLETE / RELEASE-READY |

**HEAD closed:** this P-E01-07 commit.

```text
VERDICT:                 COMPLETE / RELEASE-READY
F-E01-001:               CLOSED
F-E01-002:               CLOSED
BLOCKING FINDINGS:       NONE
R2-E01:                  COMPLETE / RELEASE-READY
NEXT R2 WORK:            R2-E02 Invoice Tracking
PRODUCTION READINESS:    UNCHANGED (R2 not production-ready)
```

Full closure: §21.

---

## 16. Dependencies with other R2 epics

```text
E01 Accrued / Expected
        ↓
E03 may consume revenue-related meaning
    but must not redefine Accrued / Expected

E01 Accrued / Expected
        ↓
E04 Forecast consumes Accrued (+ Expected as context)
    and adds Forecast arithmetic + allocatedMinutes

E01 Accrued / Expected
        ↓
E05 reporting / export consumes authoritative E01 figures
```

E01 must **not** implement: Invoice, PaymentEvent, payment reconciliation,
Forecast, `allocatedMinutes`, allocation alerts, CSV, PDF.

E02 remains parallel and independent of Accrued.

---

## 17. Remaining product / planning decisions

Do not resolve these in implementation.

### Still owned outside E01

1. Allocation WARNING threshold → E04 (R2-OD-013 residual)
2. Exact Forecast arithmetic → E04 (R2-OD-005)
3. Invoice currency snapshot representation → E02 (R2-OD-011 residual)
4. Invoice VOID UX / restore → E02 (R2-OD-007 residual)
5. CSV scope → E05 (R2-OD-012)

### Closed in E01

6. **R2-OD-003 residual** — `snapshotBillingModel` / `snapshotRate` / `snapshotCurrency` on TimeEntry.
7. **R2-OD-016** — weighted-average daily rate by billable minutes. Implemented in P-E01-02.
8. **R2-OD-017** — existing TimeEntries backfilled from the current associated Contract.

Expected remains live-Contract for rate and capacity. That is reused R1
semantics, not a new snapshot, and is not listed as an open product
question unless the Product Owner later extends R2-OD-003 to Expected.

---

## 18. What this document does not authorize

- Application implementation
- Prisma schema or migrations
- Tests except as requirements for later phases
- Opening E02 / E03 / E04 / E05 implementation
- Marking R2 production-ready
- Rewriting R1 freeze, production-validation, or certification snapshots
- Inventing Prisma field names, WARNING thresholds, Forecast formulas, VOID UX, or CSV scope

---

## 19. P-E01-05 Engineering Review

**Date:** 2026-09-22  
**Phase:** P-E01-05  
**Reviewed HEAD:** `cafa537611f4f26f1f8de26b286bdb7776e9dd23`  
(`ef255c5` P-E01-01 · `e0d9fe1`/`59fa01d` P-E01-02 · `ad6b609` P-E01-03 · `cafa537` P-E01-04)

### Verdict

**PASS WITH FINDINGS**

No blocker. Accrued / Expected match the approved commercial semantics. P102-F-001 is closed **for Accrued only**. No silent product decision. No Forecast, FX, mixed-currency total, Invoice, Payment, or `allocatedMinutes`. Schema was not changed after P-E01-01.

### Findings

#### F-E01-001

| Field | Value |
| --- | --- |
| Severity | low |
| Area | Performance |
| Evidence | `AnalyticsService.getMonthlyAnalytics` always loads hours + `listTimeEntriesForPeriod` + `listExpectedContracts`. `/reports` always calls `getAnnualOverview`, which runs that composition 12 times. `AnnualOverviewTable` / `ContractReportTable` / dashboard Monthly Summary still render hours only. |
| Impact | Extra period TimeEntry and Contract reads on every dashboard and reports load. Correctness is unaffected. Cost is unmeasured. |
| Remediation | Measured in P-E01-06. No optimization. |
| QA disposition | **CLOSED** — see §20. Acceptable at the P105-06 reference volume. No serial N+1 introduced by E01. |
| Release impact | Does not block P-E01. Closed in P-E01-06. No PO decision. |

#### F-E01-002

| Field | Value |
| --- | --- |
| Severity | low |
| Area | Documentation |
| Evidence | `docs/release/r2-epic-map.md` still says Accrued not started and P-E01-02…04 “Not started”. `docs/release/r2-architecture-delta.md` §13 still lists R2-OD-016 / R2-OD-017 as undecided. Both contradict this plan and the implemented commits. |
| Impact | Planning companions are stale. Implementation and this plan remain the E01 authority. |
| Remediation | Synchronized in P-E01-07. Do not rewrite R1 freeze snapshots. |
| QA disposition | **CLOSED** — see §21. Companions aligned to implemented E01. |
| Release impact | Does not block P-E01. Closed in P-E01-07. No PO decision. |

### Verified areas

- Accrued HOURLY: `billableMinutes / 60 × snapshotRate`; non-billable excluded; additive; snapshot not live Contract.
- Accrued DAILY: one billable day per Contract / stored UTC-midnight `workDate`; R2-OD-016 minute-weighted denominator = all billable minutes for that Contract/date; mixed-currency terms stay in `snapshotCurrency`; no FX.
- Accrued retains out-of-validity historical TimeEntries; create still rejects new out-of-validity work.
- Expected HOURLY: live rate × `calculateProRataCapacity / 60`. Null capacity → null. DAILY → null. `[validFrom, validTo)` with exclusive `validTo`. Ongoing through period end. Overlap 0 + capacity → 0, not null. No TimeEntry / snapshot read (`listExpectedContracts` is validity-overlap only).
- Snapshot write: create captures live Contract; update duration/billable/description does not recapture; Contract update does not rewrite TimeEntry snapshots; new TimeEntry captures current Contract; migration `20260922010000_add_time_entry_commercial_snapshot` backfills from associated Contract. No later schema change.
- Timezone: `Workspace.timezone` resolves periods / today. DAILY grouping uses `getCalendarDateKey` (UTC calendar date). Stored `workDate` is not reinterpreted as an instant. UTC / Rome / Tokyo / New York cases hold.
- Currency: Accrued by snapshot currency; Expected by live Contract currency; no mixed total; no year monetary total; HoursByClient remains hours-only.
- Architecture: formulas in `accrued-revenue.ts` / `expected-revenue.ts` owned by `AnalyticsService`. `ReportingService` orchestrates. No `RevenueService`. Repository queries are `workspaceId`-scoped. Membership guard on every read.
- DTO: `MonthlyAnalytics`, `ContractReport`, `AnnualOverview` carry per-currency Accrued / Expected. No Forecast field. UI does not render money (accepted P-E01-04 limitation).
- Relevance: Accrued = in-period TimeEntries; Expected = validity overlap; R1 utilization remains validity ∪ consumption. Not the same predicate.
- R1 hours / utilization / isolation / timezone analytics unchanged.

### Test evidence

Executed for this review (no new tests added):

| Suite | Result |
| --- | --- |
| Unit analytics Accrued / Expected / AnalyticsService / pro-rata / calculations + reporting + TimeEntry services | 132 passed / 132 |
| Integration Accrued / Expected / revenue-reporting / reporting-service / commercial snapshot / migrations | 68 passed / 68 |
| R1 analytics isolation / workspace isolation / membership / timezone / product decisions | 34 passed / 34 |

**Total: 234 passed / 234. Failed: 0. Skipped: 0.**

Coverage notes (not findings): Accrued unit “later rate change does not rewrite history” is tautological; historical immutability is proven by integration snapshot + Accrued tests. Duration-update / hard-delete Accrued quantity is implied by the derived formula and the snapshot write tests, not re-asserted as a dedicated Accrued case.

### Release impact

- F-E01-001 / F-E01-002 do **not** block P-E01.
- P-E01-06 QA is authorized. Measure F-E01-001 there.
- F-E01-002 is deferred to P-E01-07.
- No Product Owner decision is required.
- P-E01-06 is **not** started by this review.

---

## 20. P-E01-06 QA Gate

**Date:** 2026-09-22  
**Phase:** P-E01-06  
**Reviewed HEAD:** `0e171a93e881b50c1e1102f251af6cf803732b84`  
**Host clock:** Europe/Rome (CEST, UTC+2)

### Verdict

**PASS WITH FINDINGS**

No blocker. AC-01…AC-17 hold on existing unit and integration evidence. R1 hours / utilization / isolation / timezone / membership analytics remain green. F-E01-001 is closed after measurement. F-E01-002 was open at QA and is closed in P-E01-07. No code remediation. No new product decision.

### Commands executed

| Command | Result |
| --- | --- |
| `pnpm test:db:migrate` | PASS — no pending migrations |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| Focused unit Analytics / Reporting / periods / Accrued / Expected | PASS — 232 / 232 |
| Full unit (`pnpm test` analytics+reporting+time-entries filter resolved to the unit suite) | PASS — 504 / 504 |
| Integration Accrued / Expected / revenue / reporting / snapshot / weekly | PASS — 71 / 71 |
| Integration isolation / membership / timezone / product decisions | PASS — 34 / 34 |
| Integration performance (`reporting-performance.test.ts`) | PASS — 1 / 1 |
| `pnpm build` | PASS |

E2E and the R1 release-gate journey were not executed. E01 does not change those surfaces (no money UI; no auth/onboarding change).

### Test matrix

| Suite | Passed | Failed | Skipped | Result |
| --- | --- | --- | --- | --- |
| Unit Accrued | 31 | 0 | 0 | PASS |
| Unit Expected | 21 | 0 | 0 | PASS |
| Unit Analytics (service / calculations / pro-rata) | 60 | 0 | 0 | PASS |
| Unit Reporting | 4 | 0 | 0 | PASS |
| Unit periods | 68 | 0 | 0 | PASS |
| Unit reporting features (custom period / display / types) | 48 | 0 | 0 | PASS |
| Unit suite (all unit files in the QA run) | 504 | 0 | 0 | PASS |
| Integration Accrued | 16 | 0 | 0 | PASS |
| Integration Expected | 12 | 0 | 0 | PASS |
| Integration revenue reporting | 8 | 0 | 0 | PASS |
| Integration ReportingService | 21 | 0 | 0 | PASS |
| Integration commercial snapshot | 6 | 0 | 0 | PASS |
| Integration weekly analytics | 8 | 0 | 0 | PASS |
| Integration isolation / membership / timezone / product decisions | 34 | 0 | 0 | PASS |
| Integration performance baseline | 1 | 0 | 0 | PASS |
| Lint | — | 0 | 0 | PASS |
| Typecheck | — | 0 | 0 | PASS |
| Build | — | 0 | 0 | PASS |

### Acceptance criteria

| ID | Result | Evidence |
| --- | --- | --- |
| AC-01 | PASS | Accrued unit HOURLY + integration snapshot rate |
| AC-02 | PASS | Integration: live Contract rate change leaves historical Accrued unchanged |
| AC-03 | PASS | Accrued unit/integration DAILY one billable day per Contract/date |
| AC-04 | PASS | Expected unit/integration live rate × pro-rata |
| AC-05 | PASS | Expected null when `monthlyContractedMinutes` is null |
| AC-06 | PASS | Expected null for DAILY |
| AC-07 | PASS | Expected `[validFrom, validTo)`; Accrued retains out-of-validity history |
| AC-08 | PASS | Per-currency Accrued (snapshot) and Expected (live); no FX; no mixed total |
| AC-09 | PASS | Unrounded intermediates; published half-up; DAILY weighted then rounded |
| AC-10 | PASS | Isolation / membership / foreign Contract/TimeEntry / reporting isolation |
| AC-11 | PASS | Non-billable excluded from Accrued and from the DAILY denominator |
| AC-12 | PASS | Archived-client Accrued / Expected / reporting |
| AC-13 | PASS | `Workspace.timezone`; current / historical / custom / ongoing; ± offset |
| AC-14 | PASS | MonthlyAnalytics / CurrentMonthAnalytics / ContractReport / AnnualOverview share AnalyticsService figures |
| AC-15 | PASS | No Invoice / Payment types or reads |
| AC-16 | PASS | No Forecast field; HoursByClient hours-only; no year mixed monetary total |
| AC-17 | PASS | R1 hours / utilization / isolation / timezone / membership suites green |

### Performance — F-E01-001

Surfaces measured: `getMonthlyAnalytics`, `getCurrentMonthAnalytics`, `getAnnualOverview` (×12).

Latency at the P105-06 reference volume (100 clients / 50 contracts / 1000 TimeEntries):

| Surface | Elapsed |
| --- | --- |
| `getContractReport` month | 22 ms |
| `getAnnualOverview` 2025 (12 × `getMonthlyAnalytics`) | 26 ms |
| weekly aggregation | 3 ms |
| `getContractReport` year | 10 ms |

Query counts (instrumented Prisma query events; 50 contracts / 200 TimeEntries on 2026-09-15):

| Surface | Queries | Elapsed | E01 incremental |
| --- | --- | --- | --- |
| `getMonthlyAnalytics` | 61 | 21 ms | +2 parallel (`listTimeEntriesForPeriod`, `listExpectedContracts`) |
| `getCurrentMonthAnalytics` | 62 | 12 ms | same composition as monthly |
| `getAnnualOverview` ×12 | 168 | 19 ms | +24 parallel (12 × 2) |

Of the 61 monthly queries, 50 are the pre-existing concurrent R1 out-of-validity `COUNT`s (`getContractUtilizations`, F-105-P-007). They are not serial N+1 and were not introduced by E01.

E01 adds two workspace-scoped `findMany` reads beside the existing hours path, in `Promise.all`. Annual overview already fanned out 12 months in R1; E01 adds 24 reads inside that fan-out. No new serial N+1.

**F-E01-001: CLOSED.** Latency is acceptable at the declared reference volume. No formula change. No optimization.

### Findings

#### F-E01-001

| Field | Value |
| --- | --- |
| Severity | low |
| Area | Performance |
| Status | **CLOSED** |
| Evidence | Annual overview 26 ms at 100/50/1000. Extra E01 reads are 2 per month and 24 per year, parallel. No serial N+1. |
| Impact | None observed. Correctness unaffected. |
| Remediation phase | None. Do not optimize speculatively. |

#### F-E01-002

| Field | Value |
| --- | --- |
| Severity | low |
| Area | Documentation |
| Status | **CLOSED** — P-E01-07 |
| Evidence | QA recorded companions stale. P-E01-07 synchronized `r2-epic-map.md` and `r2-architecture-delta.md`. |
| Impact | None. Planning companions now match implemented E01. |
| Remediation phase | P-E01-07 |

No new finding.

### Release readiness

| Item | Value |
| --- | --- |
| Blocker | No |
| E01 release-ready | Yes — COMPLETE / RELEASE-READY after P-E01-07 |
| Open findings | None. F-E01-001 CLOSED. F-E01-002 CLOSED. |
| PO decision required | No |
| P-E01-07 | COMPLETE |
| R2 production-ready | No |

---

## 21. P-E01-07 Documentation / Epic closure

**Date:** 2026-09-22  
**Phase:** P-E01-07  
**Scope:** Documentation only. No application, schema, formula, or UX change.

### Verdict

**COMPLETE / RELEASE-READY**

Companions identified by F-E01-002 are aligned to the implemented E01
scope, Engineering Review, and QA Gate. No new product decision.
R2-E01 is closed as an epic. R2 as a release is not production-ready.

### F-E01-002 remediation

| Companion | Alignment |
| --- | --- |
| `docs/release/r2-epic-map.md` | E01 / P-E01-02…P-E01-07 status set to implemented / COMPLETE. ER PASS WITH FINDINGS. QA PASS WITH FINDINGS. |
| `docs/release/r2-architecture-delta.md` | R2-OD-016 and R2-OD-017 recorded as approved and implemented. Snapshot columns exist. Removed from §13 undecided list. |
| `docs/release/r2-open-decisions.md` | R2-OD-016 / R2-OD-017 remain APPROVED / CLOSED and marked implemented. Residuals #1–#5 unchanged. |
| `MASTER_PLAN.md` | §4 / §19 / next-actions: E01 COMPLETE / RELEASE-READY. Next work = R2-E02. |
| `CHANGELOG.md` | Unreleased entry for E01 closure. Historical rows not rewritten. |
| `README.md` | Status line: E01 COMPLETE / RELEASE-READY. Next = E02. R2 not production-ready. |
| `docs/architecture.md` | §18 snapshot columns exist. §35 commercial-snapshot residual removed. |
| `docs/domain-model.md` | §12 Accrued / Expected published; E01 COMPLETE / RELEASE-READY. |
| `docs/product-vision.md` | §14 E01 COMPLETE / RELEASE-READY. E02–E05 remain in planning. |

R1 freeze / certification / production-validation snapshots were not rewritten.

### Documented E01 semantics (unchanged)

- Accrued: TimeEntry quantity + commercial snapshot. HOURLY additive. DAILY one billable day, minute-weighted (R2-OD-016). Out-of-validity history retained.
- Expected: live HOURLY Contract × pro-rata capacity. Null capacity → null. DAILY → null.
- Snapshot baseline: `snapshotBillingModel` / `snapshotRate` / `snapshotCurrency` captured at TimeEntry create. Contract edit does not rewrite. Backfill R2-OD-017.
- Mixed currency: per-currency figures only. No FX. No mixed-currency total.
- Timezone: `Workspace.timezone` for periods / today. DAILY grouping uses stored UTC-midnight `workDate`.
- Live Contract vs historical snapshot: Expected rereads live Contract. Accrued reads snapshot only.
- Reporting: `MonthlyAnalytics` / `ContractReport` / `AnnualOverview` publish the same AnalyticsService figures. HoursByClient remains hours-only. UI does not render money.

### QA evidence (from P-E01-06; not re-run)

| Item | Value |
| --- | --- |
| QA Verdict | PASS WITH FINDINGS |
| F-E01-001 | CLOSED |
| F-E01-002 | CLOSED (this phase) |
| Unit | 504 / 504 |
| Integration Accrued / Expected / revenue / reporting / snapshot / weekly | 71 / 71 |
| Integration isolation / membership / timezone / product decisions | 34 / 34 |
| Integration performance | 1 / 1 |
| Typecheck / lint / build | PASS |
| AC-01…AC-17 | PASS |
| Performance baseline | Annual overview 26 ms at 100 clients / 50 contracts / 1000 TimeEntries. E01 adds 2 parallel reads per month. No serial N+1. |
| Blocker | None |

Unit 504 is the full unit suite from the QA run. It is not a sum of the focused Accrued / Expected / Analytics / Reporting subsets.

### Final status

```text
R2-E01 Revenue Visibility = COMPLETE / RELEASE-READY

NEXT:                      R2-E02 Invoice Tracking
E02 / E03 / E04 / E05:     NOT COMPLETE
R2 PRODUCTION-READY:       NO
```
