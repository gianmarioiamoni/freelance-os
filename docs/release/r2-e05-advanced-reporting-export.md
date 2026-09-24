# R2-E05 — Advanced Reporting & Export — Epic Plan

**Epic:** R2-E05 — Advanced Reporting & Export  
**Release:** Release 2 — Revenue Operations  
**MASTER_PLAN identifier:** R2-E05 (`MASTER_PLAN.md` §19)  
**Status:** P-E05-00 COMPLETE AS PLANNING RECOVERY — **BLOCKED — PO DECISIONS REQUIRED**  
**Planning date:** 2026-09-24  
**Inspection HEAD:** `39714a184e3e97c19d434f9111f67354f604d8b6`  
**Inspection subject:** `chore(r2-e04): certify forecasting and contract allocation`  
**Authority:** `docs/release/r2-decision-pack.md`  
**Companions:** `docs/release/r2-epic-map.md`, `docs/release/r2-architecture-delta.md`, `docs/release/r2-open-decisions.md`  
**Predecessors:** R2-E01 COMPLETE / RELEASE-READY. R2-E02 COMPLETE WITH NON-BLOCKING FINDING. R2-E03 CERTIFIED. R2-E04 CERTIFIED.  
**Does not assign:** an EPIC-2xx number  
**Does not authorize:** implementation, schema, UI, export, or production release

```text
P-E05-00  PLANNING / DECISION GATE                 COMPLETE AS RECOVERY — BLOCKED — PO DECISIONS REQUIRED
P-E05-01  REPORT READ-MODEL FOUNDATION             NOT STARTED / NOT AUTHORIZED
P-E05-02  ADDITIVE /reports UI                     NOT STARTED / NOT AUTHORIZED
P-E05-03  SIMPLE CSV EXPORT                        CONDITIONAL / NOT AUTHORIZED
P-E05-04  QA / DOCUMENTATION                       NOT STARTED / NOT AUTHORIZED
P-E05-05  RELEASE VALIDATION                       NOT STARTED / NOT AUTHORIZED
P-E05-06  CERTIFICATION                            NOT STARTED / NOT AUTHORIZED

R2-E05: NOT AUTHORIZED
R2-E04: CERTIFIED
R2-E03: CERTIFIED
R2-E02: COMPLETE WITH NON-BLOCKING FINDING
R2-E01: COMPLETE / RELEASE-READY
R1: FROZEN / GRANTED
R2: NOT PRODUCTION-READY
```

---

## P-E05-00 verdict

**BLOCKED — PO DECISIONS REQUIRED**

This phase recovers the repository source of truth and records the E05 planning contract. It does **not** implement. It does **not** invent missing product behavior.

Implementation is **not** authorized because planning is complete.

Four blocking Product Owner decisions remain. Conditional decisions wait on those answers.

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
| Advanced filtering on existing / R2 operational facts | FACT as planning theme — **filters themselves OPEN** |
| Revenue / invoice / payment columns once those semantics are finalized | FACT as envelope — **which columns OPEN** |
| Shared calculation services only | FACT |
| Simple tabular / CSV export only if planning shows low complexity and clear value | FACT direction — **inclusion OPEN** (R2-OD-012) |
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

### C. Unresolved product decisions

See §17. Blocking: **E05-D-REPORT-SCOPE**, **E05-D-TEMPORAL-MODEL**, **E05-D-REPORT-FILTERS**, **E05-D-EXPORT-FORMATS**.

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
| Workspace Invoice / Payment **index pages** | E02: “E05 if ever justified”. E03: out of E03. Not granted here |
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

There is **no** workspace-wide Invoice or Payment list port. Adding one is a scope decision, not an existing capability.

---

## 6. Report model

Current `/reports` is a **fixed** report set with URL period state. No saved views. No grouping control. No sort control. No pagination.

Proposed E05 model, pending PO:

```text
UI /reports (additive)
  → ReportingService (period resolve + orchestration)
    → AnalyticsService          hours / Accrued / Expected / Forecast / allocation
    → Invoice application reads  only if invoice columns/tables are approved
    → Payment application reads  only if payment columns/tables are approved
    → optional CSV serializer    only if R2-OD-012 is approved
```

Do not create a report configuration table. Do not create a `ReportEngine`.

If invoice/payment figures are approved, `ReportingService` may compose already-derived views. It must not re-implement Accrued, Expected, Forecast, allocation, `paidAmount`, `amountStatus`, or overdue.

---

## 7. Temporal semantics

Facts do **not** share one date.

