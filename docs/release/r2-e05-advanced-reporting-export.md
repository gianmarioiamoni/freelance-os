# R2-E05 — Advanced Reporting & Export — Epic Plan

**Epic:** R2-E05 — Advanced Reporting & Export  
**Release:** Release 2 — Revenue Operations  
**MASTER_PLAN identifier:** R2-E05 (`MASTER_PLAN.md` §19)  
**Status:** P-E05-00 COMPLETE — **PO DECISIONS CLOSED**. P-E05-01 AUTHORIZED. E05 is **not** certified.  
**Planning date:** 2026-09-24  
**Inspection HEAD:** `39714a184e3e97c19d434f9111f67354f604d8b6`  
**Inspection subject:** `chore(r2-e04): certify forecasting and contract allocation`  
**Planning recovery commit:** `2b9871b`  
**Authority:** `docs/release/r2-decision-pack.md`  
**Companions:** `docs/release/r2-epic-map.md`, `docs/release/r2-architecture-delta.md`, `docs/release/r2-open-decisions.md`  
**Predecessors:** R2-E01 COMPLETE / RELEASE-READY. R2-E02 COMPLETE WITH NON-BLOCKING FINDING. R2-E03 CERTIFIED. R2-E04 CERTIFIED.  
**Does not assign:** an EPIC-2xx number  
**Does not authorize:** P-E05-02…P-E05-06, schema, UI, CSV implementation, or production release in this chat

```text
P-E05-00  PLANNING / DECISION GATE                 COMPLETE — PO DECISIONS CLOSED
P-E05-01  REPORT READ MODEL + FILTERS              AUTHORIZED / NOT STARTED
P-E05-02  REPORT UI                                NOT STARTED / NOT AUTHORIZED
P-E05-03  CSV EXPORT                               NOT STARTED / NOT AUTHORIZED
P-E05-04  QA / DOCUMENTATION                       NOT STARTED / NOT AUTHORIZED
P-E05-05  RELEASE VALIDATION                       NOT STARTED / NOT AUTHORIZED
P-E05-06  CERTIFICATION                            NOT STARTED / NOT AUTHORIZED

R2-E05: NOT CERTIFIED
P-E05-01: AUTHORIZED
R2-E04: CERTIFIED
R2-E03: CERTIFIED
R2-E02: COMPLETE WITH NON-BLOCKING FINDING
R2-E01: COMPLETE / RELEASE-READY
R1: FROZEN / GRANTED
R2: NOT PRODUCTION-READY
```

---

## P-E05-00 verdict

**COMPLETE — PO DECISIONS CLOSED**

All four blocking Product Owner decisions are CLOSED — PO APPROVED. The final E05 contract is recorded below. This phase does not implement.

P-E05-01 is **AUTHORIZED** for a later chat. Do not start it here.

---

## Closed PO decisions

| ID | Decision |
| --- | --- |
| E05-D-REPORT-SCOPE | **A** — extend existing `/reports`. Publish already-loaded Expected and Contract Allocation. No Invoice/Payment report axis. No workspace indexes. No new dedicated tables |
| E05-D-TEMPORAL-MODEL | **D** — Invoice/Payment are not periodized. Existing report temporal semantics remain authoritative |
| E05-D-REPORT-FILTERS | **B** — Period + Client + Contract. No currency / VOID / amountStatus / overdue |
| E05-D-EXPORT-FORMATS | **B** — native CSV of the same approved filtered dataset. Closes R2-OD-012. No XLSX / PDF / persistence / export framework |

CSV cell format, filename, and download mechanics are **P-E05-01 / P-E05-03 engineering**. Do not invent them here.

---

## Final E05 product contract

E05 extends the existing `/reports` experience. Existing report areas remain authoritative.

**Additive publication**

- Accrued (already published)
- Expected (already loaded; publish)
- Forecast (already published; certified E04 semantics unchanged)
- Contract allocation where already available (already loaded; publish)

**Forecast (immutable E04)**

- current certified period only
- historical/custom → `null`
- no client-side formula
- no persistence

**Allocation (immutable E04)**

- Contract-level total minutes
- all TimeEntries
- validity window `[validFrom, validTo)`
- no billable filter
- null/zero allocation → no status
- positive: `<80` NORMAL, `80–100` WARNING, `>100` EXCEEDED

**Filters (workspace-scoped)**

1. Period
2. Client
3. Contract

**Export**

