# EPIC-105 — Reporting

**Epic:** EPIC-105  
**Release:** Release 1 — MVP  
**MASTER_PLAN identifier:** R1-E05 — Reporting (`MASTER_PLAN.md` §15)  
**Status:** PLANNING — **READY FOR IMPLEMENTATION**  
**Dependencies:** EPIC-002, EPIC-003, EPIC-004, EPIC-005, EPIC-006, EPIC-101, EPIC-102, EPIC-103, EPIC-104  
**Previous Epic:** EPIC-104 Analytics & Dashboard (`docs/epics/EPIC-104/engineering-review.md`, commit `b387c01`)  
**Next Epic:** R1-E06 Alerts & Notifications (`MASTER_PLAN.md` §16)  
**Product Owner:** Human  
**Architect:** Assistant  
**Implementation Engineer:** Cursor  

```text
PLANNING:              COMPLETE
PRODUCT DECISIONS:     6 BLOCKING — ALL RESOLVED BY THE PRODUCT OWNER
                       6 NON-BLOCKING — DOCUMENTED DEFAULTS ACCEPTED
BLOCKING DECISIONS:    NONE OUTSTANDING
IMPLEMENTATION:        IN PROGRESS — P105-04 IS NEXT
P105-01:               COMPLETE — commit 134800f
P105-02:               COMPLETE — commit 756649d
P105-03:               COMPLETE — commits 428f6e4 + 6822600 (corrective)
OBD CLOSED:            NONE
OBD DEPENDENCY:        OBD-012 OPEN — GATES ROLLOVER / EXPIRY SEMANTICS ONLY
EPIC-104 FINDINGS:     NONE RESOLVED BY THIS PLAN, NONE REOPENED
                       F-104-001, F-104-002, F-104-014 ADDRESSED IN P105-02 —
                       CLOSURE IS THE ENGINEERING REVIEW'S CALL (§16.1)
EPIC-105 FINDINGS:     F-105-001 OPEN — PRE-EXISTING E2E FAILURE (§16.4)
                       F-105-002 CLOSED — verified by final P105-03 Engineering Review
                       F-105-003 CLOSED — verified by final P105-03 Engineering Review
                       F-105-004 CLOSED — verified by final P105-03 Engineering Review
                       F-105-005 CLOSED — verified by final P105-03 Engineering Review
                       F-105-006 CLOSED — verified by final P105-03 Engineering Review
                       F-105-007 CLOSED — verified by final P105-03 Engineering Review
                       F-105-008 OPEN — NON-BLOCKING comment nit (§16.4)
```

This plan was produced entirely from the documentation synchronized by
EPIC-104 and from the code as it exists at commit `b387c01`. It does
not invent scope and does not resolve, reinterpret, or close any
EPIC-104 finding or Open Business Decision.

**Revision — Product Decisions applied.** The six blocking decisions
PD-105-001 … PD-105-006 were answered by the Product Owner and are
recorded verbatim in §7 with their consequences. The plan moved from
`BLOCKED ON PRODUCT DECISIONS` to `READY FOR IMPLEMENTATION`. Three
EPIC-104 findings acquire a settled semantic target as a result
(F-104-003, F-104-017, F-104-005) and are reclassified accordingly in
§16.1 — **none of them is closed by this plan**; each is closed only by
the phase that implements it, under its own review. No OBD was closed.
OBD-012 remains open and now has a precise, narrow gate (§8).

EPIC-104 is closed as PASS WITH FINDINGS, engineering-complete,
production readiness NO, blocking findings NONE. Nothing in this plan
reopens it. Where this plan schedules work on an EPIC-104 finding, that
work is **EPIC-105 scope**, not an EPIC-104 correction.

---

## 1. Source Documents

| Document | Used for |
| --- | --- |
| `MASTER_PLAN.md` §15 | R1-E05 objective, scope baseline, dependencies, exit criterion |
| `MASTER_PLAN.md` §14 | R1-E04 delivered scope and the revenue/alerts scope reconciliation |
| `MASTER_PLAN.md` §38, §39, §47, §48 | findings register, Open Business Decisions, next action, machine-readable state |
| `docs/epics/EPIC-104/engineering-review.md` | **primary source** for findings, test evidence, known gaps, product decisions, delivered capability |
| `docs/epics/EPIC-104/epic-plan.md` | PD-104-001 … PD-104-004, BR-104-*, SI-104-*, phase/commit conventions |
| `docs/architecture.md` §5.6, §17, §33 R-005, §34 | analytics module boundary, reporting architecture, reporting-divergence risk, architectural acceptance criteria |
| `docs/domain-model.md` §9 | analytics domain rules as synchronized by EPIC-104 |
| `docs/testing-strategy.md` §11, §12, §36, §37 | reporting tests, reporting period tests, UI states, performance smoke tests |
| `docs/epics/EPIC-101/epic-plan.md`, `EPIC-102/epic-plan.md`, `EPIC-103/engineering-review.md` | OBD-013 … OBD-016 proposal status, P102-F-001, archived-client precedents |
| `src/application/analytics/analytics-service.ts`, `src/infrastructure/persistence/analytics-repository.ts`, `src/lib/analytics-periods.ts`, `src/domain/analytics-types.ts` | capability inventory (§4) |
| `src/app/(app)/reports/page.tsx`, `src/lib/navigation.ts`, `src/app/(app)/time-tracking/page.tsx` | existing route placeholder, navigation entry, existing week-boundary and search-param precedents |

Where a historical document and the EPIC-104-synchronized documentation
disagree, the synchronized documentation wins and the divergence is
recorded as a planning finding (§16), not silently resolved.

---

## 2. Product Objective

From `MASTER_PLAN.md` §15, verbatim:

```text
Provide reliable operational reporting.
```

Exit criterion, verbatim:

```text
Dashboard and reports agree on the same underlying business figures.
```

The exit criterion is the defining constraint of this Epic. It is not a
testing detail: it dictates that Reporting must consume the shared
analytics capability rather than compute its own figures, and it makes
`R-005 — Reporting divergence` (`docs/architecture.md` §33) the primary
risk EPIC-105 exists to mitigate.

### What "reliable" means here

1. Every published figure is traceable to one shared calculation.
2. The same period produces the same figure on every surface.
3. A figure that cannot be computed is absent or `—`, never fabricated.
4. Period boundaries are defined, documented, and tested.
5. No report can read data outside the caller's workspace.

---

## 3. Scope

### 3.1 MASTER_PLAN §15 baseline, verbatim

```text
today
week
month
year
custom period
hours by client
revenue by client
contract report
annual overview
```

### 3.2 Reconciliation against the implemented reality

The baseline was written before any analytics existed. Reconciling it
with EPIC-104's delivered capability, the synchronized findings, and the
resolved Product Decisions of §7 produces the table below. Every item is
now either **in scope with a settled semantic** or **excluded by an
explicit decision**; no item remains decision-gated.

| Baseline item | Reconciled status | Rationale |
| --- | --- | --- |
| `month` | **In scope** | `getMonthPeriod` / `getCurrentMonthPeriod` exist; monthly aggregation is delivered and integration-proven. The current month now ends **today** (PD-105-002), which changes `getCurrentMonthPeriod` in P105-03 |
| `hours by client` | **In scope** | `getClientAllocations` delivers per-client total, billable, percentage, and `isArchived` |
| `custom period` | **In scope** | `getDateRangePeriod` exists and `AnalyticsService` accepts arbitrary periods. The two gaps EPIC-104 predicted in its F-104-018 note are now settled: period end by PD-105-002, denominator by PD-105-005 |
| `today` | **In scope** | Definable now that `Workspace.timezone` is the authority (PD-105-003). Requires the timezone-aware period resolver in P105-03 |
| `week` | **In scope, requires new capability** | No weekly aggregation exists anywhere in the analytics layer (F-104-013). Its presence in the §15 baseline and in `docs/testing-strategy.md` §12 is the evidence that weekly reporting **is** required by R1-E05. Current week runs week start → today (PD-105-002) |
| `year` | **In scope** | Multi-month periods are already accepted; the denominator is pro-rated per PD-105-005. Current year runs 1 January → today (PD-105-002) |
| `annual overview` | **In scope** | Pro-rated denominator per PD-105-005, plus the monthly bucketing needed to present a year |
| `contract report` | **In scope** | All three previously missing semantics are settled: ongoing means `validTo === null` (PD-105-004), capacity is pro-rated (PD-105-005), and the contract list is relevance-driven with out-of-validity time retained and flagged (PD-105-006) |
| `revenue by client` | **OUT OF SCOPE — decided (PD-105-001)** | EPIC-105 calculates no revenue, monetary amount, estimated revenue, invoicing, or billing amount. `MASTER_PLAN.md` §15 must be corrected and reconciled explicitly in P105-07, the way §14 was. OBD-001, OBD-002, OBD-011, OBD-016 remain **open** and are not closed by the exclusion. Tracked as **F-105-P-001**, resolution recorded, documentation reconciliation pending |

### 3.3 EPIC-105 scope as planned

**Group A — prerequisites owned by EPIC-105** (shared-layer work that
the exit criterion requires before any report is published):

- decouple the analytics integration suite from the system clock
  (F-104-006, materially invalid from 2026-10-01);
- consolidate the duplicated percentage arithmetic onto one shared
  implementation reachable from production code (F-104-002);
- replace the hardcoded 30-day divisor with the period's real day count
  (F-104-001) so dashboard and reports cannot disagree on averages;
- add a workspace-membership guard inside `AnalyticsService`
  (F-104-014) before a second consumer exists.

**Group B — new shared analytics capability:**

- period resolution authoritative on `Workspace.timezone`
  (PD-105-003; F-104-005 / F-104-P-002 become the technical prerequisite
  this work satisfies);
- period constructors for today, week, month, year, and custom range,
  where any period containing today ends **today** (PD-105-002) and the
  week starts Monday (PD-105-009);
- weekly aggregation (F-104-013);
- pro-rata contractual capacity as one shared, deterministic
  calculation (PD-105-005);
- the ongoing/unlimited separation as two independent properties
  (PD-105-004);
- deterministic, explicit-locale period labelling (F-104-015).

**Group C — reporting capability and surface:**

- a thin reporting application capability that resolves and validates
  the requested period and orchestrates shared analytics calls;
- the `/reports` route, replacing the existing
  `PlaceholderPage` (`src/app/(app)/reports/page.tsx`), already present
  in `src/lib/navigation.ts`;
- period selection driven by validated URL search parameters, following
  the `?view=week&start=…` precedent already used by `/time-tracking`;
- hours by client;
- contract report: relevance-driven contract list including
  zero-consumption contracts, pro-rated capacity, the ongoing/unlimited
  separation, and out-of-validity time retained and flagged
  (PD-105-004, PD-105-005, PD-105-006);
- annual overview with per-month buckets;
- loading, zero-activity, and error states with a real recovery path
  (F-104-016 pattern not to be repeated).

**Group D — evidence:**

- separate unit, integration, and E2E suites (§13);
- a dashboard/report agreement test that directly proves the §15 exit
  criterion;
- a recorded query-performance baseline at realistic volume
  (F-104-009 / F-104-P-001), with no pass/fail threshold unless
  PD-105-008 establishes one;
- sound accessibility assertions only (F-104-010 constraint).

---

## 4. Analytics Foundation — Capability Inventory