| Fact | Date | Period behavior today |
| --- | --- | --- |
| Time hours / Accrued | `TimeEntry.workDate` | Selected report period |
| Expected | Contract `[validFrom, validTo)` ∩ period | Selected report period |
| Forecast | certified current period | `null` on historical / custom |
| Allocation | Contract validity window | Independent of report period |
| Invoice | `invoiceDate`; `dueDate` optional | Not used by `/reports` |
| Payment | `paymentDate` | Not used by `/reports` |
| Overdue | `dueDate` vs workspace `today` | Not a period filter |

Custom range and named kinds (`today` / `week` / `month` / `year`) already exist for TimeEntry-based reports. Month boundaries and timezone follow `Workspace.timezone`.

If E05 places Invoice or Payment on a period report, the Product Owner must choose the filter date per fact. Combining Accrued (`workDate`) with Invoice (`invoiceDate`) or Payment (`paymentDate`) in one total is a separate product decision. Do not silently use `dueDate` as the invoice period key.

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
| CSV | Direction approved as possible; inclusion **OPEN** (R2-OD-012) |
| XLSX / Excel | Out of R2 |
| PDF / document generation | Out of core R2 |

No export library exists. If CSV is approved, **reuse no third-party package**: serialize the already-computed report tables as UTF-8 text. A new dependency is an architecture decision and is not justified for simple tabular CSV.

Engineering constraints **if** CSV is approved (not a substitute for PO format decisions):

- Scope = the same workspace-scoped report the user can see
- Generation = request/response; no job queue
- In-memory is acceptable at the measured EPIC-105 volume (100 clients / 50 contracts / 1000 TimeEntries / 13 months) unless a later PO dataset is larger
- Authorization = same `getCurrentWorkspaceContext()` as `/reports`; entity ids are not grants
- No audit ledger (R2-OD-015 out of R2)

Filename, encoding BOM, locale/date/currency cell format, column order, and null representation remain **E05-D-CSV-FORMAT** if CSV is approved.

---

## 10. Security / workspace isolation

Every report and any future export is workspace-scoped.

| Rule | Source |
| --- | --- |
| Membership via `getCurrentWorkspaceContext()` outside `try` | `/reports` |
| `AnalyticsService` membership guard | SI-105-005 |
| Repository queries include `workspaceId` | all R2 reads |
| Invoice/Payment joins go through workspace-scoped repositories | E02 / E03 |
| Cross-workspace id substitution fail-closed | R1 isolation |
| Period / filter / export query params are view state, not tenant grants | epic map E05 §11 |

Export, if added, requires the same membership check as the page. Do not treat `contractId`, `invoiceId`, or `clientId` as authorization.

---

## 11. Performance

Measured EPIC-105 baseline (no pass/fail threshold; PD-105-008): 100 clients, 50 contracts, 1000 TimeEntries, 13 months. Monthly report ~27 ms / ≤ 53 DB ops; annual overview ~27 ms / ≤ 636 DB ops.

Existing indexes:

- `TimeEntry (workspaceId, workDate)` and client/contract variants
- `Invoice (workspaceId, contractId, invoiceDate)`, `(workspaceId, voidedAt)`
- `Payment (workspaceId, invoiceId)`

Risks only if PO approves workspace-wide Invoice/Payment scans or N+1 payment sums across all invoices. Do not add a warehouse. Do not add a snapshot table. Do not add an index until a chosen query proves the existing ones insufficient.

---

## 12. Architecture

Smallest consistent shape:

```text
/reports RSC
  → ReportingService
      → AnalyticsService → AnalyticsRepository
      → existing Invoice / Payment application functions (if approved)
      → optional native CSV serializer (if approved)
```

Forbidden:

```text
UI → Prisma
ReportingService recalculating Accrued / Expected / Forecast / allocation / paidAmount
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
| Additive index | Proven workspace-wide Invoice/Payment list |
| Report configuration / export metadata tables | Saved or scheduled reports — **not authorized** |

Do not invent persistence in P-E05-01.

---

## 14. Alerts

**FACT:** E05 does not create, resolve, or evaluate alerts.

Allocation and payment alerts remain E04 / E03. Reports may **display** already-derived `allocationStatus` or `overdue` if those columns are approved. That is not AlertService interaction.

---

## 15. UI scope

Additive E05 UI only. Do not redesign Dashboard, Contract detail, Client detail, Invoice, or Payment certified surfaces.

| Surface | E05 |
| --- | --- |
| `/reports` existing tables / revenue summary | Candidate for approved columns |
| New `/reports` sections | Only if REPORT-SCOPE chooses them |
| Export control on `/reports` | Only if CSV approved |
| Dashboard | Out unless PO explicitly extends E04 revenue surface (not assumed) |
| Contract / Client detail | Out |
| Workspace Invoice / Payment index pages | Not granted |
| Saved / scheduled report UI | Not authorized |

Expected and allocation are already loaded into `ContractReport` and not shown. Publishing them is a REPORT-SCOPE choice, not an automatic bug fix. E04 closed UI as Accrued + Forecast on existing revenue surfaces and allocation on Contract detail.

---

## 16. Test strategy (no tests in P-E05-00)

**Unit**

- Period request mapping (reuse existing)
- Approved column projection / null representation
- Currency grouping / no mixed total
- CSV serialization if approved (encoding, columns, empty, multi-currency)

**Integration**

- Workspace isolation on every new read
- Figures agree with AnalyticsService / Invoice derived view / Payment sum
- Forecast remains null on historical/custom
- VOID excluded from active payment aggregates
- Allocation status unchanged (null/zero / 80–100 / >100)

**E2E**

- `/reports` navigation and existing period selector
- Approved filters
- Export download if approved
- Unauthenticated / cross-workspace denial
- One representative Accrued / Invoice / Payment agreement case if those columns exist

**Performance**

- Only if PO chooses workspace-wide Invoice/Payment aggregation beyond current contract-scoped lists
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

**Consequences:** A may fail the stated “invoice tracking and payment status can be inspected”. D exceeds E02/E03 minimums. B is the smallest reading of “columns”. C is the smallest reading of dedicated inspection tables.  
**Recommended:** none as product default. Engineering note only: B is the smallest interpretation of the written “columns” language; D is not granted by E02.  
**PO decision required:** **YES — BLOCKING**

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

**Consequences:** A matches stored operational event dates. B matches cash-expectation. C avoids a false period join.  
**Recommended:** A if Invoice/Payment period tables/columns exist; D if REPORT-SCOPE = A.  
**PO decision required:** **YES — BLOCKING** unless REPORT-SCOPE = A

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

**Consequences:** A is honest about current capability. D needs Invoice/Payment in REPORT-SCOPE.  
**Recommended:** none.  
**PO decision required:** **YES — BLOCKING**

### E05-D-EXPORT-FORMATS

**Question:** Does a simple tabular / CSV export belong in R2-E05?  
**Why it matters:** R2-OD-012 residual. PDF/document generation is out. Excel is out.  
**Options:**

| ID | Option |
| --- | --- |
| A | No export in E05. On-screen reports only |
| B | Simple CSV of the approved on-screen report tables. Native UTF-8 serializer. No new library |
| C | Broader export (XLSX / PDF / engine) — **invalid in R2** |

**Consequences:** A closes R2-OD-012 as “not in E05”. B matches the residual’s low-complexity gate. C is rejected by the decision pack.  
**Complexity evidence for B:** existing tables are already computed; `package.json` has no export library; request/response CSV at EPIC-105 volume is in-memory-safe.  
**Recommended:** if export is wanted, B. Whether export is wanted is PO-only.  
**PO decision required:** **YES — BLOCKING** (closes R2-OD-012)

### Conditional (not blocking until parents close)

#### E05-D-CSV-FORMAT

Needed only if EXPORT-FORMATS = B. Filename, UTF-8 BOM, date format (`YYYY-MM-DD` vs locale), money cells (published integer vs unrounded), column order, null token.  
**PO decision required:** YES if CSV approved.

#### E05-D-EXPORT-LIMITS

Needed only if CSV approved. Default engineering proposal: no extra limit beyond the current report query; no streaming unless a later measured volume requires it.  
**PO decision required:** YES if CSV approved and a cap is desired; otherwise technical default.

#### E05-D-INVOICE-VOID-VISIBILITY

Needed only if Invoice columns/tables exist. Default lists exclude VOID; optional VOID filter exists on Contract invoice list.  
**PO decision required:** YES if Invoice is in REPORT-SCOPE.

#### E05-D-PAGINATION

Needed only if workspace-wide Invoice/Payment lists exist. Current reports are unpaginated at MVP volume.  
**PO decision required:** YES if REPORT-SCOPE = D.

### Not opened (explicitly out or already closed)

| ID | Status |
| --- | --- |
| E05-D-CURRENCY-GROUPING | CLOSED by D7 / R2-OD-002 — per currency; no FX; no mixed total |
| E05-D-XLSX-FORMAT | NOT AUTHORIZED |
| E05-D-PDF-FORMAT | NOT AUTHORIZED |
| E05-D-SAVED-REPORTS | NOT AUTHORIZED |
| E05-D-SCHEDULED-EXPORTS | NOT AUTHORIZED |
| E05-D-REPORT-PERSISTENCE | CLOSED by epic map — derived; no document store |
| E05-D-GROUPING | Not a standalone decision. Existing tables keep current grouping unless REPORT-SCOPE invents new reports, in which case grouping is part of that option |
| Alert / job / warehouse / profitability | NOT AUTHORIZED |

---

## 18. Proposed phase plan

Phases after P-E05-00 start only when blocking PO decisions are closed **and** a later chat authorizes implementation.

| Phase | Objective | Depends | Deliverables | Tests | Commit intent | Exit | Risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P-E05-00 | Planning / PO register | E01–E04 certified | This document | None | `docs(r2-e05): complete planning` | Planning recovered; blockers listed | Implicit product invention |
| P-E05-01 | Report read-model foundation | Closed REPORT-SCOPE, TEMPORAL-MODEL, FILTERS | `ReportingService` composition only. No Prisma. No UI. No CSV unless already required by types | Unit + integration isolation / authority | `feat(r2-e05): extend reporting read model` | Approved fields published from authoritative services | Formula duplication |
| P-E05-02 | Additive `/reports` UI | P-E05-01 | Columns/sections/filters only as approved | E2E reports | `feat(r2-e05): add approved report surfaces` | Additive UI only | Redesigning E01–E04 |
| P-E05-03 | Simple CSV | EXPORT-FORMATS = B; P-E05-02 | Native CSV response + control. **Skip entire phase if A** | Unit serialize; E2E download; authz | `feat(r2-e05): add simple csv export` | Tabular non-fiscal CSV | New library / document generation |
| P-E05-04 | QA / documentation | P-E05-02 and P-E05-03 or skip | Docs match shipped behavior | QA | `chore(r2-e05): complete qa and documentation` | PASS / PASS WITH FINDINGS | Doc drift |
| P-E05-05 | Release validation | P-E05-04 | Validation record | Gate B | none or docs-only | READY / BLOCKED | Claiming R2 production-ready |
| P-E05-06 | Certification | P-E05-05 | Certification metadata | — | `chore(r2-e05): certify advanced reporting` | CERTIFIED; R2 still not production-ready | Starting R2 release gates early |

P-E05-03 is omitted, not stubbed, when CSV is declined.

---

## 19. Critical path

### BLOCKING PO DECISIONS

1. **E05-D-REPORT-SCOPE**
2. **E05-D-TEMPORAL-MODEL** (unless REPORT-SCOPE = A)
3. **E05-D-REPORT-FILTERS**
4. **E05-D-EXPORT-FORMATS** (R2-OD-012)

### NONBLOCKING ENGINEERING CHOICES (after PO)

- Native CSV serializer vs adding a library (library needs an architecture decision; default is native)
- Whether Expected / allocation unused DTO fields are published (only if REPORT-SCOPE includes them)
- Index later if a workspace-wide list is approved and measured
- Exact Server Action / route shape for CSV

### Dependencies

- Certified E01 Accrued / Expected
- Certified E02 Invoice + derived VOID
- Certified E03 Payment + derived status
- Certified E04 Forecast + allocation
- No schema blocker for the default derived-report path

---

## 20. Release impact

| Area | E05 planning impact |
| --- | --- |
| Database schema | None required |
| Production migration | None required |
| Deployment process | Unchanged |
| Environment variables | None |
| Dependencies | None unless PO+architecture later add a library (not recommended for CSV) |
| Build / runtime | CSV would add a download response; no job worker |
| Security surface | Downloadable operational data **if** CSV approved |
| Production readiness | R2 remains **not** production-ready even after E05 certification |

---

## 21. Implementation authorization

```text
P-E05-00: COMPLETE AS PLANNING RECOVERY
IMPLEMENTATION: NOT AUTHORIZED
P-E05-01: NOT STARTED / NOT AUTHORIZED
SCHEMA / UI / EXPORT / ReportingService CHANGES: FORBIDDEN IN THIS PHASE
R2: NOT PRODUCTION-READY
```

A later chat may start P-E05-01 only after:

1. Blocking PO decisions are CLOSED in this document and `r2-open-decisions.md`
2. An explicit implementation authorization is given

---

## 22. Stop condition

P-E05-00 stops here.

Do not implement P-E05-01.  
Do not create migrations.  
Do not create UI.  
Do not implement exports.  
Do not modify `ReportingService`.  
Do not treat this plan as product approval of CSV, filters, or Invoice/Payment columns.