- native CSV of the same approved report dataset under the same active filters and workspace authorization

**Not in E05**

PDF, XLSX, profitability, FX, mixed-currency totals, saved/scheduled reports, snapshots, warehouse, `ReportEngine`, alert creation, E01–E04 redesign or semantic change, workspace-wide index pages, Invoice/Payment temporal reporting, Currency / VOID / amountStatus / overdue filters.

---

## 1. Source documents

| Document | Used for |
| --- | --- |
| `docs/release/r2-decision-pack.md` | D2, D3, D4, D7, R2-OD-002, R2-OD-012, Advanced Reporting conditional scope |
| `docs/release/r2-open-decisions.md` | Residual #5 CSV-in-E05 (R2-OD-012) |
| `docs/release/r2-architecture-delta.md` | Derived reports; optional export adapter; no E05 persistence |
| `docs/release/r2-epic-map.md` | E05 envelope, in/out of scope, phase labels |
| `docs/release/r2-e01-revenue-visibility.md` | Certified Accrued / Expected; currency grouping; period reuse |
| `docs/release/r2-e02-invoice-tracking.md` | Invoice facts; E02-D05 visibility; “E05 report columns later”; workspace index “if ever justified” |
| `docs/release/r2-e03-payment-tracking.md` | Payment facts; workspace payment index out of E03 |
| `docs/release/r2-e04-forecasting-allocation.md` | Certified Forecast / allocation; E05 owns CSV; no E01/E02 redesign |
| `MASTER_PLAN.md` §15 / §18 / §19 | R1 reporting; R2 E05 pointer; Excel / profitability / advanced multi-currency out |
| `docs/product-vision.md` OD-011 | CSV residual; PDF out of core R2; Excel not a decision |
| `docs/domain-model.md` §14 | Reports are read models; no second source of truth |
| `docs/architecture.md` | `ReportingService` thin publisher; `/reports` RSC; period URL state |
| `docs/storage.md` | Existing indexes; no reporting warehouse |
| `docs/epics/EPIC-105/epic-plan.md` | R1 reports; CSV/PDF/Excel were historical R2-E04 non-goals |
| `src/application/reporting/reporting-service.ts` | Current publisher |
| `src/application/analytics/analytics-service.ts` | Authoritative hours / Accrued / Expected / Forecast / allocation |
| `src/application/invoices/*` | Contract-scoped Invoice reads |
| `src/application/payments/*` | Invoice-scoped Payment reads |
| `prisma/schema.prisma` | Invoice / Payment indexes; no report tables |
| `package.json` | No CSV / XLSX / PDF dependency |

Where a historical R1 document and the decision pack disagree, the decision pack wins for R2 meaning. Certified E01–E04 contracts are immutable here.

---

## 2. Repository / Git state (inspection)

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `39714a184e3e97c19d434f9111f67354f604d8b6` |
| Working tree at inspection | clean |
| Existing E05 plan | **absent** before this document |
| `ReportingService` | present — period resolve + publish only |
| `/reports` | present — RSC; period URL; Hours by Client; Contract Report; Annual Overview; Accrued + Forecast |
| CSV / XLSX / PDF / download route | **absent** |
| Export library | **absent** |
| Workspace Invoice index | **absent** — `listInvoicesForContract` only |
| Workspace Payment index | **absent** — `listPaymentsForInvoice` only |
| Report / export schema | **absent** |
| Alert interaction for reports | **absent** — E05 epic map: none |

---

## 3. Scope classification

Legend: **FACT** = repository text. **OPEN** = PO required. **NOT AUTHORIZED** = absent and must not be invented.

### A. Explicitly documented E05 scope

| Claim | Class |
| --- | --- |
| Epic name: Advanced Reporting & Export | FACT — MASTER_PLAN §19 / epic map |
| Extend operational reporting so revenue, invoice tracking, and payment status can be inspected | FACT — epic map E05 objective |
| Advanced filtering on existing / R2 operational facts | **CLOSED** — Period + Client + Contract (E05-D-REPORT-FILTERS B) |
| Revenue / invoice / payment columns once those semantics are finalized | Envelope narrowed: **CLOSED A** — Expected + allocation on existing `/reports`; no Invoice/Payment axis |
| Shared calculation services only | FACT |
| Simple tabular / CSV export only if planning shows low complexity and clear value | **CLOSED** — native CSV (E05-D-EXPORT-FORMATS B / R2-OD-012) |
| Reports remain a derived read model | FACT |
| Same RSC / `WorkspaceContext` rules as EPIC-105 `/reports` | FACT |
| Period parameters are view state, not tenant grants | FACT |
| E05 must consume E01–E04 outputs; no formula duplication | FACT |
| E05 is trailing and does not block E01–E03 | FACT — already satisfied |