`AnalyticsService` / `AnalyticsRepository` are an **existing capability**.
EPIC-105 extends them. It must not create a second analytics layer, a
reporting-specific aggregation path, or a reporting copy of any formula.
This is the architectural constraint derived from F-104-002,
`MASTER_PLAN.md` §14, `docs/architecture.md` §17 ("the reporting layer
must not create an independent source of truth") and §34 ("dashboard and
reporting share calculation services").

### 4.1 Available now

| Capability | Location | Proven by |
| --- | --- | --- |
| Monthly analytics (total, billable, non-billable, billable %) | `analytics-repository.ts:16-65` | integration + E2E |
| Daily analytics with per-client breakdown | `analytics-repository.ts:68-187` | integration (`analytics-isolation.test.ts`) — **no production consumer** |
| Client allocation, archived clients included and flagged | `analytics-repository.ts:226-297` | integration + E2E (PD-104-001) |
| Contract utilization, all tracked time as numerator | `analytics-repository.ts:300-365` | integration (PD-104-002) |
| Arbitrary-period acceptance | `analytics-service.ts:37-91` | integration |
| Period utilities: `getCurrentMonthPeriod`, `getMonthPeriod`, `getDateRangePeriod`, `isValidPeriod`, `isDateInPeriod`, `getPeriodDays`, `formatPeriodDisplay` | `src/lib/analytics-periods.ts` | unit |
| Workspace scoping on every query | every `where: { workspaceId }` | 6 integration scenarios |
| Integer-minute arithmetic; `null` for zero denominator | throughout | unit + integration |
| Fail-closed on a malformed workspace identifier | `withPersistenceErrors` → `InvalidPersistenceStateError` | integration (F-104-000 resolution) |
| Authenticated shell, navigation entry, `/reports` route placeholder | EPIC-006 + `src/app/(app)/reports/page.tsx` | E2E (app shell) |

### 4.2 Required by Reporting

| Requirement | Satisfied by what exists? |
| --- | --- |
| Monthly report | YES — reuse `getMonthlyAnalytics` |
| Hours by client | YES — reuse `getClientAllocations` |
| Custom date range | PARTIAL — `getDateRangePeriod` exists; no validated input path, no UI, and F-104-017 / F-104-004 become material |
| Today | PARTIAL — a one-day period is expressible; "today" is not resolvable without PD-105-003 |
| Week | NO — see §4.3 |
| Year / annual overview | PARTIAL — the period is expressible; per-month bucketing and a correct utilization denominator are not available |
| Contract report | PARTIAL — utilization exists; validity filtering, zero-consumption contracts, and ongoing semantics are not settled |
| Figures identical to the dashboard | NO — F-104-002 and F-104-001 mean the dashboard's numbers do not all come from the shared implementations |

### 4.3 Missing / requires extension

| Gap | Finding | EPIC-105 treatment |
| --- | --- | --- |
| Weekly aggregation | F-104-013 | **In scope.** Derive weekly buckets inside the analytics layer. Preferred option: compose from the already-implemented `getDailyAnalytics` rather than adding new SQL, so no new index or raw query is introduced and the daily path finally gains a production consumer. Alternative (`groupBy` on a week expression) requires new SQL and is not preferred without a measurement that justifies it (`docs/architecture.md` §17) |
| Timezone-authoritative boundaries | F-104-005, F-104-P-002 | **In scope, target settled.** `Workspace.timezone` is the authority (PD-105-003). This is a real technical prerequisite for every period constructor and is scheduled in P105-03 — not implemented during planning |
| Period end semantics for a period containing today | F-104-017 | **In scope, target settled.** Any period containing today ends today (PD-105-002). `getCurrentMonthPeriod` changes in P105-03; the affected dashboard integration assertions are updated there, not in P105-01 |
| Utilization denominator scaled to period length | F-104-004, OBD-012 | **In scope, target settled.** Capacity is pro-rated over the period, accounting for period length and contract-validity overlap (PD-105-005). Null capacity yields a null percentage. **OBD-012 remains open** and gates only the rollover/expiry-dependent portion (§8) |
| Contract validity `[validFrom, validTo)` filtering; zero-consumption contracts invisible | F-104-004, BR-104-007/008/009 | **In scope, target settled.** The contract list is relevance-driven, so a relevant contract with no tracked time appears as `0h / capacity / 0%`. Out-of-validity time is retained in the contract's historical count and flagged, never silently dropped (PD-105-006) |
| `isOngoing` derived from capacity, not `validTo` | F-104-003 | **In scope, semantics settled.** Ongoing means `validTo === null`; unlimited means `monthlyContractedMinutes === null`; the two are independent (PD-105-004) |
| Single reachable percentage implementation | F-104-002 | **In scope, Group A** |
| Period-aware daily average | F-104-001 | **In scope, Group A** |
| Service-level membership guard | F-104-014 | **In scope, Group A** |
| Deterministic period labels | F-104-015 | **In scope, Group B** |
| Measured performance baseline | F-104-009, F-104-P-001 | **In scope as measurement only** |
| Real loading and error/recovery behaviour | F-104-008, F-104-016 | **In scope for new reporting surfaces only** |

### 4.4 Explicitly reusable precedents (do not reinvent)

- `getCurrentWorkspaceContext()` for server-side tenant resolution.
- `getAuthorizedWorkspace` as the membership-guard reference for
  F-104-014.
- `Intl.DateTimeFormat` with an explicit locale, as already used in
  `src/features/contracts/contract-display.ts`, for deterministic dates.
- URL search parameters as the only period state, as already used by
  `/time-tracking` — no client-side state manager.
- `PageHeader` / `PageContent` / `EmptyState` / `ErrorState` from
  EPIC-006 for surface composition.

---

## 5. Explicit Non-Goals

| Non-goal | Authority |
| --- | --- |
| Revenue, rates, amounts, currency, estimated revenue, invoicing, billing amounts, or any monetary figure | **PD-105-001 — decided, unconditional.** OBD-001 / OBD-002 / OBD-011 / OBD-016 remain open and are not closed by the exclusion |
| Invoicing, billing, payment tracking | Release 2 (`MASTER_PLAN.md` §R2-E02) |
| Alerts, thresholds, notifications, capacity warnings | R1-E06; OBD-006 open. The 80 percent bar colour in `ContractUtilization.tsx` is a visual cue and must not be reused as a threshold |
| Forecasting, projections, trends | R2-E03 |
| CSV / PDF / Excel export, advanced filtering, richer annual analysis | R2-E04 |
| Profitability, client concentration, commercial intelligence | R2-E05 |
| AI or LLM involvement in any figure | `docs/architecture.md` ADR / R-006 |
| Saved report definitions, scheduled or emailed reports, client-facing sharing | not in any approved scope |
| Charts or a charting dependency | not in §15 scope; tabular presentation is the accepted default (PD-105-010) |
| Contract-hour rollover, carry-over, or expiry semantics | OBD-012 open. Pro-rata capacity (PD-105-005) is computed **without** rollover; inventing one is forbidden |
| A second analytics layer, reporting-specific SQL, materialized views, or a data warehouse | `docs/architecture.md` §17 |
| Microservices, event bus, client-side state management, new frameworks | architecture baseline |
| Retrofitting dashboard loading skeletons (F-104-008 on existing surfaces) | deferred; EPIC-105 owns loading only for its own new surfaces |
| Resolving P102-F-001 by adding commercial snapshots | EPIC-102 finding; out of scope |
| Closing or promoting any OBD | `MASTER_PLAN.md` §39 |
| Fixing EPIC-002 / EPIC-003 / EPIC-004 findings | out of scope |
| Changing the intentional dynamic rendering of `/` | EPIC-104 review §9 |
| A `/dashboard` route | does not exist and is not planned |

---

## 6. Dependencies

```text
EPIC-104 Analytics & Dashboard   shared AnalyticsService / AnalyticsRepository (hard)
EPIC-103 Time Tracking           TimeEntry source data, stored clientId/contractId/workDate
EPIC-102 Contract Management     Contract capacity and validity fields
EPIC-101 Client Management       Client identity and ARCHIVED status
EPIC-004 Workspace               WorkspaceContext, membership, workspace.timezone
EPIC-003 Authentication          authenticated session
EPIC-006 UI Foundation           AppShell, navigation entry, PageHeader, EmptyState, ErrorState
EPIC-005 Testing & CI            six-gate quality workflow, separate unit/integration/E2E projects
```

### Decision dependencies

**Satisfied.** PD-105-001 … PD-105-006 are resolved and recorded in §7.
The `MASTER_PLAN.md` §47 precondition — Product Owner clarification on
F-104-003 and F-104-017 before R1-E05 — is met by PD-105-004 and
PD-105-002 respectively.

One narrow decision dependency remains and does not block the Epic:

| Dependency | Status | What it gates |
| --- | --- | --- |
| OBD-012 — contract-hour rollover / expiry | **Open** | Only the rollover/expiry-dependent portion of capacity. Pro-rata capacity (PD-105-005) is computed with **no** rollover, carry-over, or expiry semantics. If a report is ever required to express carried-over or expired hours, OBD-012 must be resolved first; EPIC-105 must not invent a policy |
| OBD-002 — monetary rounding | Open | Nothing in EPIC-105, because monetary figures are out of scope (PD-105-001). Must still be respected before any monetary figure is published in a later Epic |

### Schedule dependency

F-104-006 makes the analytics integration suite fail from
**2026-10-01**. EPIC-105 cannot produce trustworthy integration
evidence on top of a red suite, so P105-01 is time-critical and
independent of every Product Decision.

---

## 7. Product Decisions

The six blocking decisions are **resolved by the Product Owner** and are
recorded below with the question, the options considered, the decision
as given, and its consequences. The options are retained as the audit
record of what was weighed; the `Decision` line is authoritative.

The six non-blocking decisions keep the documented defaults derived from
approved documentation or existing implemented behaviour. They are
accepted as implementation defaults and **do not close any OBD**.

No Product Decision is outstanding. No new Product Decision is
introduced to replace a resolved one.

### PD-105-001 — Revenue reporting — **RESOLVED**

- **Question:** `MASTER_PLAN.md` §15 lists `revenue by client` in R1-E05
  scope. EPIC-104 declared revenue and all monetary calculation explicit
  non-goals, and no monetary amount is computed anywhere in the
  codebase. Is `revenue by client` in EPIC-105 scope?
- **Options:**
  1. **Out of scope for R1-E05**, deferred with the rest of monetary
     work; `MASTER_PLAN.md` §15 is corrected the way §14 was corrected.
  2. **In scope**, which first requires OBD-001 (daily-rate semantics /
     partial days), OBD-002 (monetary rounding), and OBD-011
     (multi-currency) to be resolved, plus a decision on whether amounts
     are computed from live `Contract` fields or from a snapshot
     (P102-F-001 / OBD-016).
- **Technical impact:** Option 2 adds monetary types, a rounding policy,
  a currency policy, and a revenue calculation to the shared analytics
  layer, and makes P102-F-001 material because amounts computed from
  live contract fields change retroactively when a contract is edited.
  It adds at least two phases.
- **Dependencies:** OBD-001, OBD-002, OBD-011, OBD-016, P102-F-001.
- **Decision:** **option 1 — OUT OF SCOPE for EPIC-105.** EPIC-105
  calculates no revenue, no monetary amount, no estimated revenue, no
  invoicing and no billing amount. The historical `revenue by client`
  reference must be corrected and reconciled explicitly, the way
  `MASTER_PLAN.md` §14 was reconciled.
- **Consequences:** revenue becomes an unconditional non-goal (§5);
  BR-105-011 becomes absolute; no revenue phase exists in §12;
  `MASTER_PLAN.md` §15 and `docs/testing-strategy.md` §11 are reconciled
  in P105-07. **OBD-001, OBD-002, OBD-011 and OBD-016 remain open** and
  are explicitly **not** closed by this exclusion.
- **Status:** RESOLVED.

### PD-105-002 — Canonical period-end semantics — **RESOLVED**

- **Question:** For a period that contains today, does the period end on
  today or on the last day of the period? PD-104-003 says "through
  today"; `getCurrentMonthPeriod()` returns the last day of the month
  (F-104-017). Which text is canonical, and does the answer apply to
  week, month, and year alike?
- **Options:**
  1. Periods always span their full calendar extent; future-dated
     entries inside the current period are included.
  2. A period containing today is truncated at today; only an explicitly
     selected future period shows future entries.
  3. Full extent for aggregation, truncated only for
     average/rate-style figures.
- **Technical impact:** Determines every period constructor, the daily
  average denominator (with F-104-001), the utilization denominator
  (with PD-105-005), and whether the dashboard's current behaviour
  changes. Option 2 changes existing dashboard figures and therefore
  existing integration assertions.
- **Dependencies:** F-104-017, F-104-001, PD-105-005.
- **Decision:** **option 2 — a period containing today ends TODAY.**

  ```text
  current month   first day of month → today
  current week    week start         → today
  current year    1 January          → today
  historical complete periods        natural period end, unchanged
  ```

  Future-dated entries are therefore excluded from default
  current-period reporting and appear only when a future period is
  explicitly selected.
- **Consequences:** PD-104-003's "through today" text is canonical and
  **F-104-017's ambiguity is settled in favour of "through today"**.
  `getCurrentMonthPeriod()` must be changed in P105-03, which changes
  the current-month figure the dashboard displays when the month is not
  over, so the affected dashboard and analytics integration assertions
  are updated in **P105-03** — explicitly not in P105-01, which is a
  pure test-durability phase. The rule is formalised as BR-105-015.
- **Status:** RESOLVED.

### PD-105-003 — Timezone authority for period boundaries — **RESOLVED**

- **Question:** Which clock defines "today", the start of a week, and
  month/year boundaries: `workspace.timezone` (stored and populated,
  never read), the server's local clock (current behaviour), UTC, or the
  browser?
- **Options:**
  1. `workspace.timezone` is authoritative for all period resolution
     and all period labelling.
  2. UTC is authoritative and the UI states it.
  3. Server local clock remains authoritative (status quo, explicitly
     accepted as a limitation).
- **Technical impact:** Option 1 is the documented intent (EPIC-104 plan
  §12) and requires a timezone-aware period resolver plus tests across
  timezones, which do not exist in any suite. `workDate` is a calendar
  date, which limits the blast radius but does not remove the boundary
  problem for "today" and for month/year edges. Option 3 leaves "today"
  wrong for any workspace not in the server's timezone and makes
  `formatPeriodDisplay` render the wrong month at negative UTC offsets.
- **Dependencies:** F-104-005, F-104-P-002 (confirmed), OBD-003 (closed
  as not-required, not reopened here).
- **Decision:** **option 1 — `Workspace.timezone` is the authority.** It
  governs today, week boundaries, month boundaries, year boundaries, and
  all reporting period construction. The server's local timezone is
  **not** the authority. UTC is **not** the business authority.
- **Consequences:** **F-104-005 becomes a genuine technical prerequisite
  for Reporting**, not a deferred improvement, and F-104-P-002 becomes
  an explicit technical requirement rather than a confirmed concern.
  Neither is implemented during planning: the requirement is documented
  here and scheduled in P105-03, which must add period-boundary tests
  under at least two workspace timezones — tests that exist in no suite
  today. The rule is formalised as BR-105-014. UTC remains acceptable as
  a storage and transport representation; it is simply not the authority
  for deciding which calendar day a boundary falls on.
- **Status:** RESOLVED.

### PD-105-004 — Ongoing-contract semantics — **RESOLVED**

- **Question:** Is a contract "ongoing" when `validTo` is null
  (PD-104-004 text) or when `monthlyContractedMinutes` is null
  (implemented behaviour, F-104-003)? How should a contract report
  present an expired contract with no capacity, and an open-ended
  contract that has capacity?
- **Options:**
  1. Reconcile the decision text to the code: "ongoing" means "no
     capacity to measure against"; rename the user-visible label so it
     stops implying open-ended validity.
  2. Reconcile the code to the text: `isOngoing = validTo === null`, and
     introduce a separate `hasCapacity` concept for the null-denominator
     case.
  3. Expose both concepts explicitly: validity state and capacity state
     are separate columns in the contract report.
- **Technical impact:** Changes `ContractUtilization`, its consumers,
  and the integration tests that currently lock the divergence
  (`dashboard-page.test.ts:52-60,137` and
  `analytics-isolation.test.ts:230` assert opposite semantics).
- **Dependencies:** F-104-003, PD-104-004, PD-105-006.
- **Decision:** **option 3 — the two concepts are separate and
  independent.**

  ```text
  ongoing    ≡  contract.validTo === null
  unlimited  ≡  contract.monthlyContractedMinutes === null
               (no contractual capacity denominator)
  ```

  All four combinations are valid and must be representable: ongoing +
  capped, ongoing + unlimited, finite + capped, finite + unlimited.
  Capacity must never again be used as a proxy for validity.
- **Consequences:** **F-104-003's divergence is settled in favour of the
  decision text.** `ContractUtilization` gains the validity state as a
  property distinct from the capacity state; `isOngoing` is recomputed
  from `validTo`; `AnalyticsService.isOngoingUtilization`, which today
  tests `contractedMinutes === null`, is corrected or replaced. The two
  integration tests that currently lock the opposite semantics —
  `dashboard-page.test.ts:52-60,137` (asserts `isOngoing === false` for
  `validTo: null`) and `analytics-isolation.test.ts:230` (asserts
  `isOngoing === true` for a contract whose `validTo` is `2026-07-01`) —
  are corrected in **P105-04**, the phase that implements the semantics,
  and explicitly not in P105-01. The rule is formalised as BR-105-016.
- **Status:** RESOLVED.

### PD-105-005 — Utilization denominator for non-monthly periods — **RESOLVED**

- **Question:** `monthlyContractedMinutes` is a monthly capacity used
  directly as the denominator for any period length. What is the correct
  denominator for a day, a week, a year, and an arbitrary range?
- **Options:**
  1. Pro-rate capacity by period length (requires a rule for partial
     months and for months in which the contract was not valid for the
     whole month).
  2. Multiply by the number of whole months covered; refuse to publish a
     percentage for periods that are not whole months.
  3. Publish utilization **only** for monthly periods; other periods
     show consumed hours without a percentage.
  4. Sum monthly capacity per covered month with no carry-over — which
     is a rollover decision and therefore requires OBD-012.
- **Technical impact:** Determines whether `year`, `annual overview`,
  `week`, `today`, and `custom period` can display utilization at all.
  Option 1 is the only one that yields a percentage for arbitrary ranges
  and is the only one that requires OBD-012 to be settled first.
- **Dependencies:** F-104-004, OBD-012, PD-105-002.
- **Decision:** **option 1 — capacity is PRO-RATED over the reporting
  period.** The pro-rata capacity accounts for the reporting period's
  length, the overlap between the period and the contract's validity
  interval, and the contract's monthly capacity. It applies uniformly to
  day, week, month, year, and custom ranges.

  When `monthlyContractedMinutes === null`, the utilization percentage
  is `null`. No capacity is invented.

  The pro-rata calculation is **one shared deterministic
  implementation** in the analytics layer. It must not be duplicated in
  the UI, in the reporting layer, or in a component.
- **Consequences:** F-104-004's unscaled monthly denominator acquires a
  settled target and is implemented in P105-04. **OBD-012 stays open**
  and gates only the rollover/expiry-dependent behaviour: pro-rata
  capacity is computed with **no** rollover, carry-over, or expiry
  semantics, and no such policy may be invented. Because pro-rata
  capacity depends on the validity overlap, it also depends on
  PD-105-004's validity semantics and on PD-105-002's period end. The
  rule is formalised as BR-105-017.
- **Status:** RESOLVED, with OBD-012 recorded as a narrow open
  dependency (§6, §8).

### PD-105-006 — Contract validity and zero-consumption contracts — **RESOLVED**

- **Question:** Which contracts appear in a contract report for a
  period: only contracts with consumption in the period (current
  behaviour), or all contracts whose `[validFrom, validTo)` interval
  overlaps the period, including those at `0h / 80h (0%)`? Must
  consumption recorded outside a contract's validity be excluded,
  flagged, or counted?
- **Options:**
  1. Consumption-derived list only (status quo). Simple; a contract with
     capacity and no tracked time stays invisible; BR-104-007/008/009
     remain unimplemented.
  2. Validity-overlap list, showing zero-consumption contracts;
     out-of-validity consumption excluded from the numerator.
  3. Validity-overlap list, showing zero-consumption contracts;
     out-of-validity consumption counted but flagged, so no recorded
     time silently disappears from a report.
- **Technical impact:** Option 1 keeps the current query shape. Options
  2 and 3 require the contract set to be queried independently of
  consumption and require `[validFrom, validTo)` predicates. Option 2
  can make a report total smaller than the time-tracking total for the
  same period, which is a reliability problem the objective cares about.
  The application layer already prevents recording against an
  out-of-validity contract, so the case is not currently reachable
  through the UI.
- **Dependencies:** F-104-004, BR-104-007/008/009, PD-105-004.
- **Decision:** **option 3 — relevance-driven list, out-of-validity time
  retained and flagged.**
  1. The contract report includes the contracts **relevant to the
     reporting period**, and must not derive the list exclusively from
     the contracts that have consumption. A relevant contract with no
     `TimeEntry` appears as `0h / contracted capacity / 0%` whenever
     capacity is available.
  2. A `TimeEntry` carrying a `contractId` whose `workDate` falls
     outside that contract's validity is **not** silently removed. It
     remains in the contract's historical count and is **flagged as
     out-of-validity / anomalous data** wherever reporting encounters
     it.
- **Rationale as given:** preserve consistency with the stored
  historical time and never produce a report whose total differs from
  the Time Tracking total merely because reporting excluded rows. The
  application layer already prevents *new* out-of-validity entries, so
  this rule exists for historical and legacy data.
- **Consequences:** the contract set is queried independently of
  consumption, which BR-104-007/008/009 required and EPIC-104 did not
  implement; `ContractUtilization` gains an out-of-validity indicator;
  the reporting surface must surface the flag rather than hide it; the
  report total remains reconcilable with the Time Tracking total for the
  same period, which is directly testable. "Relevant to the period"
  means the contract's `[validFrom, validTo)` interval overlaps the
  period, **or** the contract has time recorded in the period — the
  union, so neither a zero-consumption relevant contract nor an
  anomalous historical row can disappear. The rule is formalised as
  BR-105-018.
- **Status:** RESOLVED.

### PD-105-007 — Rounding policy for published percentages — ACCEPTED DEFAULT

- **Question:** What rounding applies to percentages a report publishes?
  `AnalyticsService.formatPercentage` applies `Math.round` at the
  presentation boundary while domain values stay unrounded.
- **Impact:** Rounded figures must be consistent between dashboard and
  reports, or the exit criterion fails cosmetically. Percentage rounding
  should be settled with OBD-002, per `MASTER_PLAN.md` §39, before R1-E05
  publishes figures.
- **Default (accepted; implementation default only, does not close
  OBD-002):** keep unrounded domain values and round only at the
  presentation boundary, exactly as `formatPercentage` does today. This
  is not a blocker: monetary figures are out of scope (PD-105-001), so
  OBD-002 constrains only percentage presentation here and must still be
  respected before any monetary figure is published in a later Epic.
- **Status:** ACCEPTED DEFAULT — not a blocker.

### PD-105-008 — Performance threshold and fixture volume — ACCEPTED DEFAULT

- **Question:** Is there an approved query-time or page-load threshold
  for reporting, and at what data volume?
- **Impact:** No approved threshold exists. EPIC-104's two-second target
  was unevidenced (F-104-009) and F-104-P-001 is still unmeasured.
- **Default (accepted):** measure and record a baseline at a declared
  fixture volume; do **not** introduce a pass/fail gate on an invented
  number. A threshold is introduced only if a real need appears.
- **Status:** ACCEPTED DEFAULT — not a blocker.

### PD-105-009 — Week definition — ACCEPTED DEFAULT

- **Question:** Does a reporting week start on Monday, and is it an
  ISO-8601 week?
- **Impact:** Weekly aggregation and its boundary tests.
- **Default (accepted; from existing implemented behaviour):**
  Monday-start, as implemented by `getWeekStart` in
  `src/app/(app)/time-tracking/page.tsx`. That helper is local-clock
  based and lives in a route file; EPIC-105 promotes the convention into
  the shared period utilities and resolves it against
  `Workspace.timezone` per PD-105-003, rather than duplicating it
  (**F-105-P-003**). The current week ends today per PD-105-002.
- **Status:** ACCEPTED DEFAULT — the convention is already defined, so
  it is not a blocker.

### PD-105-010 — Presentation format and locale — ACCEPTED DEFAULT

- **Question:** Are reports tabular, and which locale formats report
  date ranges?
- **Impact:** F-104-015: `formatPeriodDisplay`'s non-full-month branch
  uses `toLocaleDateString()` with no explicit locale and becomes
  production-reachable as soon as custom ranges exist.
- **Default (accepted):** tabular presentation with semantic `table`
  markup; dates formatted through `Intl.DateTimeFormat` with an explicit
  locale, following the `src/features/contracts/contract-display.ts`
  precedent. No charting dependency.
- **Status:** ACCEPTED DEFAULT — not a blocker.

### PD-105-011 — Zero-activity period presentation — ACCEPTED DEFAULT

- **Question:** What does a report show for a period with no tracked
  time, and does a client with no time in the period appear as a zero
  row?
- **Impact:** Empty-state versus zero-row behaviour for hours by client
  and for the annual overview's empty months.
- **Default (accepted):** a period with no tracked time renders the
  EPIC-006 `EmptyState`; clients with no time in the period are omitted
  from hours by client, mirroring the delivered allocation behaviour.
  Contract rows follow PD-105-006, so a relevant contract with no
  consumption **does** appear at `0h / capacity / 0%` — the contract
  report and hours-by-client deliberately differ here.
- **Status:** ACCEPTED DEFAULT — not a blocker.

### PD-105-012 — Export — ACCEPTED DEFAULT

- **Question:** Does EPIC-105 include any export?
- **Impact:** CSV and PDF are R2-E04 scope and are absent from the §15
  baseline.
- **Default (accepted):** no export in EPIC-105; recorded as a non-goal
  (§5). CSV and PDF are R2-E04 scope.
- **Status:** ACCEPTED DEFAULT — not a blocker.

### Summary

| ID | Subject | Status | Implemented in |
| --- | --- | --- | --- |
| PD-105-001 | Revenue | **RESOLVED — out of scope** | n/a; documentation reconciliation in P105-07 |
| PD-105-002 | Period end = today | **RESOLVED** | P105-03 (BR-105-015) |
| PD-105-003 | `Workspace.timezone` is the authority | **RESOLVED** | P105-03 (BR-105-014) |
| PD-105-004 | Ongoing ≠ unlimited | **RESOLVED** | P105-04 (BR-105-016) |
| PD-105-005 | Pro-rata capacity | **RESOLVED** | P105-04 (BR-105-017) |
| PD-105-006 | Relevance-driven contract list; out-of-validity flagged | **RESOLVED** | P105-04 / P105-05 (BR-105-018) |
| PD-105-007 | Percentage rounding | Accepted default | P105-02 |
| PD-105-008 | Performance baseline, no threshold | Accepted default | P105-06 |
| PD-105-009 | Monday week | Accepted default | P105-03 |
| PD-105-010 | Tables, explicit locale | Accepted default | P105-05 |
| PD-105-011 | Zero-activity presentation | Accepted default | P105-05 |
| PD-105-012 | No export | Accepted default | n/a |

**Outstanding blocking decisions: none.**

---

## 8. Open Business Decisions

EPIC-105 closes no OBD and promotes no proposal. OBD-013 … OBD-016
remain proposals and not policy.

| ID | Relevance to EPIC-105 |
| --- | --- |
| OBD-012 — contract-hour rollover / expiry | **Relevant, directly, and now precisely scoped.** PD-105-005 pro-rates capacity over the reporting period with **no** rollover, carry-over, or expiry semantics. That is implementable today. OBD-012 gates only behaviour that depends on rollover or expiry — carried-over hours, expired-hour forfeiture, or any capacity that survives its period. EPIC-105 must not invent such a policy, and P105-04 must state in its tests that no rollover is applied. **Not closed** |
| OBD-002 — monetary rounding | **Relevant, reduced.** Monetary figures are out of scope (PD-105-001), so OBD-002 constrains nothing EPIC-105 publishes except percentage presentation, where the existing `formatPercentage` behaviour is kept (PD-105-007). It must still be resolved before any monetary figure is published in a later Epic. **Not closed** |
| OBD-001 — daily-rate semantics / partial days | Not required by EPIC-105 because no rate or monetary figure is computed (PD-105-001). **Not closed** |
| OBD-011 — multi-currency | Not required by EPIC-105 because no monetary figure is computed (PD-105-001). **Not closed** |
| OBD-009 — workspace roles | **Relevant.** Roles are `OWNER` / `MEMBER` only, so any member sees the whole workspace's reports, including cross-client allocation. EPIC-105 multiplies the surfaces on which that is visible. No role-based filtering is planned; recorded as a privacy note, not resolved (EPIC-002 F-P2-005) |
| OBD-006 — capacity warning threshold | Deferred to R1-E06. EPIC-105 must not introduce any threshold, colour rule, or warning |
| OBD-015 — archived-client operations | Related. PD-104-001 already settles archived-client inclusion for analytics; reports inherit it without promoting OBD-015 |
| OBD-016 — contract commercial-field mutability | Related. Underlies P102-F-001 and therefore the stability of any historical utilization figure a report publishes: pro-rata capacity (PD-105-005) reads live `Contract` fields, so editing capacity or validity retroactively changes a past report. Documented, **not closed** |
| OBD-003, 004, 005, 007, 008, 010, 013, 014 | Not applicable |

---

## 9. Business Rules

| ID | Rule | Source |
| --- | --- | --- |
| BR-105-001 | Every reporting figure is produced by the shared analytics capability. Reporting contains no business calculation, no aggregation SQL, and no percentage arithmetic of its own | `MASTER_PLAN.md` §14, `docs/architecture.md` §17 / §34, F-104-002 |
| BR-105-002 | Every report query is workspace-scoped; the workspace identifier is resolved server-side and never accepted from the browser | BR-104-001/002/003 |
| BR-105-003 | Reports read the `clientId` and `contractId` stored on each `TimeEntry` and never re-resolve them against current state | `docs/domain-model.md` §9 |
| BR-105-004 | Time recorded for a client later archived remains counted, and archived clients are labelled | PD-104-001 |
| BR-105-005 | Contract-utilization numerators use all tracked time; billable percentage and utilization percentage are independent figures | PD-104-002 |
| BR-105-006 | All durations are integer minutes; no floating-point accumulation | BR-104-010 |
| BR-105-007 | A zero or absent denominator yields `null` and renders as `—`, never `0%` | BR-104-011/012 |
| BR-105-008 | For the same period, a report and the dashboard produce identical figures | `MASTER_PLAN.md` §15 exit criterion |
| BR-105-009 | Period boundaries are inclusive of both endpoints in the time-entry query (`workDate` `gte` / `lte`), as delivered. Contract validity remains the separate `[validFrom, validTo)` half-open interval. The two semantics must not be conflated | `analytics-repository.ts`, BR-104-007/008/009 |
| BR-105-010 | An invalid period fails closed: an invalid range raises `AnalyticsError`, a malformed identifier raises `InvalidPersistenceStateError`. Reporting never substitutes an empty result for a rejected input | F-104-000 resolution |
| BR-105-011 | No monetary amount, rate, currency, estimated revenue, invoicing, or billing figure is computed or displayed anywhere in EPIC-105 | **PD-105-001** |
| BR-105-012 | The only user-controlled report input is the period. It is validated with Zod before reaching the analytics layer and cannot influence tenant scope | BR-105-002 |
| BR-105-013 | No threshold, warning, colour rule, or alert is derived from any report figure | OBD-006, R1-E06 |
| BR-105-014 | **`Workspace.timezone` is the sole authority** for today, week, month, and year boundaries and for all reporting period construction, applied consistently to aggregation and to display. The server's local timezone is not the authority; UTC is not the business authority, though it remains the storage representation | **PD-105-003**, F-104-005, F-104-P-002 |
| BR-105-015 | **A reporting period that contains today ends today.** Current month is first-of-month → today; current week is week start → today; current year is 1 January → today. A historical complete period keeps its natural end. Future-dated entries are therefore excluded from default current-period reporting and appear only when a future period is explicitly selected | **PD-105-002**, F-104-017 |
| BR-105-016 | **Ongoing and unlimited are independent properties.** `ongoing ≡ validTo === null`; `unlimited ≡ monthlyContractedMinutes === null`. All four combinations are valid and representable. Capacity must never be used as a proxy for validity, and validity must never be used as a proxy for capacity | **PD-105-004**, F-104-003 |
| BR-105-017 | **Contractual capacity is pro-rated over the reporting period**, accounting for the period's length, the overlap between the period and the contract's validity interval, and the contract's monthly capacity. It applies uniformly to day, week, month, year, and custom ranges. When `monthlyContractedMinutes` is null the utilization percentage is null and no capacity is invented. The calculation is one shared deterministic implementation and is never duplicated in the UI or the reporting layer. **No rollover, carry-over, or expiry semantics are applied** (OBD-012 open) | **PD-105-005**, F-104-004 |
| BR-105-018 | **The contract report includes the contracts relevant to the period**, not only those with consumption: a relevant contract with no `TimeEntry` appears as `0h / capacity / 0%` when capacity is available. A `TimeEntry` whose `workDate` falls outside its contract's validity is **retained** in that contract's historical count and **flagged as out-of-validity / anomalous**, never silently dropped, so a report total never diverges from the Time Tracking total for the same period merely because reporting excluded rows | **PD-105-006**, BR-104-007/008/009 |

No new commercial rule is created by this plan. BR-105-014 … BR-105-018
restate Product Owner decisions; they invent nothing.

---

## 10. Security and Tenancy

| ID | Invariant | Verification level |
| --- | --- | --- |
| SI-105-001 | The reporting workspace context is resolved server-side through `getCurrentWorkspaceContext()`; no route parameter, search parameter, form field, header, or cookie supplied by the browser can select the tenant | integration + E2E |
| SI-105-002 | No report is callable without a `WorkspaceContext`; the context remains the first parameter of every analytics method | typecheck + unit |
| SI-105-003 | No report renders data from another workspace, including when two workspaces contain identically named clients | integration (two-workspace fixtures) |
| SI-105-004 | Period search parameters are Zod-validated; malformed, reversed, and absurdly wide ranges are rejected or clamped by an explicit rule, never passed through | unit + integration |
| SI-105-005 | `AnalyticsService` verifies caller membership in the target workspace itself, rather than trusting the context assembled by its caller | integration |
| SI-105-006 | Unauthenticated access to `/reports` redirects to sign-in; a session without a resolvable workspace redirects to onboarding, and those redirects are not intercepted by a page-level `catch` | E2E |

### F-104-014 assessment (not resolved here)

`AnalyticsService` forwards `context.workspaceId` with no membership
check. There is no leakage today because `getCurrentWorkspaceContext()`
is the only caller and it resolves the context server-side; an unknown
workspace identifier simply matches no rows, and a malformed one fails
closed.

The finding was recorded as **forward-looking**, and EPIC-105 is exactly
the case it anticipated: Reporting becomes the second consumer, and
R1-E06 Alerts will be the third. The planning assessment is therefore
that SI-105-005 should be satisfied **before** the second consumer
exists, using `getAuthorizedWorkspace` as the reference, and that this
belongs to EPIC-105's Group A prerequisites (P105-02).

This is a planning classification, not a resolution. No code is changed
by this plan, and F-104-014 remains open with its recorded severity and
ownership until EPIC-105 implementation closes it under its own review.

### Privacy note (not resolved)

Roles are `OWNER` / `MEMBER` only (EPIC-002 F-P2-005, OBD-009). Every
member of a workspace can read every report, including cross-client
allocation percentages. EPIC-105 does not introduce role-based report
filtering and does not close OBD-009.

---

## 11. Architecture

### Target shape

```text
src/app/(app)/reports/page.tsx            RSC route — replaces PlaceholderPage
        │   parse + Zod-validate period search params
        ▼
src/features/reporting/*                  presentation-only server components
        │
        ▼
src/application/reporting/reporting-service.ts
        │   period resolution + orchestration ONLY — no business calculation
        ▼
src/application/analytics/analytics-service.ts      shared, extended
        │
        ▼
src/infrastructure/persistence/analytics-repository.ts   extended
        │
        ▼
Prisma aggregate / groupBy over TimeEntry, always where: { workspaceId }
```

Forbidden shape:

```text
Reporting ──▶ Prisma / raw SQL
Reporting ──▶ its own percentage, average, or utilization arithmetic
Reporting ──▶ a second analytics service or read model
```

### Component decisions

| Component | Necessary? | Rationale |
| --- | --- | --- |
| `src/application/reporting/reporting-service.ts` | YES, thin | Something must turn a validated request (`today` / `week` / `month` / `year` / `custom`) into an `AnalyticsPeriod` and call the shared service. Putting that in the route file would repeat the `/time-tracking` pattern of business-adjacent logic in a page. It must contain no arithmetic |
| Timezone-aware period resolver | YES | PD-105-003 / BR-105-014. `Workspace.timezone` must reach period construction, so the resolver takes the workspace timezone as an input rather than reading the process clock. `WorkspaceContext` is the natural carrier; whether it already exposes the timezone or must be extended is an implementation detail of P105-03 |
| New period constructors in `src/lib/analytics-periods.ts` | YES | `getTodayPeriod`, `getWeekPeriod`, `getYearPeriod`, a corrected `getCurrentMonthPeriod` ending today (BR-105-015), and a deterministic label function — all timezone-resolved. Extends the existing module; no new module |
| Pro-rata capacity calculation | YES, shared | PD-105-005 / BR-105-017. One deterministic function in the analytics layer, consumed by utilization. Never in a component, never in the reporting layer. It needs the period, the contract's validity interval, and `monthlyContractedMinutes`; it applies no rollover |
| Weekly aggregation in `AnalyticsService` | YES | F-104-013. Preferred as a composition over the existing `getDailyAnalytics`, avoiding new SQL and giving the daily path a production consumer |
| Relevance-driven contract query | YES | PD-105-006 / BR-105-018. The contract set must be selected by validity overlap **union** in-period consumption, which the current consumption-derived `groupBy` cannot express alone. This is an additional scoped Prisma query on `Contract`, not a new aggregation source of truth |
| New repository method | ONLY IF measured | `docs/architecture.md` §17 permits dedicated aggregation "later if profiling justifies them". Without the P105-06 measurement, weekly composition in the service layer is the correct default |
| `src/features/reporting/` presentation components | YES | Tabular report sections, period selector links, states, and the out-of-validity indicator. Presentation only, mirroring `src/components/dashboard/` |
| New domain types | MINIMAL | `WeeklyAnalytics`, a `ReportingPeriodKind` union, and additions to `ContractUtilization` for the validity state and the out-of-validity flag (PD-105-004, PD-105-006). No parallel type hierarchy |
| New Prisma model, migration, or index | NO | Reporting adds no storage. `Contract.validFrom` / `validTo` / `monthlyContractedMinutes` already exist, and the existing `TimeEntry(workspaceId, workDate)`, `(workspaceId, clientId, workDate)`, and `(workspaceId, contractId, workDate)` indexes support the aggregation shape |
| Client component / `use client` | NO | Period selection is URL-driven; the reporting surface is a read-only RSC, like the dashboard |
| Charting library | NO | §5 |

### Error-handling constraint (F-104-007, inherited risk, not fixed here)

`src/app/(app)/page.tsx` wraps `getCurrentWorkspaceContext()` in a
`try`/`catch` and therefore intercepts `NEXT_REDIRECT` and
`DYNAMIC_SERVER_USAGE`, confirmed at runtime and at build time in the
EPIC-104 review. It is the existing precedent on the only analytics
route, so copying it into `/reports` is the likely default.

EPIC-105 constraint: authorization and workspace resolution must happen
**outside** any `try`, and only the analytics call may be wrapped. This
is a forward constraint on new code. EPIC-105 does not modify
`src/app/(app)/page.tsx`, and F-104-007 stays open and owned by
EPIC-104's register.

---

## 12. Phase Plan

Phases are sequential. Each has one expected commit. No phase is a mega
phase. All blocking Product Decisions are resolved, so every phase below
is implementable; the only remaining gate is OBD-012, which constrains
P105-04 to a no-rollover pro-rata calculation.

### P105-00 — Product Decision resolution (no code) — **COMPLETE**

- **Objective:** obtain and record answers to PD-105-001 … PD-105-006.
- **Outcome:** all six answered by the Product Owner and recorded
  verbatim with their consequences in §7; consequences propagated to
  §3, §4, §5, §6, §8, §9, §11, §12, §14, §16, §17. No decision was
  inferred, no OBD was closed, no new Product Decision was created to
  replace a resolved one.
- **Residual documentation work — deferred to P105-07:** the
  `MASTER_PLAN.md` §15 `revenue by client` reference and the
  `docs/testing-strategy.md` §11 `estimated revenue` reference must be
  reconciled explicitly, the way §14 was. They are not corrected now,
  because P105-07 synchronizes all canonical documents in one commit
  and EPIC-104 proved that piecemeal documentation edits leave the set
  inconsistent.
- **Tests:** none.
- **Expected commit:** folded into the plan commit
  `docs: establish EPIC-105 reporting plan` — no separate commit, since
  the decisions and the plan they change are one document.

### P105-01 — Analytics test durability

- **Objective:** make the analytics integration evidence independent of
  the system clock (F-104-006).
- **Scope:** `tests/integration/analytics/analytics-product-decisions.test.ts`,
  `tests/integration/analytics/analytics-workspace-isolation.test.ts`,
  `tests/integration/dashboard/dashboard-page.test.ts`. Two treatments,
  chosen per test by what the test actually verifies:
  1. a test that genuinely verifies *current-month* behaviour keeps
     calling `getCurrentMonthAnalytics()` and derives its fixture dates
     from the resolved current-month context instead of hardcoding
     September 2026;
  2. a test that is not really about "current month" passes an explicit
     period built with `getDateRangePeriod`, following the pattern that
     already makes `analytics-isolation.test.ts` immune.
- **Non-goals:** production code, unless a concrete defect makes it
  unavoidable; new assertions; changing what any test proves; the E2E
  suite; timezone-aware construction (P105-03); the PD-105-002 period
  end (P105-03); the PD-105-004 ongoing semantics (P105-04); contract
  validity, pro-rata capacity, revenue, or performance.
- **Acceptance criteria:** no analytics or dashboard integration test
  hardcodes a calendar month while asserting against a clock-resolved
  period; each test still proves the behaviour it was written for; no
  `sleep`, `waitForTimeout`, or artificial retry is introduced; the
  integration test count is unchanged unless a change is explicitly
  justified; the diff is minimal.
- **Tests:** integration only; the unit suite is run to prove no
  regression.
- **Dependencies:** none — **independent of every Product Decision**.
  Time-critical: the suite fails from 2026-10-01.
- **Explicitly not this phase:** P105-01 is test durability only. It
  must not be confused with the timezone-aware period construction of
  P105-03, and it must not pre-implement BR-105-014 or BR-105-015.
- **Expected commit:** `test(analytics): decouple analytics integration tests from the current month`

### P105-02 — Shared calculation consolidation and service guard

- **Objective:** make the shared implementations the only ones, so the
  §15 exit criterion is achievable (F-104-002, F-104-001, F-104-014).
- **Scope:**
  - route all billable, allocation, and utilization percentage
    arithmetic through the `AnalyticsService` statics, so
    `analytics-repository.ts:48`, `:285`, `:350-352` and
    `MonthlyAnalytics.tsx:47-50` stop implementing the rules
    independently;
  - replace the hardcoded `/ 30` daily average with `getPeriodDays`, and
    add the first assertion of the daily-average value in any suite;
  - add a membership guard inside `AnalyticsService` (SI-105-005),
    modelled on `getAuthorizedWorkspace`.
- **Non-goals:** new features; UI redesign; loading skeletons; changing
  any delivered figure other than the daily average; touching
  `src/app/(app)/page.tsx`'s `try`/`catch` (F-104-007 stays open).
- **Acceptance criteria:** exactly one implementation of each
  percentage rule exists and is reachable from production code; the
  daily average equals `totalMinutes / getPeriodDays(period)` and is
  asserted; a caller that is not a member of the target workspace is
  rejected by the service itself; unit and integration suites pass with
  counts reported separately.
- **Tests:** unit for the shared statics and the average; integration
  for the membership guard and for unchanged delivered figures.
- **Dependencies:** P105-01; PD-105-007 for the rounding boundary.
- **Expected commit:** `refactor(analytics): consolidate shared analytics calculations`

### P105-03 — Reporting period foundation and weekly aggregation

- **Objective:** provide every period R1-E05 needs, plus weekly
  aggregation, in the shared layer.
- **Scope:**
  - period construction authoritative on `Workspace.timezone`
    (BR-105-014), which is the technical prerequisite F-104-005 and
    F-104-P-002 describe;
  - constructors for today, week, month, year, and custom range where
    **any period containing today ends today** (BR-105-015), including
    the corrective change to `getCurrentMonthPeriod()`;
  - update the analytics and dashboard assertions that depend on the
    old end-of-month semantics — this is the phase that owns that
    change, not P105-01;
  - promote the Monday-week convention out of
    `src/app/(app)/time-tracking/page.tsx` into the shared utilities and
    resolve it against the workspace timezone (F-105-P-003, PD-105-009);
  - weekly aggregation composed from `getDailyAnalytics` (F-104-013);
  - deterministic explicit-locale period labels (F-104-015, PD-105-010);
  - `WeeklyAnalytics` and `ReportingPeriodKind` types.
- **Non-goals:** UI; reporting service; utilization or capacity changes
  (P105-04); new SQL; new indexes; changing `/time-tracking` behaviour
  beyond consuming the promoted helper.
- **Acceptance criteria:** every period constructor is unit-tested for
  first date included, last date included, day before excluded, day
  after excluded; month→month, December→January, and year→year
  transitions are tested; a period containing today ends today and a
  historical complete period keeps its natural end, both asserted;
  future-dated entries inside the current period are proven excluded
  from the default view; boundaries resolve from `Workspace.timezone`
  and are tested with at least two workspace timezones on opposite sides
  of UTC, and with the process timezone deliberately different from the
  workspace timezone; weekly aggregation totals equal the sum of their
  daily rows and the monthly total for a fully covered month; period
  labels are locale-independent.
- **Tests:** unit for constructors, labels, boundaries, timezones;
  integration for weekly aggregation and for the changed current-period
  semantics against seeded data.
- **Dependencies:** P105-02. Decisions applied: PD-105-002, PD-105-003,
  PD-105-009, PD-105-010 — all resolved.
- **Expected commit:** `feat(analytics): add reporting period and weekly aggregation capabilities`
- **Status:** **COMPLETE** — commits `428f6e4` (initial) + `6822600` (corrective, all F-105-002 through F-105-007 remediated). Final Engineering Review verdict: PASS WITH FINDINGS (F-105-008 non-blocking). Verified gates: Unit 266/266, Integration 165/165, Lint PASS, Typecheck PASS, Build PASS.

### P105-04 — Reporting application capability

- **Objective:** a thin, validated, workspace-scoped reporting query
  layer.
- **Scope:**
  - `src/application/reporting/reporting-service.ts`; Zod schema for the
    period request; period-kind resolution; orchestration of shared
    analytics calls for hours by client, contract report, and the annual
    overview's monthly buckets; fail-closed error contract per
    BR-105-010;
  - **ongoing/unlimited separation** (BR-105-016): `isOngoing` recomputed
    from `validTo`, an independent unlimited/capacity property, all four
    combinations representable, and correction of the two integration
    tests that currently lock the opposite semantics
    (`dashboard-page.test.ts:52-60,137` and
    `analytics-isolation.test.ts:230`);
  - **pro-rata capacity** (BR-105-017) as one shared deterministic
    calculation in the analytics layer, accounting for period length and
    validity overlap, with **no rollover, carry-over, or expiry**;
  - **relevance-driven contract list** (BR-105-018): contracts selected
    by validity overlap union in-period consumption, zero-consumption
    contracts rendered at `0h / capacity / 0%`, and out-of-validity time
    retained in the contract's historical count and flagged.
- **Non-goals:** UI; any arithmetic in the reporting service itself; any
  rollover or expiry policy (OBD-012 open); revenue (PD-105-001);
  performance tuning.
- **Acceptance criteria:** the reporting service contains no percentage,
  average, capacity, or utilization arithmetic — all of it lives in the
  shared analytics layer; every method takes `WorkspaceContext` first;
  invalid and reversed ranges and unknown period kinds are rejected;
  pro-rata capacity is asserted for a day, a week, a partial month, a
  full month, a year, and a period only partly overlapping a contract's
  validity; a null `monthlyContractedMinutes` yields a null percentage
  with no invented capacity; each of the four ongoing/unlimited
  combinations has a test; a relevant contract with no time appears at
  `0h / capacity / 0%`; out-of-validity time is counted and flagged, and
  a test proves the contract report's total reconciles with the Time
  Tracking total for the same period; no test implies a rollover policy.
- **Tests:** unit for validation, period-kind resolution, the pro-rata
  formula, and the ongoing/unlimited predicates; integration for
  workspace isolation, archived clients, zero activity, zero
  denominator, the four contract combinations, validity overlap,
  out-of-validity flagging, total reconciliation, and the
  dashboard-agreement assertion.
- **Dependencies:** P105-03. Decisions applied: PD-105-004, PD-105-005,
  PD-105-006 — all resolved. **OBD-012 open**: the pro-rata calculation
  must apply no rollover or expiry semantics, and the tests must record
  that absence deliberately rather than by omission.
- **Expected commit:** `feat(reporting): add workspace-scoped reporting queries`

### P105-05 — Reporting surface

- **Objective:** replace the `/reports` placeholder with the real
  reporting surface.
- **Scope:** `src/app/(app)/reports/page.tsx`; `src/features/reporting/`
  presentation components; URL-driven period selection following the
  `/time-tracking` search-param precedent; tabular hours by client,
  contract report, and annual overview; loading, zero-activity, and
  error states with a real recovery path; responsive layout; sound
  accessibility semantics.
- **Non-goals:** export; charts; client-side state; alerts; revenue
  (PD-105-001); retrofitting the dashboard.
- **Acceptance criteria:** no `use client`; authorization and workspace
  resolution occur outside any `try`; every figure comes from the
  reporting service; period selection is reflected in the URL and
  survives reload; a zero-activity period renders the empty state; a
  failing analytics call renders an error state with a working recovery
  action; native `table`, `caption`, `th`/`scope`, and native heading
  elements are used — the `dt`/`dd`-without-`dl` pattern (F-104-011) and
  the ARIA-emulated headings (F-104-012) are not repeated; client names
  are never truncated without a full-text alternative; the
  out-of-validity flag (BR-105-018) is visible and has a textual
  alternative, not colour alone; no monetary figure appears anywhere.
- **Tests:** unit for presentation components; E2E for navigation,
  period selection, states, responsive behaviour, the out-of-validity
  indicator, and accessibility.
- **Dependencies:** P105-04. Defaults applied: PD-105-007, PD-105-010,
  PD-105-011, PD-105-012.
- **Expected commit:** `feat(reporting): add reports surface with period selection`

### P105-06 — Evidence: integration, E2E, accessibility, performance baseline

- **Objective:** produce the evidence the acceptance criteria require.
- **Scope:** reporting integration suite; `tests/e2e/reports.spec.ts`
  and a reporting accessibility spec written with assertions that can
  fail (the four unsound patterns in F-104-010 must not be reproduced);
  a performance baseline at a declared fixture volume — the EPIC-104
  scalability target of 100 clients, 50 contracts, and 1000 time entries
  is the reference volume, and a year-scale report is the reference
  query.
- **Non-goals:** inventing a pass/fail threshold (PD-105-008); fixing
  the EPIC-104 accessibility specs; adding an accessibility scanner
  unless explicitly approved.
- **Acceptance criteria:** unit, integration, and E2E counts reported
  separately and never combined; no test hardcodes a calendar period
  while asserting against a clock-resolved one; zero skipped E2E tests;
  the measured baseline is recorded as a number with its fixture volume
  and its measurement method; F-104-P-001 is marked measured rather than
  closed by assertion.
- **Tests:** all three suites.
- **Dependencies:** P105-05; PD-105-008.
- **Expected commit:** `test(reporting): add reporting integration, E2E, and performance evidence`

### P105-07 — Documentation synchronization

- **Objective:** record what was actually built.
- **Scope:** `MASTER_PLAN.md` (§4, §15, §38, §39, §47, §48),
  `README.md`, `CHANGELOG.md`, `docs/architecture.md` §5.6 / §17,
  `docs/domain-model.md` §9, `docs/storage.md`,
  `docs/testing-strategy.md` §11 / §12 / §37, and this plan's status
  header. Specifically required by the resolved decisions:
  - remove `revenue by client` from `MASTER_PLAN.md` §15 with an
    explicit reconciliation note, exactly as §14 handled `estimated
    revenue` and `current alerts` (PD-105-001, F-105-P-001);
  - reconcile `docs/testing-strategy.md` §11's `estimated revenue`
    reference (F-105-P-004);
  - record in `docs/domain-model.md` §9 that PD-104-003's period end is
    canonical as "through today" (PD-105-002) and that ongoing and
    unlimited are independent properties (PD-105-004), replacing the
    two paragraphs that currently record both as unresolved;
  - record `Workspace.timezone` as the period authority in
    `docs/architecture.md` §5.6 (PD-105-003);
  - record pro-rata capacity and the no-rollover constraint, with
    OBD-012 still open (PD-105-005).
- **Non-goals:** aspirational claims; closing OBDs; closing inherited
  findings; recording unmeasured performance figures.
- **Acceptance criteria:** every document states only what is
  implemented; suite counts are per-suite; EPIC-104 findings that
  EPIC-105 actually closed are marked closed with their evidence, and
  every other finding keeps its recorded status.
- **Tests:** none.
- **Dependencies:** P105-06.
- **Expected commit:** `docs(reporting): synchronize EPIC-105 documentation`

### P105-08 — Engineering Review (no code)

- **Objective:** produce `docs/epics/EPIC-105/engineering-review.md`.
- **Scope:** verdict, per-suite evidence, findings, inherited findings,
  OBD relevance, production-readiness limitations.
- **Non-goals:** feature work; test rewriting beyond a blocking-finding
  correction; closing inherited findings.
- **Dependencies:** P105-07.
- **Expected commit:** none in this plan; the review's own commit is
  decided at review time.

### No revenue phase

PD-105-001 excludes revenue from EPIC-105, so no revenue phase exists
and none is pre-designed. If revenue enters a later Epic it will require
OBD-001, OBD-002, and OBD-011 to be resolved, plus a decision on live
contract fields versus snapshots (OBD-016 / P102-F-001).

---

## 13. Commit Plan

```text
docs: establish EPIC-105 reporting plan                                        P105-00  COMPLETE
test(analytics): decouple analytics integration tests from the current month    P105-01  COMPLETE  134800f
refactor(analytics): consolidate shared analytics calculations                  P105-02  COMPLETE  756649d
feat(analytics): add reporting period and weekly aggregation capabilities       P105-03  COMPLETE  428f6e4 + 6822600 (corrective)
feat(reporting): add workspace-scoped reporting queries                         P105-04  NEXT
feat(reporting): add reports surface with period selection                      P105-05
test(reporting): add reporting integration, E2E, and performance evidence       P105-06
docs(reporting): synchronize EPIC-105 documentation                             P105-07
```

Rules: one commit per phase; Conventional Commits, consistent with the
existing history; every commit leaves all six gates green; no commit
mixes documentation synchronization with production code; no commit
closes an OBD.

**Scope of the E2E gate.** The rule above is unchanged and is not
rewritten by any phase. What "green" means for E2E is defined by the
gate itself in §17.1: the E2E gate is *required once the reporting UI
exists (P105-05 onward)*. P105-01 and P105-02 therefore close against
lint, typecheck, unit, integration, and build, with the E2E gate not
yet applicable rather than waived. This is the gate table's own
wording, not an exception granted to a phase. `F-105-001` (§16.4)
records the pre-existing E2E failure that must be resolved before
P105-05 can satisfy the gate once it becomes applicable.

Planning produces exactly one commit,
`docs: establish EPIC-105 reporting plan`, covering both the plan and
the recorded Product Decisions.

---

## 14. Test Strategy

Unit, integration, and E2E are three separate suites with three separate
commands and three separate counts. EPIC-104 proved that combining them
hides a red gate (review §2 baseline correction). "Tests pass" is never
an acceptance criterion; the suite and the count are.

```text
pnpm test                               unit        vitest.config
pnpm test:integration                   integration vitest.integration.config.mts
CI=true pnpm test:e2e --workers=1       E2E         playwright
```

### Level assignment per critical behaviour

| Behaviour | Unit | Integration | E2E |
| --- | --- | --- | --- |
| Period constructors: first/last date included, adjacent days excluded | ✔ primary | — | — |
| month→month, December→January, year→year transitions | ✔ primary | — | — |
| `Workspace.timezone` is the boundary authority (BR-105-014), with the process timezone deliberately different, and two workspace timezones on opposite sides of UTC | ✔ primary | ✔ one end-to-end case | — |
| A period containing today ends today; a historical period keeps its natural end (BR-105-015) | ✔ primary | ✔ current-month case | — |
| Future-dated entries excluded from the default current period, included when a future period is selected | — | ✔ primary | — |
| Week definition and week boundaries (PD-105-009), current week ending today | ✔ primary | — | — |
| Weekly aggregation equals the sum of its daily rows | ✔ pure composition | ✔ against seeded data | — |
| Weekly buckets sum to the monthly total for a fully covered month | — | ✔ primary | — |
| Percentage rules, single shared implementation | ✔ primary | ✔ reachability from the production path | — |
| Daily average uses the period's real day count | ✔ primary | — | — |
| Rounding boundary (PD-105-007) | ✔ primary | — | — |
| Zero denominator → `null` → `—` | ✔ | ✔ | ✔ one rendered case |
| Zero-activity period → empty state | — | ✔ | ✔ |
| Archived clients included and labelled | — | ✔ primary | ✔ one journey |
| Contract utilization numerator = all tracked time | — | ✔ primary | — |
| Ongoing (`validTo === null`) and unlimited (`monthlyContractedMinutes === null`) as independent properties — all four combinations (BR-105-016) | ✔ predicates | ✔ primary, one test per combination | ✔ labels |
| Relevant contract with zero consumption renders `0h / capacity / 0%` (BR-105-018) | — | ✔ primary | ✔ one rendered case |
| Out-of-validity time retained in the historical count and flagged, never dropped (BR-105-018) | — | ✔ primary | ✔ indicator visible with a textual alternative |
| Contract report total reconciles with the Time Tracking total for the same period | — | ✔ primary | — |
| Pro-rata capacity for day, week, partial month, full month, year, and partial validity overlap (BR-105-017) | ✔ formula | ✔ primary | — |
| Null capacity yields a null percentage with no invented capacity | ✔ | ✔ | ✔ renders `—` |
| No rollover, carry-over, or expiry is applied (OBD-012 open) | ✔ asserted absence | ✔ asserted absence | — |
| Historical data: edits to client status do not change past figures | — | ✔ primary | — |
| Workspace isolation, including identically named clients in two workspaces | — | ✔ primary | ✔ one negative case |
| Service-level membership guard (SI-105-005) | — | ✔ primary | — |
| Period search-param validation; reversed and malformed ranges | ✔ schema | ✔ service contract | ✔ one rejected input |
| Fail-closed on malformed workspace identifier | — | ✔ (existing pattern) | — |
| Unauthenticated `/reports` → sign-in; no workspace → onboarding | — | — | ✔ primary |
| Redirects not swallowed by a page-level `catch` | — | — | ✔ primary |
| **Dashboard and reports agree for the same period** | — | ✔ primary, dedicated test | — |
| Error state and a working recovery action | — | ✔ forced repository failure | ✔ primary |
| Loading state on the reporting surface | — | — | ✔ |
| Locale-independent period labels | ✔ primary | — | — |
| Responsive layout at 375 / 768 / 1024 / 1440 px | — | — | ✔ |
| Accessibility: native table semantics, native headings, full-text client names, keyboard reachability | ✔ component markup | — | ✔ |
| Performance baseline at declared fixture volume | — | ✔ measurement | — |

| No monetary figure appears in any report (BR-105-011) | — | ✔ | ✔ |

### Test-quality constraints

- No test may hardcode a calendar period while asserting against a
  clock-resolved one (F-104-006).
- No `sleep`, `waitForTimeout`, or artificial retry anywhere.
- No conditional assertion that can pass while asserting nothing, and no
  reuse of the four unsound patterns catalogued in F-104-010: the
  `:focus` pseudo-class `getComputedStyle` call, the
  `prefers-contrast: high` injection, the `body.style.zoom` scaling
  proxy, and the vacuous `if (…)` guards.
- The error path must be exercised by a forced failure, not by
  navigating away and back (F-104-016).
- Any assertion involving locale must pin the locale explicitly
  (F-104-015).
- Zero skipped E2E tests.

---

## 15. Performance

No approved threshold exists. F-104-009 is unevidenced and
F-104-P-001 remains unmeasured; EPIC-104's only timing assertion ran
against a workspace with no time entries.

EPIC-105 increases aggregation volume in two ways: year-scale periods,
and weekly bucketing that composes over daily rows. That justifies a
**measurement**, not an invented gate.

| Item | Plan |
| --- | --- |
| Fixture volume | The EPIC-104 scalability reference: 100 clients, 50 contracts, 1000 time entries, spanning at least 13 months so a year-scale query is real |
| Reference queries | monthly report; year / annual overview; weekly aggregation over a full month |
| Measurement | wall-clock duration of the analytics calls, plus the query count per report render, to detect N+1 growth (`docs/testing-strategy.md` §37) |
| Location | integration suite, as an explicitly named measurement test |
| Threshold | **none** unless PD-105-008 establishes one. The measurement records a number; it does not fail the build on an unapproved figure |
| CI vs local | measured locally and recorded in the Engineering Review. A CI performance gate is not introduced, because CI runner variance would make an unapproved threshold flaky |
| Outcome | F-104-P-001 becomes *measured*. Whether it is closed is the Engineering Review's call, not this plan's |

If the measurement shows the service-layer weekly composition is too
slow, `docs/architecture.md` §17 permits a dedicated aggregation query —
but only then, and only with the measurement as justification.

---

## 16. Findings

### 16.1 EPIC-104 findings — classification for EPIC-105

Classification: **A** prerequisite for EPIC-105 · **B** EPIC-105 scope ·
**C** dependency/risk · **D** deferred · **E** non-applicable.

**No finding is closed by this plan.** Where a Product Decision settles
the *semantics* a finding was waiting on, the finding's status changes
from "awaiting clarification" to "target settled, scheduled" — it is
closed only by the phase that implements it, under that phase's review
and evidence. Classification records impact on the plan.

| Finding | Severity | Class | EPIC-105 treatment |
| --- | --- | --- | --- |
| F-104-001 — daily average `/ 30` | Medium | **A + B** | Prerequisite to BR-105-008: if reports compute a correct average while the dashboard divides by 30, the surfaces disagree. Fixed in P105-02 by consuming the already-tested `getPeriodDays`. Interacts with BR-105-015: once a current period ends today, the divisor is the elapsed day count, not the calendar month length |
| F-104-002 — duplicated percentages; shared statics unreachable | Medium | **A** | **Unchanged architectural constraint of the whole Epic.** Reporting consumes the shared calculations and reproduces no formula — including the new pro-rata capacity calculation (BR-105-017), which must exist exactly once. Consolidation is P105-02 and precedes any published report figure |
| F-104-003 — `isOngoing` diverges from PD-104-004 | Medium | **A → semantics settled** | **PD-105-004 resolves the semantics: ongoing is `validTo === null`; unlimited (`monthlyContractedMinutes === null`) is a separate concept, and capacity is never a proxy for validity.** The finding stays open until P105-04 implements the separation and corrects the two integration tests that lock the old behaviour. No Product Owner clarification is outstanding |
| F-104-004 — contract validity and denominator | Medium | **A → target settled** | PD-105-005 settles the denominator (pro-rata over the period, accounting for validity overlap) and PD-105-006 settles the contract list (relevance-driven, out-of-validity time retained and flagged). Implemented in P105-04. OBD-012 still bars any rollover or expiry policy |
| F-104-005 — workspace timezone unused | Medium | **A → confirmed technical prerequisite** | **PD-105-003 makes this a real prerequisite rather than a deferred improvement: `Workspace.timezone` is the authority for every reporting boundary.** Not resolved during planning; the requirement is documented as BR-105-014 and scheduled in P105-03, which must add the cross-timezone boundary tests that exist in no suite today |
| F-104-006 — integration tests bound to the current month | High | **A — urgent, decision-independent** | Unchanged by the decisions. Test-durability risk that expires 2026-10-01. Corrected first, in P105-01, because no later phase can close on a red integration gate. P105-01 is pure test durability and must not pre-implement BR-105-014 or BR-105-015 |
| F-104-007 — page-level `catch` swallows control-flow signals | Medium | **C** | Inherited architectural risk. **Not fixed during planning and not fixed on the dashboard by EPIC-105.** Carried as a forward constraint: `/reports` resolves authorization outside any `try` (§11) |
| F-104-008 — loading not implemented as specified | Medium | **B (new surfaces) + D (dashboard)** | Reporting does introduce new async surfaces and must define their loading behaviour. Retrofitting dashboard skeletons is deferred |
| F-104-009 / F-104-P-001 — performance unevidenced | Medium / Low | **C + B** | Reporting adds year-scale aggregation, so a baseline at realistic volume is in scope as a measurement (§15). **F-104-P-001 remains unevidenced until it is measured** and is not closed by assertion. No threshold is introduced (PD-105-008) |
| F-104-010 — unsound accessibility assertions | Medium | **C** | Constraint, not a fix: new reporting accessibility tests must be able to fail, and the EPIC-104 suite must not be cited as accessibility proof. Repairing those specs is deferred |
| F-104-011 — `dt`/`dd` without `dl` | Low | **B (new surfaces)** | New reporting surfaces use native table semantics; the invalid pattern is not reproduced. The existing component is not rewritten |
| F-104-012 — residual accessibility gaps | Low | **B (new surfaces)** | Native headings, no truncation without a full-text alternative, symmetric textual indicators on new surfaces |
| F-104-013 — weekly aggregation absent; daily unconsumed | Low | **B — confirmed required** | `week` appears in `MASTER_PLAN.md` §15 scope and in `docs/testing-strategy.md` §12, and the Product Owner's period-end decision explicitly names the current week. **Weekly reporting is confirmed in scope for R1-E05.** Delivered in P105-03, composed over the previously unconsumed daily aggregation |
| F-104-014 — no service-level membership guard | Low | **A/B** | Reporting is the second consumer the finding anticipated. Guard added in P105-02 (SI-105-005). Risk assessed in §10 without being resolved here |
| F-104-015 — locale-dependent period formatting | Low | **B** | Directly relevant: the non-full-month branch becomes production-reachable as soon as custom ranges exist — and BR-105-015 makes a current month a non-full-month period, so it becomes reachable for the default view too. Explicit-locale formatting in P105-03 |
| F-104-016 — analytics error path untested | Low | **B** | Reporting must introduce a real error and recovery strategy, exercised by a forced failure |
| F-104-017 — PD-104-003 period end diverges | Low | **A → resolved semantics** | **PD-105-002 settles it: "through today" is canonical.** The ambiguity between "today" and "end of month" is removed from this plan (BR-105-015). The finding stays open until P105-03 changes `getCurrentMonthPeriod()` and the assertions that depend on the old semantics |
| F-104-P-002 — timezone complexity, confirmed | Medium | **A → explicit technical requirement** | Promoted by PD-105-003 from a confirmed concern to an explicit technical requirement for period boundaries (BR-105-014), satisfied in P105-03 with cross-timezone tests |

### 16.2 Inherited findings — not owned, not closed by EPIC-105

| Finding | Origin | Status | Relationship to EPIC-105 |
| --- | --- | --- | --- |
| EPIC-003 F-003 — password-reset email provider | EPIC-003 | Open | **Production deployment blocker. Not closed or reinterpreted by EPIC-105** |
| EPIC-003 F-001 — identity linking | EPIC-003 | Open | Product decision; **not closed by EPIC-105** |
| P102-F-001 — commercial-terms mutability | EPIC-102 | Open | **Affected.** Utilization denominators, and any revenue figure if PD-105-001 admits one, read live contract fields, so editing a contract retroactively changes historical report figures. Documented, **not resolved**; no snapshots are added |
| EPIC-003 F-002, F-004 | EPIC-003 | Open | CI/OAuth environment limits; not applicable |
| F-103-002 — ACTIVE-only client join in time-tracking views | EPIC-103 | Open | Not inherited. Reporting follows PD-104-001 and includes archived clients. The two surfaces differ by design |
| F-103-001 — `redirect()` inside `catch` | EPIC-103 | Resolved in P103-03 | Pattern recurs as F-104-007; carried as the §11 constraint |
| F-103-003, F-103-004, F-103-005, F-103-006, F-103-P-001, F-103-P-002 | EPIC-103 | Open | Not applicable to reporting |
| F-004-001 | EPIC-004 | Open | Reporting creates no workspace |
| EPIC-002 F-P2-004 | EPIC-002 | Open | `TimeEntry.contractId` is required, so every entry maps to exactly one contract; no unattributed-time case exists in reports |
| EPIC-002 F-P2-005 | EPIC-002 | Open | Relevant to the §10 privacy note and OBD-009; multiplied by additional report surfaces, not resolved |
| EPIC-002 F-P2-003, F-P3-002 | EPIC-002 | Open | Notification concerns; R1-E06 |
| G-002 / G-004 / G-006 | EPIC-005 / EPIC-006 | Open | Unchanged |

### 16.3 EPIC-105 planning findings

#### F-105-P-001 — `MASTER_PLAN.md` §15 requires revenue reporting that the project has deliberately deferred

- **Severity:** High (scope integrity)
- **Status:** **Decision recorded (PD-105-001 — out of scope); documentation reconciliation pending in P105-07**
- **Description:** §15 lists `revenue by client` in R1-E05 scope. No
  monetary amount is computed anywhere in the codebase; EPIC-104
  declared revenue and all monetary calculation explicit non-goals and
  §14 was reconciled accordingly; OBD-001, OBD-002, and OBD-011 are
  open.
- **Impact:** The Epic's scope cannot be stated without an answer.
  Implementing revenue would silently establish rate, rounding, and
  currency policy; omitting it would silently drop an approved scope
  item — the exact failure mode §14's reconciliation was written to
  prevent.
- **Recommended resolution / owner:** **Answered — PD-105-001 excludes
  revenue from EPIC-105.** `MASTER_PLAN.md` §15 is reconciled explicitly
  in P105-07 with a note, not by omission. OBD-001, OBD-002, OBD-011 and
  OBD-016 stay open.

#### F-105-P-002 — three §15 scope items depend on capabilities recorded as absent

- **Severity:** High
- **Status:** **Sequenced; capability work scheduled**
- **Description:** `week` requires weekly aggregation, which does not
  exist (F-104-013). `today` and `week` require a timezone authority
  that is never read (F-104-005). `year`, `annual overview`, and
  `custom period` make F-104-004's unscaled monthly denominator and
  F-104-017's period-end ambiguity material, which EPIC-104's own review
  predicted in its F-104-018 note.
- **Impact:** A naive reading of §15 would schedule UI work before the
  shared layer can support it, producing report figures that are wrong
  in ways the dashboard currently hides.
- **Recommended resolution / owner:** Engineering — the P105-03 / P105-04
  sequencing. The semantics are settled by PD-105-002, PD-105-003,
  PD-105-005 and PD-105-006; what remains is the capability work
  (timezone-aware construction, weekly aggregation, pro-rata capacity,
  relevance-driven contract selection), which must land before any
  reporting UI consumes it.

#### F-105-P-003 — the week convention lives in a route file and is local-clock based

- **Severity:** Medium
- **Status:** **CLOSED — resolved in P105-03, verified by final Engineering Review**
- **Description:** `getWeekStart` in `src/app/(app)/time-tracking/page.tsx`
  implemented a Monday-start week from the server's local clock, and
  `loadTimeEntriesForWeek` derived the week end by adding six days. None
  of this was in the shared layer, and `analytics-periods.ts` had no week
  concept at all.
- **Resolution:** Local `getWeekStart` removed from `time-tracking/page.tsx`.
  `getWeekStartFromDate` added to `src/lib/analytics-periods.ts` using
  UTC-midnight arithmetic (Monday-start, PD-105-009). Time-tracking now
  imports and consumes the shared utility. Commit `6822600`.

#### F-105-P-004 — `docs/testing-strategy.md` §11 still requires revenue reporting tests

- **Severity:** Low
- **Status:** Open
- **Description:** §11 lists `estimated revenue` among the figures
  reporting tests must verify, a historical reference predating the
  EPIC-104 scope reconciliation.
- **Impact:** A documentation discrepancy that could be read as a
  requirement.
- **Recommended resolution / owner:** Reconcile in P105-07. PD-105-001
  is answered, so the reference is removed with an explicit note rather
  than by inventing a requirement.

#### F-105-P-005 — the analytics integration evidence base expires on 2026-10-01

- **Severity:** High (schedule)
- **Status:** Open
- **Description:** F-104-006 makes roughly twenty analytics and
  dashboard integration tests fail from 2026-10-01.
- **Impact:** From that date the integration gate is red, so no EPIC-105
  phase can close on green gates and any new integration evidence is
  unusable until it is fixed.
- **Recommended resolution / owner:** Engineering — P105-01 runs first
  and is independent of every Product Decision.

#### F-105-P-006 — the §15 exit criterion is currently unverifiable

- **Severity:** Medium
- **Status:** Open
- **Description:** "Dashboard and reports agree on the same underlying
  business figures" cannot be proven while the dashboard's figures come
  from three independent percentage implementations with the shared ones
  unreachable (F-104-002) and while the daily average uses a hardcoded
  30-day divisor (F-104-001).
- **Impact:** Without P105-02 the Epic could pass its own tests while
  failing its defining criterion, because both surfaces would be
  compared against whichever implementation each happens to call.
- **Recommended resolution / owner:** Engineering — P105-02 plus the
  dedicated dashboard-agreement integration test in P105-04.

#### F-105-P-007 — no approved performance threshold exists for larger reporting periods

- **Severity:** Low
- **Status:** Open, unevidenced
- **Description:** F-104-P-001 is unmeasured and F-104-009 unevidenced.
  Year-scale reports and weekly composition over daily rows increase
  aggregation volume; `getMonthlyAnalytics` already issues six queries
  per render and `getDailyAnalytics` five.
- **Impact:** Either an invented threshold gets baked into CI, or
  reporting ships with no performance evidence at all.
- **Recommended resolution / owner:** Engineering measures and records
  (§15); Product Owner answers PD-105-008 if a gate is wanted.

#### F-105-P-008 — the only analytics-route precedent is the one with the swallowed-signal defect

- **Severity:** Medium
- **Status:** Open
- **Description:** `src/app/(app)/page.tsx` wraps workspace resolution in
  a `try`/`catch` that intercepts `NEXT_REDIRECT` and
  `DYNAMIC_SERVER_USAGE` (F-104-007, confirmed at runtime and at build
  time). It is the natural template for `/reports`.
- **Impact:** Copying it would make `/reports` authorization redirects
  depend on the same coincidence of layout ordering that currently masks
  the dashboard defect.
- **Recommended resolution / owner:** Engineering — the §11 constraint
  and the SI-105-006 E2E test. F-104-007 itself stays open and owned by
  EPIC-104's register.

#### F-105-P-009 — out-of-validity consumption can exceed a zero pro-rata capacity

- **Severity:** Low
- **Status:** Open — derived from the resolved decisions, no decision required
- **Description:** PD-105-006 retains time recorded outside a contract's
  validity and flags it, while PD-105-005 derives capacity from the
  overlap between the reporting period and that validity interval. A
  period that lies entirely outside a contract's validity therefore
  yields consumption greater than zero against a pro-rata capacity of
  zero. The existing rule already covers the arithmetic — a zero or
  absent denominator yields `null` (BR-105-007) — so the combination
  produces consumed hours with no percentage plus the out-of-validity
  flag. The risk is that an implementer reads the zero denominator as a
  reason to drop the row, which PD-105-006 forbids, or invents a
  fallback capacity, which PD-105-005 forbids.
- **Impact:** Silently dropping such a row would make the contract
  report's total diverge from the Time Tracking total, the exact
  outcome PD-105-006 was decided to prevent.
- **Recommended resolution / owner:** Engineering — P105-04 asserts this
  specific combination explicitly: consumption retained, percentage
  `null`, out-of-validity flag set, no invented capacity. No Product
  Decision is required; the two decisions already determine the
  behaviour.

### 16.4 EPIC-105 implementation findings

Findings raised by an implementation phase rather than by planning.
They follow the EPIC-104 convention: `F-105-NNN` for implementation and
review findings, `F-105-P-NNN` for planning findings.

#### F-105-002 — missing weekly aggregation (raised by P105-03 Engineering Review)

- **Severity:** Blocking
- **Status:** **CLOSED — remediated in corrective commit `6822600`, verified by final P105-03 Engineering Review**
- **Description:** Initial P105-03 delivery (`428f6e4`) omitted `WeeklyAnalytics`, `ReportingPeriodKind`, and `AnalyticsService.getWeeklyAnalytics`, all of which are explicitly in the approved P105-03 scope.
- **Resolution:** `WeeklyAnalytics` and `ReportingPeriodKind` added to `src/domain/analytics-types.ts`. `getWeeklyAnalytics` added to `AnalyticsService`, composed from `getDailyAnalytics` with no new SQL. Membership guard and workspace isolation preserved. 10 integration tests added in `tests/integration/analytics/analytics-weekly.test.ts` proving weekly totals equal daily row sums, empty-week semantics, workspace isolation, membership rejection, and invalid-period rejection.

#### F-105-003 — local `getWeekStart` remained in `time-tracking/page.tsx` (raised by P105-03 Engineering Review)

- **Severity:** Blocking
- **Status:** **CLOSED — remediated in corrective commit `6822600`, verified by final P105-03 Engineering Review**
- **Description:** Initial P105-03 delivery left a local `getWeekStart` implementation using `Date#setDate` (local-clock) in `src/app/(app)/time-tracking/page.tsx`, duplicating the Monday-week convention that should be exclusively in the shared layer.
- **Resolution:** Local function removed; two call sites now use `getWeekStartFromDate` imported from `@/lib/analytics-periods`. The shared helper uses UTC-midnight arithmetic consistent with the period constructors. Commit `6822600`.

#### F-105-004 — missing integration proof of persisted `Workspace.timezone` (raised by P105-03 Engineering Review)

- **Severity:** Blocking
- **Status:** **CLOSED — remediated in corrective commit `6822600`, verified by final P105-03 Engineering Review**
- **Description:** Initial P105-03 delivery had no integration test proving the production chain: persisted `Workspace.timezone` → `resolveWorkspaceContext` → `WorkspaceContext.timezone` → `AnalyticsService` → period boundary.
- **Resolution:** `tests/integration/analytics/analytics-timezone-propagation.test.ts` added. Clock pinned to `2026-09-16T01:00:00Z` via `vi.useFakeTimers`. Workspace with `timezone: "America/New_York"` persisted via repository; context resolved via the real `resolveWorkspaceContext` call (not manually constructed); period end asserted as `2026-09-15` (workspace-local today); UTC Sep 16 entry excluded. Sanity test confirms UTC workspace sees Sep 16. Commit `6822600`.

#### F-105-005 — duplicate `createRepositories()` in `current-workspace.ts` (raised by P105-03 Engineering Review)

- **Severity:** Non-blocking (efficiency)
- **Status:** **CLOSED — remediated in corrective commit `6822600`, verified by final P105-03 Engineering Review**
- **Description:** `src/infrastructure/workspace/current-workspace.ts` called `createRepositories()` twice, creating two Prisma client instances per request.
- **Resolution:** Single `const repos = createRepositories()` instance used for both `repos.members` and `repos.workspaces`. Commit `6822600`.

#### F-105-006 — optional `workspaces` parameter permitted silent UTC fallback (raised by P105-03 Engineering Review)

- **Severity:** Non-blocking (design risk)
- **Status:** **CLOSED — remediated in corrective commit `6822600`, verified by final P105-03 Engineering Review**
- **Description:** `requireWorkspaceAccess` accepted `workspaces?: WorkspaceRepository`, making the timezone fallback to `"UTC"` possible on any call site that omitted the argument.
- **Resolution:** Parameter made required (`workspaces: WorkspaceRepository`). Conditional branch removed; workspace record always fetched. All affected integration and unit test callers updated to pass the repository. No production call site required the optional form. Commit `6822600`.

#### F-105-007 — stale comment in `current-month-dates.ts` (raised by P105-03 Engineering Review)

- **Severity:** Non-blocking (documentation)
- **Status:** **CLOSED — remediated in corrective commit `6822600`, verified by final P105-03 Engineering Review**
- **Description:** `tests/integration/current-month-dates.ts` contained a comment describing `Workspace.timezone` authority and through-today semantics as future P105-03 work.
- **Resolution:** Comment updated to describe the delivered P105-03 behavior (BR-105-014, BR-105-015). Commit `6822600`.

#### F-105-001 — pre-existing E2E failure in the time-tracking journey

- **Severity:** Medium — blocks the E2E release gate from P105-05, with
  no production impact established either way
- **Status:** **OPEN.** Raised during P105-02. Not owned by P105-02, not
  resolved, not closed
- **Location:** `tests/e2e/time-tracking.spec.ts:185`, test
  `should complete authenticated time tracking journey`
- **Failure:** after the date-navigation step
  `page.getByRole("link", { name: "Next Day" }).click()` (line 184), the
  assertion
  `expect(page.getByText("Updated: Development and testing work")).toBeVisible()`
  fails with `element(s) not found` after the 5000 ms locator timeout.
- **Root cause:** **not established.** No root cause is asserted here.
  The failing step exercises `/time-tracking` daily-view date
  navigation; whether the defect lies in the application or in the test
  has not been determined, and no diagnosis should be inferred from
  this entry.
- **Proven pre-existing.** Established by an isolated HEAD-versus-parent
  comparison, not by inspection:

  ```text
  CI=true pnpm exec playwright test tests/e2e/time-tracking.spec.ts \
    -g "should complete authenticated time tracking journey" \
    --workers=1 --reporter=line
  ```

  | Commit | Role | Result |
  | --- | --- | --- |
  | `134800f` | baseline — P105-01, parent of P105-02 | FAIL, ~19.8 s |
  | `756649d` | HEAD — P105-02 | FAIL, ~20.3 s |

  Both runs selected exactly one test, verified with `--list`
  (`Total: 1 test in 1 file`), and failed at the same line, on the same
  locator, with the same error and the same timeout. Same command,
  worker count, browser, database contract, and server lifecycle. The
  full suite was not used for the comparison.
- **Not related to the P105-02 diff.** `git diff --name-only 134800f
  756649d` returns no file under `tests/e2e/` and no time-tracking
  source file; the diff is confined to the analytics service,
  repository, dashboard component, dashboard route, and analytics
  tests. `time-tracking.spec.ts` contains no reference to
  `AnalyticsService`, the dashboard route, the shared calculations, or
  workspace membership. The
  `Failed to load dashboard analytics: Error: NEXT_REDIRECT` webServer
  log appears identically on both commits, so it is the pre-existing
  F-104-007 `try`/`catch` behaviour and not an effect of P105-02.
- **Impact:** None on P105-02, whose gate set excludes E2E (§13, §17.1).
  From **P105-05 onward the E2E gate becomes applicable and requires
  exit 0 with 0 failed and 0 skipped**, so this failure must be resolved
  before P105-05 can close.
- **Recommended resolution / owner:** Engineering — diagnose and resolve
  before P105-05 closes; P105-06 owns the consolidated E2E evidence.
  The finding is closed only by the phase that resolves it, under its
  own review, and only once the full suite passes with 0 failed and
  0 skipped.

#### F-105-008 — test-comment arithmetic description imprecise (raised by final P105-03 Engineering Review)

- **Severity:** Non-blocking (documentation/test comment)
- **Status:** **OPEN — non-blocking**
- **Location:** `tests/integration/analytics/analytics-weekly.test.ts`, assertion comment around `totalMinutes = 1080`
- **Description:** The comment reads `// 480 + 360 + 240`, collapsing Wednesday's two separate records (300 billable + 60 non-billable = 360) without stating that `360` is the combined total. The assertion `toBe(1080)` is arithmetically correct and the test passes. This is a readability nit only; no semantic defect.
- **Impact:** None on correctness. A future reader may be momentarily confused by the entry count versus the comment.
- **Recommended resolution / owner:** Engineering — correct the comment inline during any phase that touches this file, or during P105-07 documentation cleanup. No corrective commit required.

#### Test-environment note — orphaned Playwright `webServer` on port 3000 (resolved)

Not a finding against the repository; recorded so the failure mode is
recognised rather than rediagnosed.

An aborted Playwright run left its `webServer` child, a `next-server`
process, bound to port 3000. Because `playwright.config.ts` sets
`reuseExistingServer: false`, every later run tried to start its own
server against the occupied port and stalled at startup, which
initially made the HEAD-versus-parent comparison inconclusive.
Terminating the orphaned process freed the port, after which the
isolated test completed in roughly 20 seconds on both commits.

No repository change was involved: no production code, test,
Playwright configuration, or package script was modified. When an E2E
run is interrupted, confirm port 3000 is free before rerunning.

---

## 17. Acceptance Criteria and Release Gates

### 17.1 Required gates (all six, per phase, per `.github/workflows/quality.yml`)

| Gate | Command | Criterion |
| --- | --- | --- |
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0, no `any` introduced |
| Unit | `pnpm test` | exit 0; file and test counts reported |
| Integration | `pnpm test:integration` | exit 0; file and test counts reported; **verified at every phase closure, not assumed** |
| Build | `pnpm build` | exit 0; `/reports` classified dynamic, as `/` is |
| E2E | `CI=true pnpm test:e2e --workers=1` | exit 0; 0 failed, 0 skipped; required once the reporting UI exists (P105-05 onward) |

Counts are reported per suite and never combined into one figure.

### 17.2 Functional acceptance criteria

1. Every §3.3 scope item admitted by the resolved Product Decisions is
   implemented and reachable from `/reports`.
2. Every report figure originates from the shared analytics capability;
   no percentage, average, or utilization arithmetic exists in the
   reporting layer, and no reporting-specific SQL exists.
3. For the same period, a report and the dashboard produce identical
   figures, proven by a dedicated integration test (BR-105-008).
4. Period boundaries are verified per `docs/testing-strategy.md` §12:
   first date included, last date included, adjacent days excluded, for
   every period kind, plus month→month, December→January, and
   year→year.
5. Every period containing today ends today, and a historical complete
   period keeps its natural end (BR-105-015); future-dated entries are
   proven excluded from the default current-period view.
6. Period resolution is authoritative on `Workspace.timezone`
   (BR-105-014) for both aggregation and display, tested with two
   workspace timezones on opposite sides of UTC and with the process
   timezone deliberately different from the workspace timezone.
7. Weekly aggregation is implemented and its totals reconcile with both
   the daily rows and the monthly total.
8. Archived-client time remains counted and labelled (PD-104-001).
9. Utilization numerators use all tracked time (PD-104-002).
10. Zero denominators render `—`; zero-activity periods render the empty
    state; no fabricated figure appears anywhere.
11. Invalid period input fails closed with the established error
    contract; no rejected input is silently converted to an empty
    result.
12. Ongoing and unlimited are independent, with all four combinations
    tested (BR-105-016).
13. Capacity is pro-rated over the period and the validity overlap
    (BR-105-017), asserted for day, week, partial month, full month and
    year; a null capacity yields a null percentage; **no rollover,
    carry-over, or expiry semantics are applied or implied** while
    OBD-012 is open.
14. The contract report is relevance-driven: a relevant contract with no
    time appears at `0h / capacity / 0%`, out-of-validity time is
    retained and flagged, and the report total reconciles with the Time
    Tracking total for the same period (BR-105-018).
15. No monetary amount, rate, currency, invoicing, or billing figure is
    computed or displayed anywhere (BR-105-011, PD-105-001).
13. No threshold, warning, or alert is derived from any report figure.
14. Workspace isolation holds: SI-105-001 … SI-105-006 all verified at
    their stated levels.
15. The reporting surface is an RSC with no `use client`, with
    authorization resolved outside any `try`.
16. Accessibility: native table semantics, native headings, full-text
    client names, keyboard reachability, verified by assertions that can
    fail.
17. A performance baseline is recorded with its fixture volume and
    method; no unapproved threshold is enforced.
18. Documentation is synchronized and states only what is implemented.
19. No OBD is closed; no proposed OBD is promoted; no inherited finding
    is closed or reinterpreted.

---

## 18. Production Readiness Boundary

EPIC-105 engineering completion will **not** mean production readiness.
The distinction established by EPIC-104 is preserved.

Outstanding regardless of EPIC-105's outcome:

- **EPIC-003 F-003** — password-reset email provider. Production
  deployment blocker. Not owned, addressed, or closed by EPIC-105.
- **EPIC-003 F-001** — identity linking. Product decision. Not closed by
  EPIC-105.
- **P102-F-001** — commercial-terms mutability. Utilization denominators
  and any future revenue figure read live contract fields, so historical
  report figures remain retroactively mutable. Documented, not resolved.
  No snapshots are added.
- Formal UX review of the reporting surfaces.
- A real accessibility audit that does not rely on the unsound
  assertions catalogued in F-104-010.
- Production monitoring of analytics and reporting query time.
- Timezone correctness verified in production. PD-105-003 makes
  `Workspace.timezone` authoritative, which removes the design ambiguity
  but does not by itself constitute production evidence.
- A production workspace-isolation audit and a security review of report
  data exposure, including the cross-client visibility under OBD-009 /
  EPIC-002 F-P2-005.
- Open EPIC-104 findings that EPIC-105 does not take into scope remain
  open with their recorded severity and ownership.

---

## 19. Approval Gate

| Check | Status |
| --- | --- |
| Scope consistent with `MASTER_PLAN.md` §15 | YES — baseline quoted verbatim and reconciled item by item; `revenue by client` is excluded by an explicit Product Owner decision (PD-105-001) and `MASTER_PLAN.md` §15 is reconciled in P105-07, not dropped silently |
| Non-goals explicit | YES — §5, each with its authority; revenue is now unconditional |
| All blocking Product Decisions resolved | YES — PD-105-001 … PD-105-006, recorded verbatim with consequences in §7 |
| Non-blocking decisions | YES — six accepted defaults, none promoted to a blocker |
| No new Product Decision created to replace a resolved one | YES |
| Business Rules reflect the decisions | YES — BR-105-014 … BR-105-018 added, BR-105-011 made absolute |
| Finding dependencies classified | YES — §16.1, all eighteen EPIC-104 items classified; three reclassified as "semantics settled, scheduled"; **none closed** |
| Findings not artificially closed | YES — each remains open until the phase that implements it closes it with evidence |
| Phases implementable | YES — every phase has a settled semantic target; P105-01 may start immediately and is decision-independent |
| Dependencies explicit | YES — §6, including OBD-012 as a narrow open dependency on rollover/expiry only |
| Commit plan coherent | YES — §13, one commit per phase, planning folded into one commit |
| Test strategy concrete | YES — §14, per-behaviour level assignment, per-suite counts, explicit anti-patterns, decision-specific rows |
| Acceptance criteria coherent | YES — §17, nineteen criteria traceable to the rules and decisions |
| Security / isolation explicit | YES — §10, SI-105-001 … SI-105-006 with verification levels |
| Production readiness distinct from engineering completion | YES — §18, inherited blockers untouched |
| OBDs closed | NONE |
| Blocking Product Decisions outstanding | **NONE** |

```text
PLANNING STATUS: READY FOR IMPLEMENTATION
```

Implementation may proceed in phase order. **P105-01** starts first: it
is decision-independent and time-critical, because the analytics
integration suite fails from 2026-10-01.

---

## Document Status

```text
EPIC-105 — Reporting
PLANNING: COMPLETE
BLOCKING PRODUCT DECISIONS: NONE — ALL SIX RESOLVED
OPEN DEPENDENCY: OBD-012 (rollover / expiry semantics only)
IMPLEMENTATION: READY — P105-01 FIRST
ENGINEERING REVIEW: NOT CREATED
```

Next artifact: the P105-01 commit
`test(analytics): decouple analytics integration tests from the current month`.
`docs/epics/EPIC-105/engineering-review.md` is not created until
implementation completes.