### B. Existing implementation E05 may extend

| Surface | Current fact |
| --- | --- |
| `/reports` | Period kinds `today` / `week` / `month` / `year` / `custom` |
| Hours by Client | Client, total, billable, share. Archived labelled |
| Contract Report | Client, consumed, capacity, utilization. Archived / Ongoing / Out of validity flags |
| Annual Overview | Current workspace year only. Hours + Accrued + Forecast. Footer hours total; money footer is `—` |
| Revenue summary | Accrued + Forecast. Forecast hidden when `null` |
| `ReportingService.getContractReport` | Also loads Expected and `contractAllocations` — **not rendered** |
| Dashboard | Reuses `RevenueSummary` (Accrued + Forecast) |
| Invoice | Contract detail list. Filter ACTIVE / VOID / ALL. Derived UNPAID / PARTIAL / PAID / MISMATCH / overdue |
| Payment | Invoice-scoped events. `paidAmount` derived |
| Allocation | Contract detail. Null/zero → no status. Positive `<80` NORMAL, `80–100` WARNING, `>100` EXCEEDED |

### C. Product decisions

See §17. All four blocking decisions are **CLOSED — PO APPROVED**.

### D. Ideas that are NOT authorized

| Idea | Why |
| --- | --- |
| Excel / XLSX | Never a PO decision. Out of R2 |
| Document / fiscal PDF generation | Out of core R2 (R2-OD-012 / D2) |
| Profitability / cost / client scoring / commercial intelligence | D3 / withdrawn historical R2-E05 |
| FX / mixed-currency totals | D7 |
| Saved reports, scheduled exports, report snapshots, warehouse | Not documented |
| Generic `ReportEngine` | No evidence |
| Background jobs / cron | Not justified |
| Redesign of certified E01–E04 surfaces | E04 closed “no E01/E02 redesign”; E05 is additive |
| Workspace Invoice / Payment **index pages** | CLOSED A — not granted |
| Invoice/Payment report columns / tables / temporal axis | CLOSED A / D — not in E05 |
| Currency / VOID / amountStatus / overdue filters | CLOSED B filters — not in E05 |
| Report-created alerts | Epic map E05 §10: none |
| Persist report totals | Epic map: none expected |

---

## 4. Recovered product contract (immutable certified facts)

E05 must not redefine:

| Fact | Owner |
| --- | --- |
| Accrued = TimeEntry quantity + commercial snapshot; billable only; per `snapshotCurrency` | E01 |
| Expected = live HOURLY pro-rata capacity; DAILY null; per live Contract currency | E01 |
| Forecast = Accrued / elapsedFraction on certified current period only; historical/custom → `null` | E04 |
| Allocation = Contract-level total minutes; all TimeEntries; window `[validFrom, validTo)`; no billable filter | E04 |
| Null / zero allocation → no status / no alert | E04 8-C |
| Positive allocation: `<80` NORMAL, `80–100` WARNING, `>100` EXCEEDED | E04 |
| Invoice is operational tracking. Independent of Accrued / Expected / Forecast | E02 / D4 |
| Payment status derived: UNPAID / PARTIAL / PAID / MISMATCH; overdue independent | E03 |
| VOID excluded from Accrued / Expected and from active payment aggregates | E02 / E03 |
| Published money rounds to nearest integer; do not prematurely round intermediates | R2-OD-002 |
| No FX. No cross-currency total | D7 |
| `Workspace.timezone` is period-boundary authority | EPIC-105 / E01 / E04 |
| Annual Overview stays current-year and is not period-filtered | architecture.md |

---

## 5. Data sources

Do not duplicate formulas in `ReportingService`.

| Candidate field family | Authoritative source | Application service | Temporal axis | Currency | Workspace |
| --- | --- | --- | --- | --- | --- |
| Hours / billable / client share | `TimeEntry` | `AnalyticsService.getClientAllocations` | `workDate` ∩ period | none | `workspaceId` |
| Utilization / capacity | `TimeEntry` + live Contract | `AnalyticsService.getContractUtilizations` | period overlap + pro-rata | none | `workspaceId` |
| Accrued | TimeEntry + snapshot | `AnalyticsService.getAccruedRevenue` | `workDate` ∩ period | `snapshotCurrency` | `workspaceId` |
| Expected | live Contract | `AnalyticsService.getExpectedRevenue` | validity ∩ period | live `Contract.currency` | `workspaceId` |
| Forecast | Accrued + elapsed | `AnalyticsService.getForecastRevenue` | certified current period only | Accrued currencies | `workspaceId` |
| Allocation / status | Contract + TimeEntry | `AnalyticsService.listContractAllocations` | Contract `[validFrom, validTo)`, **not** report period | none | `workspaceId` |
| Invoice amount / reference / VOID | `Invoice` | `listInvoicesForContract` / `getInvoice` | `invoiceDate` (record). `dueDate` is terms snapshot | Invoice currency snapshot | `workspaceId` + Contract membership |
| Paid / amountStatus / overdue | Invoice + Payment sum | `toInvoiceDerivedView` / `deriveInvoiceFields` | overdue uses workspace `today`; payments use `paymentDate` | Invoice currency | same |
| Payment events | `Payment` | `listPaymentsForInvoice` | `paymentDate` | Payment currency (= Invoice at write) | `workspaceId` + Invoice |

Invoice and Payment remain authoritative on Contract / Invoice surfaces. They are **not** E05 report data sources. There is no workspace-wide Invoice or Payment list port. E05 does not add one.

---

## 6. Report model

Current `/reports` is a **fixed** report set with URL period state. No saved views. No grouping control. No sort control. No pagination.

Closed E05 model:

```text
UI /reports (additive)
  → ReportingService (period resolve + Client/Contract filter + orchestration)
    → AnalyticsService          hours / Accrued / Expected / Forecast / allocation
    → native CSV serializer     same approved filtered dataset (P-E05-03)
```

Do not create a report configuration table. Do not create a `ReportEngine`.  
Do not call Invoice or Payment application reads from reporting.  
`ReportingService` must not re-implement Accrued, Expected, Forecast, or allocation.

---

## 7. Temporal semantics

Facts do **not** share one date.

| Fact | Date | Period behavior today |
| --- | --- | --- |
| Time hours / Accrued | `TimeEntry.workDate` | Selected report period |
| Expected | Contract `[validFrom, validTo)` ∩ period | Selected report period |
| Forecast | certified current period | `null` on historical / custom |
| Allocation | Contract validity window | Independent of report period |
| Invoice | `invoiceDate`; `dueDate` optional | **Not periodized in E05** (E05-D-TEMPORAL-MODEL D) |
| Payment | `paymentDate` | **Not periodized in E05** |
| Overdue | `dueDate` vs workspace `today` | Not a report filter |

Custom range and named kinds (`today` / `week` / `month` / `year`) already exist for TimeEntry-based reports. Month boundaries and timezone follow `Workspace.timezone`. Client and Contract filters are additional view state on that same temporal model.

Do not invent `invoiceDate` / `dueDate` / `paymentDate` periodization. Do not invent a combined temporal model.

---

## 8. Currency / financial semantics

**FACT — not reopened:**

- Reports that publish money are currency-grouped.
- Multi-currency workspaces are supported as **separate** currency rows.
- FX does not exist.
- Totals across currencies are forbidden (D7). Annual Overview money footer is already `—`.
- Invoice / Payment use persisted currency snapshots, not a live Contract reread.
- Accrued uses `snapshotCurrency`. Expected uses live Contract currency. Forecast inherits Accrued grouping.
- Published money is nearest integer. Intermediates stay unrounded (R2-OD-002).
- Domain amounts remain `Decimal` / string. UI publishes integers.

Profitability is **not** in E05. Do not invent margin, cost, or net.

---

## 9. Export semantics

| Format | Status |
| --- | --- |
| On-screen tables | Existing |
| CSV | **CLOSED B** — native CSV of the same approved filtered dataset (R2-OD-012) |
| XLSX / Excel | Out of R2 |
| PDF / document generation | Out of core R2 |

No export library. Serialize the already-computed report tables as native UTF-8 text. No new dependency. No export persistence. No export framework.

Closed product constraints:

- Scope = the same workspace-scoped report the user can see under the same Period / Client / Contract filters
- Authorization = same `getCurrentWorkspaceContext()` as `/reports`; entity ids are not grants
- Generation = request/response; no job queue
- No audit ledger (R2-OD-015 out of R2)

UTF-8 details, deterministic column order, filename, locale/date/currency formatting, null representation, and download response are **P-E05-01 / P-E05-03 engineering**. Do not invent them in P-E05-00.

---

## 10. Security / workspace isolation

Every report and any future export is workspace-scoped.

| Rule | Source |
| --- | --- |
| Membership via `getCurrentWorkspaceContext()` outside `try` | `/reports` |
| `AnalyticsService` membership guard | SI-105-005 |
| Repository queries include `workspaceId` | all R2 reads |
| Cross-workspace id substitution fail-closed | R1 isolation |
| Period / Client / Contract / export query params are view state, not tenant grants | epic map E05 §11 |

CSV requires the same membership check as the page. Do not treat `contractId` or `clientId` as authorization.

---

## 11. Performance

Measured EPIC-105 baseline (no pass/fail threshold; PD-105-008): 100 clients, 50 contracts, 1000 TimeEntries, 13 months. Monthly report ~27 ms / ≤ 53 DB ops; annual overview ~27 ms / ≤ 636 DB ops.

Existing indexes:

- `TimeEntry (workspaceId, workDate)` and client/contract variants
- `Invoice (workspaceId, contractId, invoiceDate)`, `(workspaceId, voidedAt)`
- `Payment (workspaceId, invoiceId)`

E05 does not add workspace-wide Invoice/Payment scans. Client / Contract filters reuse existing `TimeEntry` indexes. Do not add a warehouse. Do not add a snapshot table. Do not add an index until a chosen query proves the existing ones insufficient.

---

## 12. Architecture

Smallest consistent shape:

```text
/reports RSC
  → ReportingService
      → AnalyticsService → AnalyticsRepository
      → native CSV serializer (P-E05-03)
```

Forbidden:

```text
UI → Prisma
ReportingService recalculating Accrued / Expected / Forecast / allocation
Invoice / Payment application reads from reporting
New RevenueService / ReportEngine / export microservice
```

`ReportingService` is sufficient as a bounded publisher. Extend it; do not replace it.

---

## 13. Migration impact

**No schema change is required** for a derived `/reports` extension over existing services.

Possible later outcomes, only if PO creates a persistence need:

| Outcome | When it would appear |
| --- | --- |
| No migration | Default |
| Additive index | Only if Client/Contract filter queries prove existing TimeEntry indexes insufficient |
| Report configuration / export metadata tables | Saved or scheduled reports — **not authorized** |

Do not invent persistence in P-E05-01.

---

## 14. Alerts

**FACT:** E05 does not create, resolve, or evaluate alerts.

Allocation and payment alerts remain E04 / E03. Reports may **display** already-derived `allocationStatus`. That is not AlertService interaction. Overdue is not an E05 report field.

---

## 15. UI scope

Additive E05 UI only. Do not redesign Dashboard, Contract detail, Client detail, Invoice, or Payment certified surfaces.

| Surface | E05 |
| --- | --- |
| `/reports` existing tables / revenue summary | Publish Expected + allocation. Add Client + Contract filters |
| New `/reports` sections / tables | **No** |
| Export control on `/reports` | CSV in P-E05-03 |
| Dashboard | Out — E04 revenue surface unchanged |
| Contract / Client detail | Out |
| Workspace Invoice / Payment index pages | **No** |
| Saved / scheduled report UI | **No** |

Expected and allocation are already loaded into `ContractReport` and not shown. E05 publishes them on existing `/reports` surfaces. E04 Forecast / allocation semantics stay unchanged.

---

## 16. Test strategy (no tests in P-E05-00)

**Unit**

- Period + Client + Contract filter mapping
- Expected / allocation projection / null representation
- Currency grouping / no mixed total
- CSV serialization in P-E05-03 (encoding, columns, empty, multi-currency)

**Integration**

- Workspace isolation on every new read
- Figures agree with AnalyticsService
- Forecast remains null on historical/custom
- Allocation status unchanged (null/zero / 80–100 / >100)
- Client / Contract filters do not leak cross-workspace ids

**E2E**

- `/reports` navigation and existing period selector
- Client + Contract filters
- CSV download in P-E05-03
- Unauthenticated / cross-workspace denial

**Performance**

- Reuse EPIC-105 volume; no new warehouse benchmark

**Regression that must stay green**

- `tests/integration/reporting/*`
- `tests/e2e/reports.spec.ts`
- E01 Accrued / Expected
- E04 Forecast / allocation
- E02 Invoice / E03 Payment

---

## 17. Decision register

### E05-D-REPORT-SCOPE

**Question:** What advanced reporting ships in E05?  
**Why it matters:** The envelope says inspect revenue, invoice tracking, and payment status. It does not name tables, fields, or new pages. E02 deferred “E05 report columns”. Workspace Invoice index is “if ever justified”.  
**Options:**

| ID | Option |
| --- | --- |
| A | Publish already-loaded unused facts only (Expected and/or allocation on existing `/reports`). No Invoice/Payment columns |
| B | Add period-scoped Invoice/Payment **columns** to existing Contract Report and/or Annual Overview. No new pages. No workspace index |
| C | Add new Invoice and/or Payment **tables** on `/reports`, still no standalone index routes |
| D | Add workspace Invoice and/or Payment **index** surfaces |

**Decision:** **A** — extend existing `/reports`. Publish already-loaded Expected and Contract Allocation. No Invoice/Payment report axis. No workspace-wide index pages. No new dedicated report tables.  
**Status:** **CLOSED — PO APPROVED**

### E05-D-TEMPORAL-MODEL

**Question:** When Invoice/Payment appear on a period report, which dates enter the selected period?  
**Why it matters:** Hours/Accrued use `workDate`. Invoice has `invoiceDate` and optional `dueDate`. Payment has `paymentDate`. Allocation ignores the report period. Mixing axes silently produces false operational totals.  
**Options:**

| ID | Option |
| --- | --- |
| A | Invoice by `invoiceDate`; Payment by `paymentDate`; do not mix into Accrued totals |
| B | Invoice by `dueDate` (null dueDate excluded); Payment by `paymentDate` |
| C | Invoice/Payment reports are not period-sliced; show current operational set only |
| D | E05 contains no Invoice/Payment period report (only if REPORT-SCOPE = A) |

**Decision:** **D** — Invoice/Payment do not participate in the E05 report temporal model. Do not introduce `invoiceDate` / `dueDate` / `paymentDate` periodization. Existing report temporal semantics remain authoritative.  
**Status:** **CLOSED — PO APPROVED**

### E05-D-REPORT-FILTERS

**Question:** What does “advanced filtering” mean in E05?  
**Why it matters:** Decision pack puts advanced filtering in planning scope. Current `/reports` has period only. Invoice list has ACTIVE / VOID / ALL.  
**Options:**

| ID | Option |
| --- | --- |
| A | Period only. “Advanced filtering” is not delivered in E05 |
| B | Period + client and/or contract |
| C | B + currency |
| D | C + Invoice tracking (ACTIVE / VOID / ALL) and/or amountStatus / overdue |

**Decision:** **B** — Period + Client + Contract. Workspace-scoped. Do not add Currency, VOID, amountStatus, or overdue filters.  
**Status:** **CLOSED — PO APPROVED**

### E05-D-EXPORT-FORMATS

**Question:** Does a simple tabular / CSV export belong in R2-E05?  
**Why it matters:** R2-OD-012 residual. PDF/document generation is out. Excel is out.  
**Options:**

| ID | Option |
| --- | --- |
| A | No export in E05. On-screen reports only |
| B | Simple CSV of the approved on-screen report tables. Native UTF-8 serializer. No new library |
| C | Broader export (XLSX / PDF / engine) — **invalid in R2** |

**Decision:** **B** — native CSV of the same approved report dataset under the same active filters and workspace authorization. No XLSX. No PDF. No export persistence. No new export framework.  
**Status:** **CLOSED — PO APPROVED** (closes R2-OD-012)

### Conditional (no longer PO blockers)

#### E05-D-CSV-FORMAT

Engineering for P-E05-01 / P-E05-03: UTF-8, deterministic column order, deterministic filename, locale/date consistent with existing conventions, published-money currency formatting, null representation, authorization, download response.  
**Status:** TECHNICAL — not a PO residual. Do not invent in P-E05-00.

#### E05-D-EXPORT-LIMITS

Technical default: no extra cap beyond the current report query; no streaming unless a later measured volume requires it.  
**Status:** TECHNICAL

#### E05-D-INVOICE-VOID-VISIBILITY

**N/A** — REPORT-SCOPE A. No Invoice report axis.

#### E05-D-PAGINATION

**N/A** — no workspace-wide Invoice/Payment lists.

### Not opened (explicitly out or already closed)

| ID | Status |
| --- | --- |
| E05-D-CURRENCY-GROUPING | CLOSED by D7 / R2-OD-002 — per currency; no FX; no mixed total |
| E05-D-XLSX-FORMAT | NOT AUTHORIZED |
| E05-D-PDF-FORMAT | NOT AUTHORIZED |
| E05-D-SAVED-REPORTS | NOT AUTHORIZED |
| E05-D-SCHEDULED-EXPORTS | NOT AUTHORIZED |
| E05-D-REPORT-PERSISTENCE | CLOSED by epic map — derived; no document store |
| E05-D-GROUPING | CLOSED — existing tables keep current grouping |
| Alert / job / warehouse / profitability | NOT AUTHORIZED |

---

## 18. Proposed phase plan

P-E05-01 is authorized. Later phases stay unauthorized until their own chats.

| Phase | Objective | Depends | Deliverables | Tests | Commit intent | Exit | Risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P-E05-00 | Planning / PO gate | E01–E04 certified | This document | None | `docs(r2-e05): close planning decisions` | PO decisions closed | Implicit product invention |
| P-E05-01 | Report read model + filters | Closed A/D/B | Expected + allocation publication; Period + Client + Contract filter projection; CSV-ready dataset. No Prisma. No UI. No CSV file | Unit + integration isolation / authority | `feat(r2-e05): extend reporting read model` | Approved fields + filters from AnalyticsService | Formula duplication; Invoice/Payment leakage |
| P-E05-02 | Additive `/reports` UI | P-E05-01 | Expected / allocation on existing surfaces; Client + Contract filters | E2E reports | `feat(r2-e05): add approved report surfaces` | Additive UI only | Redesigning E01–E04 |
| P-E05-03 | Native CSV | EXPORT-FORMATS B; P-E05-02 | Native CSV of the same filtered dataset | Unit serialize; E2E download; authz | `feat(r2-e05): add simple csv export` | Tabular non-fiscal CSV | New library / document generation |
| P-E05-04 | QA / documentation | P-E05-03 | Docs match shipped behavior | QA | `chore(r2-e05): complete qa and documentation` | PASS / PASS WITH FINDINGS | Doc drift |
| P-E05-05 | Release validation | P-E05-04 | Validation record | Gate B | none or docs-only | READY / BLOCKED | Claiming R2 production-ready |
| P-E05-06 | Certification | P-E05-05 | Certification metadata | — | `chore(r2-e05): certify advanced reporting` | CERTIFIED; R2 still not production-ready | Starting R2 release gates early |

---

## 19. Critical path

### BLOCKING PO DECISIONS

**NONE.** All four are CLOSED.

### NONBLOCKING ENGINEERING CHOICES

- Native CSV serializer (default; no new library)
- Exact Client/Contract filter query-param shape
- Exact Server Action / route shape for CSV
- Index later only if Client/Contract filters prove existing indexes insufficient

### Dependencies

- Certified E01 Accrued / Expected
- Certified E04 Forecast / allocation
- Existing EPIC-105 `/reports` period model
- No schema blocker

---

## 20. Release impact

| Area | E05 planning impact |
| --- | --- |
| Database schema | None required |
| Production migration | None required |
| Deployment process | Unchanged |
| Environment variables | None |
| Dependencies | None. Native CSV. No new library |
| Build / runtime | CSV adds a download response in P-E05-03; no job worker |
| Security surface | Downloadable operational data under the same workspace authorization |
| Production readiness | R2 remains **not** production-ready even after E05 certification |

---

## 21. Implementation authorization

```text
P-E05-00: COMPLETE — PO DECISIONS CLOSED
P-E05-01: AUTHORIZED / NOT STARTED
P-E05-02…P-E05-06: NOT AUTHORIZED
E05: NOT CERTIFIED
SCHEMA / UI / CSV / ReportingService CHANGES: FORBIDDEN IN THIS CHAT
R2: NOT PRODUCTION-READY
```

A later chat may start P-E05-01. That chat must not expand beyond the closed contract.

---

## 22. Stop condition

P-E05-00 stops here.

Do not implement P-E05-01 in this chat.  
Do not create migrations.  
Do not create UI.  
Do not implement CSV.  
Do not modify `ReportingService`.
