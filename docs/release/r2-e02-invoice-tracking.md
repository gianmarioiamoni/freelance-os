# R2-E02 — Invoice Tracking — Epic Plan

**Epic:** R2-E02 — Invoice Tracking  
**Release:** Release 2 — Revenue Operations  
**MASTER_PLAN identifier:** R2-E02 (`MASTER_PLAN.md` §19)  
**Status:** COMPLETE WITH NON-BLOCKING FINDING — P-E02-00…P-E02-07 COMPLETE. Engineering Review PASS WITH FINDINGS. QA PASS WITH FINDINGS. F-E02-001 CLOSED. F-E02-002 CLOSED. F-E02-003 CLOSED. F-E02-004 OPEN (non-blocking / test hygiene).  
**Authority:** `docs/release/r2-decision-pack.md`  
**Companions:** `docs/release/r2-epic-map.md`, `docs/release/r2-architecture-delta.md`, `docs/release/r2-open-decisions.md`  
**Predecessor:** R2-E01 COMPLETE / RELEASE-READY (`docs/release/r2-e01-revenue-visibility.md`, closure `278101a347b6063450c34a91200878e548836edb`)  
**Does not assign:** an EPIC-2xx number

```text
P-E02-00  PLANNING / DECISION CLOSURE      COMPLETE
P-E02-01  PERSISTENCE / DOMAIN FOUNDATION  COMPLETE
P-E02-02  INVOICE APPLICATION SERVICE      COMPLETE
P-E02-03  DERIVED STATUS / DUE DATE        COMPLETE
P-E02-04  CONTRACT-SCOPED INVOICE UI       COMPLETE
P-E02-05  ENGINEERING REVIEW               COMPLETE — PASS WITH FINDINGS
P-E02-06  QA                               COMPLETE — PASS WITH FINDINGS
P-E02-07  DOCUMENTATION / EPIC CLOSURE     COMPLETE

R2-E02: COMPLETE WITH NON-BLOCKING FINDING
IMPLEMENTATION: P-E02-01 + P-E02-02 + P-E02-03 + P-E02-04
R1: FROZEN / GRANTED
R2-E01: COMPLETE / RELEASE-READY
R2: NOT PRODUCTION-READY
```

This plan is produced from the R2 planning baseline, the E01 closure
state, and the R1 Contract / Client / analytics / reporting
implementation. It does not invent fiscal policy. It does not implement
Invoice, Payment, Accrued, Expected, Forecast, or `allocatedMinutes`.
It does not modify `src/` or Prisma.

---

## R2-E02 Planning Verdict

**READY FOR IMPLEMENTATION**

Decision-gate items 1–10 are either already approved product decisions
or are closed in this document as planning decisions. No Product Owner
question remains that blocks P-E02-01.

Closed here (were residual):

| Residual | Closure |
| --- | --- |
| R2-OD-011 residual — Invoice currency representation | Persist an Invoice currency snapshot. Must equal Contract currency at write. Immutable after create. Not FX. |
| R2-OD-007 residual — VOID list / restore | VOID is one-way soft-delete. Default lists exclude VOID. Get-by-id remains. Optional voided filter on the Contract invoice list. No restore in R2. No distinct physical-delete state. |

E03 owns payment-event persistence and alerts. The VOID payment-row
interaction is closed by E03-D-VOID-PAYMENTS Option A
(`docs/release/r2-e03-payment-tracking.md`). E02 only reserved the
linkage contract.

---

## 1. Source documents

| Document | Used for |
| --- | --- |
| `docs/release/r2-decision-pack.md` | D2, D4, D5, D6, D7; R2-OD-006…011 |
| `docs/release/r2-open-decisions.md` | Residual #3 (currency snapshot), #4 (VOID) |
| `docs/release/r2-architecture-delta.md` | Invoice / Payment / currency planning classes |
| `docs/release/r2-epic-map.md` | Release-level E02 envelope |
| `docs/release/r2-e01-revenue-visibility.md` | Accrued / Expected boundary that E02 must not rewrite |
| `MASTER_PLAN.md` §19 | R2 scope pointer |
| `docs/product-vision.md` | Invoice Tracking, not Invoice Lifecycle |
| `docs/architecture.md` | A-006, A-007; WorkspaceContext; Analytics / Reporting split |
| `docs/domain-model.md` §3–§6, §12 | Contract, Client archive, BR-001/005/007/010/011/012 |
| `docs/storage.md` | No invoice lifecycle table today |
| `prisma/schema.prisma` | Contract / Client / Workspace fields actually present |
| `src/application/contracts/*` | Create / update / parsers / validity |
| `src/application/clients/archive-client.ts` | Existing one-way soft-lifecycle analogue |
| `src/application/analytics/*` | Accrued / Expected owners — do not modify |
| `src/lib/analytics-periods.ts` | `getTodayInTimezone` / calendar-date convention |
| `src/application/workspace/workspace-context.ts` | Isolation + timezone authority |

Where a historical R1 document and the R2 decision pack disagree, the
decision pack wins for R2 meaning. R1 certification / freeze snapshots
are not rewritten. E01 remains intact.

---

## 2. Product objective

Register operational invoice tracking records on a Contract so payments
can later be expected and reconciled. Not fiscal invoicing.

```text
Contract  →  Invoice Tracking record  →  (E03) Payment events
```

Invoice is a recorded operational fact: date, amount, currency, optional
reference, derived due date. It is not Accrued Revenue and not a
generated fiscal document.

### Explicit non-scope

- Invoice Lifecycle, generation, PDF, fiscal numbering, SDI, e-invoicing
- Invoice lines, pro-forma, credit / debit notes, recurring engine
- Payment event persistence, payment alerts (R2-E03)
- Accrued / Expected / Forecast rewrite (R2-E01 / R2-E04)
- Profitability, cost accounting, tax, FX, mixed-currency totals
- AI / ML, audit ledger, period closure
- Workspace-level invoice index, dashboard invoice widgets, E01 report columns
- Contract archive / delete (does not exist; do not invent)
- Fiscal immutability

---

## Scope

### In

- 1 Contract → N Invoice; 1 Invoice → exactly 1 Contract (R2-OD-006)
- Required `invoiceDate`
- Required positive `amount`
- Currency snapshot tied to Contract at write (D7, R2-OD-011, E02-D01)
- Optional free-text `reference` (R2-OD-007)
- `dueDate` only when snapshotted `paymentTermsDays` is present (R2-OD-008)
- Invoice editable while ACTIVE (R2-OD-007, E02-D03)
- VOID / soft-delete; no physical delete (R2-OD-007, E02-D02)
- Contract currency immutable after the first Invoice exists, including VOID (R2-OD-011)
- Pure derived payment status and overdue predicates, with `paidAmount = 0` until E03
- Contract-scoped list / get / create / update / VOID
- Workspace isolation on every read / write

### Out

Everything in §2 Explicit non-scope, plus:

- Treating Invoice as Accrued or Expected
- Invoice competence period
- User-overridable `dueDate`
- Invoice-level payment-term catalogue
- Restoring a VOID invoice
- Payment table, AlertService payment types
- Changing AnalyticsService / ReportingService revenue formulas or DTOs

---

## 3. Reused R1 / E01 semantics

Do not duplicate these rules. E02 consumes them.

| Semantic | Authority | E02 use |
| --- | --- | --- |
| Contract `currency` ISO 4217 | EPIC-102; D7 | Write-time source for Invoice currency snapshot |
| Contract `paymentTermsDays` | EPIC-102; D5; R2-OD-008 | Write-time source for due-date calculation. `null` → no dueDate |
| `paymentTermsDays = 0` | Existing parser allows `0` | `dueDate = invoiceDate`. Not a missing-terms case |
| No default payment terms | R2-OD-008 | Do not invent 30 days |
| `Workspace.currency` | EPIC-004; D7 | Contract create-form default only. Not Invoice currency. Not reporting base |
| `Workspace.timezone` | PD-105-003; `getTodayInTimezone` | Sole authority for `today` in overdue |
| Calendar dates as UTC midnight | TimeEntry `workDate`; Contract `validFrom` / `validTo` | `invoiceDate` and `dueDate` |
| Client archive is one-way | EPIC-101; no unarchive | VOID analogue: one-way, default lists exclude, history remains readable |
| Archived-client contracts remain readable and editable | EPIC-102 | Invoice create / edit / VOID remains allowed |
| No Contract archive or delete | schema; E01 plan | Do not invent. Validity end ≠ archive |
| Contract validity `[validFrom, validTo)` | domain §8 | TimeEntry eligibility only. Does not gate Invoice |
| Money storage `Decimal(19,4)` | Contract `rate`; TimeEntry `snapshotRate` | Invoice `amount` storage representation |
| Publication rounding | R2-OD-002 | Applies to Accrued / Expected. Not to the recorded Invoice amount |
| Accrued / Expected independent of Invoice | D4; E01 AC-15 | E02 must not read or write those formulas |
| Shared calculation services | A-006; BR-010 | Do not add a second revenue owner |
| Workspace isolation | A-007; BR-001 / BR-012 | Every Invoice query carries `workspaceId` |
| Resource id ≠ tenant grant | EPIC-101 / 102 / 103 | `invoiceId` / `contractId` never authorize a workspace |
| Roles | OBD-009 | Unchanged. No new Invoice role |
| AlertService | EPIC-106; D6 | Not used in E02 |

Reusable capabilities (do not reimplement):

- `parseCurrency` / `parseCalendarDate` / `parsePaymentTermsDays` patterns
- `WorkspaceContext` + membership resolution
- `getTodayInTimezone`
- Contract get / list / update (add currency guard only)
- Client archive semantics as VOID analogue — not as Invoice status

---

## Domain Model

Four concepts must stay distinct.

| # | Concept | Kind | Source |
| --- | --- | --- | --- |
| 1 | Contract commercial configuration | Live write model | `currency`, `paymentTermsDays`, validity, rate |
| 2 | Invoice Tracking record | New operational aggregate | Date, amount, currency snapshot, optional reference, dueDate, VOID |
| 3 | Derived payment view | Function of events | `paidAmount`, amount status, overdue. Events arrive in E03 |
| 4 | Accrued / Expected Revenue | Existing E01 read model | TimeEntry snapshot / live HOURLY capacity. Not Invoice |

`Payment` is an E03 aggregate. E02 defines the parent side of
`Invoice 1 → N Payment` and the derivation functions. It does not
persist Payment.

### 4.1 Invoice

Authoritative fields (conceptual; Prisma names in P-E02-01):

- identity
- `workspaceId`
- `contractId` (immutable after create)
- `invoiceDate` (required calendar date)
- `amount` (required, `> 0`)
- `currency` (ISO 4217 snapshot)
- `reference` (optional free text)
- `paymentTermsDays` (nullable snapshot of Contract terms at write)
- `dueDate` (nullable calendar date)
- VOID marker (`voidedAt` or equivalent; null = ACTIVE)
- `createdAt` / `updatedAt` (audit timestamps only)

Derived (not independent persisted truth):

- `paidAmount` — `sum(paymentEvents.amount)`; `0` while no events exist
- amount status — UNPAID / PARTIAL / PAID / MISMATCH
- overdue — boolean; independent of amount status

### 4.2 Relations

```text
Workspace 1 → N Contract 1 → N Invoice 1 → N Payment (E03)
Client 1 → N Contract
Invoice → exactly one Contract
Invoice is not a TimeEntry
Invoice is not Accrued
```

No Invoice ↔ TimeEntry association. No invoice lines.

### 4.3 Invariants

| ID | Invariant |
| --- | --- |
| INV-E02-01 | Invoice belongs to exactly one Contract and that Contract’s workspace |
| INV-E02-02 | `invoiceDate` is a required valid calendar date |
| INV-E02-03 | `amount > 0` |
| INV-E02-04 | Invoice currency equals Contract currency at create and at any ACTIVE edit that touches monetary identity. After create, Invoice currency is immutable |
| INV-E02-05 | After the first Invoice exists for a Contract (ACTIVE or VOID), Contract currency is immutable |
| INV-E02-06 | `dueDate` is absent iff snapshotted `paymentTermsDays` is `null` |
| INV-E02-07 | When `paymentTermsDays` is present, `dueDate = invoiceDate + paymentTermsDays` as calendar-day addition |
| INV-E02-08 | Invoice is not physically deleted |
| INV-E02-09 | VOID invoices are excluded from active tracking lists and active operational aggregates |
| INV-E02-10 | VOID invoices still count as monetary records for INV-E02-05 |
| INV-E02-11 | Invoice does not contribute to Accrued or Expected |
| INV-E02-12 | Amount status is derived; it is not stored as source of truth |
| INV-E02-13 | Overdue is a condition, not an amount status |
| INV-E02-14 | `contractId` is immutable after create |
| INV-E02-15 | ACTIVE invoices may be edited within E02-D03. VOID invoices may not be edited |
| INV-E02-16 | Mixed-currency Invoice sets are never summed into one total |

---

## State Model

Three independent axes. Do not collapse them into a fiscal lifecycle.

```text
trackingState     ACTIVE | VOID
amountStatus      UNPAID | PARTIAL | PAID | MISMATCH
overdue           true | false
```

### 5.1 Tracking state

| State | Meaning |
| --- | --- |
| ACTIVE | In operational tracking. Editable. Default list member |
| VOID | Removed from active tracking. Not physically deleted. Not editable. Not restorable in R2 |

VOID is not UNPAID, not PAID, and not a payment status.

Transition:

```text
ACTIVE → VOID     allowed
VOID → ACTIVE     not in R2
VOID → (physical delete)  forbidden
```

Re-void of an already VOID invoice is rejected.

### 5.2 Derived amount status (D5 / R2-OD-009)

```text
paidAmount = sum(paymentEvents.amount)     // 0 in E02
```

| paidAmount vs invoice.amount | Status |
| --- | --- |
| `= 0` | UNPAID |
| `> 0` and `< amount` | PARTIAL |
| `= amount` | PAID |
| `> amount` | MISMATCH |

No tolerance. Exact stored-decimal comparison. Do not compare
publication-rounded integers.

E02 always evaluates `paidAmount = 0` → UNPAID. PARTIAL / PAID /
MISMATCH are implemented as the same pure function so E03 can supply
events without rewriting the predicate.

### 5.3 Overdue (independent)

```text
overdue ≡ dueDate ≠ null AND dueDate < today AND paidAmount < amount
```

- `paymentTermsDays = null` → no `dueDate` → never overdue (R2-OD-008)
- `dueDate = today` is not overdue
- PARTIAL + overdue is valid once E03 exists
- VOID invoices are not evaluated for active overdue lists
- Alerts (`PAYMENT_OVERDUE` / `PAYMENT_PARTIAL` / `PAYMENT_MISMATCH`) are E03

### 5.4 E02 published view

For an ACTIVE invoice with no payments:

| Field | Value |
| --- | --- |
| trackingState | ACTIVE |
| paidAmount | 0 |
| amountStatus | UNPAID |
| overdue | `dueDate < today` if dueDate exists, else false |

---

## Open Decisions

Approved D2 / D5 / D7 / R2-OD-006…011 are not reopened. Items below
are the Decision Gate. Status is the reconstruction from the current
documents plus this planning close.

### E02-D01 — Invoice currency representation

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-011 residual; D7 |
| Question | Does Invoice persist its own currency, or always read live `Contract.currency`? |
| Status | **CLOSED** by this plan |
| Owner | Architect (product meaning unchanged under R2-OD-011) |

Options:

| Option | Trade-off |
| --- | --- |
| A. Live Contract currency only | Simpler schema. Invoice is not a self-describing Money record. Relies entirely on the mutation guard. Admin / future rule changes could rewrite history |
| B. Persist snapshot; must match Contract at write; immutable after create | One extra column. Defensive historical stability. Matches Money = amount + currency. Gives E03 a parent currency. Not FX |
| C. Snapshot that may later diverge | Forbidden by D7 |

**Decision:** B.

Invoice persists currency captured from Contract at create. Client-supplied
currency, if present, must equal Contract currency or the write is
rejected. Invoice currency cannot be edited. Live Contract currency is
not reread for historical display.

This does not change approved product meaning: after the first Invoice,
Contract currency cannot change, so snapshot and live value cannot
diverge under R2-OD-011. The snapshot is defensive historical
stability, not conversion.

### E02-D02 — VOID semantics

| Field | Value |
| --- | --- |
| Historical ID | R2-OD-007 residual |
| Question | Who can be VOID’d, is VOID reversible, how it appears, and whether it contributes to paidAmount / revenue? |
| Status | **CLOSED** by this plan |
| Owner | Planning close from approved “removed from active tracking” + existing Client-archive analogue. No new product page is invented |

Options considered:

| Option | Trade-off |
| --- | --- |
| One-way VOID, default lists exclude, get-by-id remains, optional voided filter | Matches Client archive. History inspectable. No restore UX invented |
| Reversible VOID | Requires restore semantics the register left open. Not present for Client archive |
| Physical delete | Forbidden by R2-OD-007 / BR-011 |
| Hide VOID with no read path | Conflicts with “historical invoices are not physically deleted” |

**Decision:**

- Any ACTIVE invoice may become VOID
- VOID is irreversible in R2
- Default Contract invoice list = ACTIVE only
- VOID remains readable by id
- Contract list may accept an explicit voided filter (same pattern as `?status=archived` on clients). No workspace VOID page
- VOID does not contribute to Accrued / Expected
- VOID does not contribute to active paidAmount / outstanding aggregates (E03 contract)
- There is no separate `deleted` state. VOID is the only removal
- VOID invoices still exist for R2-OD-011 currency immutability
- Edit / VOID-again of a VOID invoice is rejected
- E03: payment events may remain attached; they are excluded from active tracking. E03 must not physically delete the Invoice to hide payments. Write freeze on VOID is E03-D-VOID-PAYMENTS A (CLOSED)

### E02-D03 — Invoice editability

| Field | Value |
| --- | --- |
| Question | Which fields are editable on an ACTIVE invoice? |
| Status | **CLOSED** |

| Field | Editable | Rule |
| --- | --- | --- |
| `contractId` | No | Immutable association |
| `invoiceDate` | Yes | Recalculates `dueDate` from the Invoice payment-terms snapshot |
| `amount` | Yes | Must stay `> 0`. Recalculates derived amount status |
| `reference` | Yes | Optional free text; empty → null |
| `currency` | No | Snapshot; OD-011 / D7 |
| `paymentTermsDays` (snapshot) | No | Not an Invoice-level catalogue. Change Contract terms, then create a new Invoice, or VOID and recreate |
| `dueDate` | No | Derived. Not user-overridable |
| tracking state | ACTIVE → VOID only | Via VOID operation, not a general edit |

VOID invoices: no field edits.

### E02-D04 — Contract deletion / archive interactions

| Field | Value |
| --- | --- |
| Question | What happens if the Contract is archived or deleted while Invoices exist? |
| Status | **CLOSED** |

Current model: Contract has no status and no delete path. Client archive
is the only related lifecycle.

**Decision:** do not invent Contract archive or Contract delete in E02.

| Existing situation | Invoice behaviour |
| --- | --- |
| Contract `validTo` in the past | Invoice create / edit / VOID allowed. Validity is a TimeEntry rule |
| Client archived | Invoice create / edit / VOID on that Client’s existing Contracts remains allowed. New Contract create stays rejected (R1) |
| Contract later edited (`rate`, validity, `paymentTermsDays`) | Existing Invoice snapshots / stored dueDates are not rewritten |
| Contract currency edited after any Invoice (ACTIVE or VOID) | Rejected (R2-OD-011) |

Restrict-on-delete from Invoice → Contract is required so a future
delete path cannot orphan or cascade-destroy history.

### E02-D05 — Invoice visibility

| Field | Value |
| --- | --- |
| Question | Minimum surface without inventing UX |
| Status | **CLOSED** |

| Surface | E02 |
| --- | --- |
| Contract-scoped invoice list / get / create / edit / VOID | Yes. Attached to existing Contract detail |
| Invoice workspace index | No. E05 if ever justified |
| Dashboard exposure | No |
| Contract report / Annual overview / Hours-by-client | No Invoice columns. E01 DTOs unchanged |
| E05 report columns | Later, once E02/E03 facts are stable |

### E02-D06 — Revenue relationship

| Field | Value |
| --- | --- |
| Question | Does Invoice Tracking rewrite Accrued / Expected? |
| Status | **ALREADY CLOSED** (D4, E01 AC-15) |

Invoice is operational tracking. Accrued remains TimeEntry + commercial
snapshot. Expected remains HOURLY contractual capacity.

E02 must not modify `accrued-revenue.ts`, `expected-revenue.ts`,
`AnalyticsService.getAccruedRevenue` / `getExpectedRevenue`, or add
Invoice figures to `MonthlyAnalytics` / `ContractReport` /
`AnnualOverview`.

### E02-D07 — Currency (Contract / Invoice / Payment / FX)

| Field | Value |
| --- | --- |
| Status | **ALREADY CLOSED** (D7, R2-OD-011) plus E02-D01 |

| Record | Currency |
| --- | --- |
| Contract | Authority. Mutable only before the first Invoice / Payment |
| Invoice | Snapshot of Contract at create. Immutable |
| Payment (E03) | Must match Invoice / Contract. No independent currency |
| TimeEntry | Currency-agnostic |
| Workspace | Create-form default for Contract only |

No FX. No workspace-base rollup. Invoice lists / any future totals are
per currency.

### E02-D08 — Status model

| Field | Value |
| --- | --- |
| Status | **CLOSED** — see State Model |

Do not introduce NOT_DUE / OVERDUE as mutually exclusive amount
statuses (superseded D5 list). Do not persist amount status.

### E02-D09 — Dates / timezone

| Field | Value |
| --- | --- |
| Status | **CLOSED** |

| Topic | Rule |
| --- | --- |
| `invoiceDate` | Calendar date, UTC midnight, same convention as `workDate` / `validFrom` |
| `dueDate` | Calendar date = `invoiceDate + paymentTermsDays` (UTC date add). Not an instant |
| `today` | `getTodayInTimezone(Workspace.timezone)` |
| Overdue | `dueDate < today` (date compare). Process timezone must not shift the day |
| Timezone boundary | Workspace TZ 2026-09-22 00:30 and 23:30 are the same `today`. A process in `America/Los_Angeles` must not move `today` |
| Workspace TZ mutation | Timezone is immutable after workspace creation (R1 settings). E02 does not reopen that |
| Future `invoiceDate` | Allowed. Same posture as TimeEntry future `workDate` (PD-103-004). Do not invent a restriction |
| `now` injection | Tests pass an explicit `now` / `today` like analytics periods |

### E02-D10 — Amount semantics

| Field | Value |
| --- | --- |
| Status | **CLOSED** |

| Topic | Rule |
| --- | --- |
| Sign | Positive only |
| Zero | Not allowed. Matches `rate > 0`. A zero invoice is not a payment-tracking fact |
| Storage | Existing money representation: `Decimal(19,4)`. No new money type |
| Input | Reuse rate-like parsing (`> 0`, max 4 decimal places) |
| Publication | Recorded Invoice amount is displayed as stored. R2-OD-002 nearest-integer publication applies to Accrued / Expected, not to this operational fact. Rounding the stored invoice for display would break E03 reconciliation |
| `paidAmount` compare | Exact decimal equality. No tolerance, no prior rounding |
| Mixed currency | Never add EUR + USD invoice amounts |

### E02-D11 — dueDate vs live payment terms

| Field | Value |
| --- | --- |
| Question | Is `dueDate` live-derived from current `Contract.paymentTermsDays`? |
| Status | **CLOSED** |

Live derivation would rewrite historical overdue when Contract terms
change. That is the same class of historical-correctness defect E01
closed for Accrued.

**Decision:** snapshot `paymentTermsDays` on Invoice at create (nullable).
Persist computed `dueDate`. Later Contract `paymentTermsDays` edits do
not rewrite existing Invoices. `invoiceDate` edit recomputes `dueDate`
from the Invoice snapshot, not from live Contract terms.

### Still open — not E02 blockers

| ID | Needed by | Note |
| --- | --- | --- |
| R2-OD-005 Forecast arithmetic | E04 | Untouched |
| R2-OD-012 CSV in E05 | E05 | Untouched |
| R2-OD-013 WARNING threshold | E04 | Untouched |

E03-D-VOID-PAYMENTS is CLOSED by P-E03-00 — Option A freeze writes on VOID (`docs/release/r2-e03-payment-tracking.md`).

---

## Data Model Delta

P-E02-01 implemented the Prisma identifiers below. Types are existing
R1 representations. No Payment table.

### New aggregate — Invoice

| Conceptual field | Planning type | Constraint |
| --- | --- | --- |
| id | uuid | PK |
| workspaceId | uuid | FK Workspace Restrict |
| contractId | uuid | FK Contract Restrict; immutable |
| invoiceDate | date | required |
| amount | Decimal(19,4) | CHECK `amount > 0` |
| currency | CHAR(3) | ISO 4217; snapshot |
| reference | text? | optional |
| paymentTermsDays | int? | snapshot; `null` allowed |
| dueDate | date? | null iff `paymentTermsDays` is null |
| voidedAt | timestamptz? | null = ACTIVE |
| createdAt / updatedAt | timestamptz | existing convention |

### Relations

- `Workspace 1 → N Invoice`
- `Contract 1 → N Invoice`
- Composite workspace isolation on Contract, same class as TimeEntry:
  Invoice must not reference a Contract from another workspace
- Payment (E03): `Invoice 1 → N Payment`. Do not create the Payment
  table in E02. Keep the parent identity stable for that relation

### Indexes / uniqueness (planning)

- `@@unique([workspaceId, id])`
- index `(workspaceId, contractId, invoiceDate)`
- index `(workspaceId, voidedAt)`
- every query includes `workspaceId`

### Contract write-rule (no new Contract column)

`updateContract` rejects `currency` change when any Invoice exists for
that Contract, ACTIVE or VOID.

### Not added

- Invoice line table
- Invoice number / SDI / PDF fields
- persisted amount status
- competence period
- `allocatedMinutes`
- Payment table
- Accrued / Expected tables
- Contract archive / status

### Migration considerations (P-E02-01)

- New table only. No backfill. No Invoice rows exist
- TimeEntry snapshot columns are untouched
- Contract / Client / Analytics tables are untouched except the
  Contract currency guard in application code
- SQL CHECK for `amount > 0` follows `rate` / `snapshotRate`
- CHECK: `dueDate` null ↔ `paymentTermsDays` null, if expressible;
  otherwise enforce in the application write path
- `onDelete: Restrict` on Contract and Workspace

---

## Application/API Surface

No public REST resource. Reuse RSC + Server Actions + application
functions, same as Contract.

Do not add a `RevenueService`. Do not put Invoice formulas in
`AnalyticsService` or `ReportingService`.

```text
Server Action / RSC loader
  → Invoice application functions (membership + parse + invariants)
    → InvoiceRepository (workspace-scoped)
      → persistence

Contract update
  → existing updateContract
    → Invoice existence probe (currency guard)
```

### Use cases

| Use case | Notes |
| --- | --- |
| createInvoice | Contract must exist in workspace. Capture currency + paymentTermsDays from Contract. Compute dueDate. Reject archived-client only if a later product decision reopens E02-D04 (current decision: allow) |
| updateInvoice | ACTIVE only. Recalculate dueDate if invoiceDate changes. Do not recapture currency. Do not recapture paymentTermsDays |
| voidInvoice | ACTIVE → VOID. Reject if already VOID |
| getInvoice | ACTIVE or VOID. Unknown / foreign id → not found |
| listInvoicesForContract | Default ACTIVE. Optional voided filter. Ordered by invoiceDate, then createdAt |
| assertContractCurrencyMutable | Used by `updateContract` |

### Repository contract (conceptual)

```text
InvoiceRepository
  createInvoice(workspaceId, input)
  getInvoice(workspaceId, invoiceId)
  listInvoicesForContract(workspaceId, contractId, { tracking?: ACTIVE | VOID | ALL })
  updateInvoice(workspaceId, invoiceId, input)
  voidInvoice(workspaceId, invoiceId)
  existsForContract(workspaceId, contractId)  // includes VOID
```

All methods take `workspaceId`. Resource id alone is not a grant.

### Domain functions (pure)

| Function | Responsibility |
| --- | --- |
| `computeDueDate(invoiceDate, paymentTermsDays)` | null terms → null; else calendar add |
| `deriveAmountStatus(amount, paidAmount)` | UNPAID / PARTIAL / PAID / MISMATCH |
| `isOverdue(dueDate, today, amount, paidAmount)` | independent boolean |
| `isActive(voidedAt)` | tracking predicate |

`paidAmount` is an argument. E02 callers pass `0`. E03 will pass the sum.

### Contract update delta

Existing `updateContract` gains: if `currency` changes and
`existsForContract` is true → domain error (currency immutable). Other
Contract fields remain editable.

### Input parsing

Follow Contract parsers. New Invoice input errors; do not overload
unrelated Contract field names without need.

Reference: trim; empty → null. Apply a technical max length in
P-E02-01 consistent with existing text fields (do not invent a product
catalogue).

### E03 reserved contract

```text
paidAmount(invoice) = sum(payment.amount where payment.invoiceId = invoice.id)
Payment.currency must equal Invoice.currency
VOID invoice: payments remain; excluded from active aggregates and alerts; no create/update/delete (E03-D-VOID-PAYMENTS A)
Invoice amount / VOID / invoiceDate edits in E02 must keep E03 able to
recompute status from events
```

---

## Reporting/Analytics Boundary

| Allowed in E02 | Forbidden in E02 |
| --- | --- |
| Contract-scoped Invoice list / detail as operational records | Adding Invoice amounts into Accrued |
| Per-currency grouping if a Contract has mixed historical currencies (cannot occur under OD-011 after first Invoice; still never FX-sum) | Adding Invoice amounts into Expected or Forecast |
| E05 later reading Invoice facts from the Invoice service | Changing `ContractReport`, `MonthlyAnalytics`, `AnnualOverview` |
| | Dashboard money from invoices |
| | Hours-by-client monetary invention |
| | Parallel revenue service |

E01 published money remains the only analytics money in R2 until E05
explicitly adds Invoice columns. E02 UI may show the recorded Invoice
amount as a stored operational fact on the Contract invoice list.

---

## Security / Workspace Isolation

| Requirement | Rule |
| --- | --- |
| Membership | Every use case resolves `WorkspaceContext` and verifies membership. Non-member → unauthorized |
| Scope | Every persistence call includes `context.workspaceId` |
| Foreign Invoice id | Not found. Never leak Workspace B payload |
| Foreign Contract id | Cannot create or list invoices. Not found |
| Browser input | `workspaceId` is never a client-supplied tenant grant |
| `invoiceId` / `contractId` | Resource ids only |
| Cross-workspace | Workspace A cannot read or void Workspace B invoices |
| Archived client | Isolation unchanged. Archive is not a tenant boundary |
| Roles | OBD-009 unchanged |
| VOID | Soft-delete is not a way to bypass isolation. Rows remain workspace-scoped |

Negative tests are mandatory (see Test Strategy).

---

## Test Strategy

Implementation phases own the tests. This document does not add them.

Reuse as regression baselines:

- `tests/unit/application/contracts/*`
- `tests/integration/application/contracts/*`
- `tests/integration/persistence/contracts.test.ts`
- Accrued / Expected / reporting suites — must stay green with no DTO change

### Unit

- `computeDueDate`: null terms → null; `0` days → `invoiceDate`; N days calendar add; month/year overflow
- `deriveAmountStatus`: 0 / partial / equal / greater
- `isOverdue`: null dueDate; dueDate = today; dueDate < today; paidAmount ≥ amount
- Input parse: amount ≤ 0 rejected; amount with 4 dp accepted; currency case-normalize; empty reference → null
- VOID / ACTIVE predicates

### Integration

- create captures Contract currency and paymentTermsDays
- create rejects currency mismatch
- create on ended Contract succeeds
- create on archived-client Contract succeeds
- update invoiceDate recomputes dueDate from snapshot, not live Contract terms
- Contract paymentTermsDays edit does not rewrite Invoice dueDate
- Contract currency edit rejected after first Invoice
- Contract currency edit rejected after VOID Invoice (still a monetary record)
- Contract currency edit allowed when no Invoice exists
- VOID excludes from default list; get-by-id still returns
- VOID invoice is not editable
- Re-void rejected
- No physical row delete
- Workspace A cannot read / update / void Workspace B invoice
- Foreign contractId in A context → not found
- Non-member → unauthorized
- Accrued / Expected unchanged after Invoice create / edit / VOID
- Mixed-currency workspace: invoices stay in their snapshot currency; no converted total

### E2E (P-E02-04)

- From Contract detail: create, edit amount / date / reference, VOID
- Default list hides VOID
- `paymentTermsDays = null` → no due date
- Contract currency field rejected after an invoice exists
- No dashboard / reports change required for E02 acceptance

### Regression

R1 Contract / Client / TimeEntry / analytics / reporting behaviour
unchanged except the Contract currency guard.

---

## Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-01 | Invoice is created against exactly one existing workspace Contract with required invoiceDate and amount > 0 |
| AC-02 | Invoice currency is the Contract currency snapshot and cannot diverge at write |
| AC-03 | Invoice currency is immutable after create |
| AC-04 | Contract currency cannot change after the first Invoice exists, including VOID invoices |
| AC-05 | `paymentTermsDays = null` → no dueDate and no overdue |
| AC-06 | When terms exist, dueDate = invoiceDate + snapshotted paymentTermsDays as calendar days |
| AC-07 | Later Contract payment-terms edits do not rewrite existing dueDates |
| AC-08 | ACTIVE invoice may edit invoiceDate, amount, reference; not currency, contractId, or dueDate directly |
| AC-09 | VOID is soft-delete; row remains; default list excludes it; get-by-id returns it |
| AC-10 | VOID cannot be edited, restored, or physically deleted |
| AC-11 | Derived amount status with no payments is UNPAID; overdue is independent |
| AC-12 | Accrued and Expected figures are unchanged by Invoice writes |
| AC-13 | No fiscal document, number, line, PDF, or SDI exists |
| AC-14 | Workspace isolation holds on create / get / list / update / VOID |
| AC-15 | Invoice amounts are never FX-converted or mixed-currency summed |
| AC-16 | Payment events and payment alerts are absent |
| AC-17 | Ended Contract and archived-client Contract still accept Invoice writes |

Count: **17**.

---

## Phase Plan

Methodology: Release → Epic → Phase → Commit. One phase, one objective,
one commit. No implementation commit is created by this plan.

P-E02-03 is kept separate from P-E02-02 so due-date / status predicates
are proven as pure domain behaviour before UI. P-E02-04 is
Contract-scoped UI only — not E01 reporting integration.

### P-E02-00 — Planning / decision closure

| | |
| --- | --- |
| Objective | Freeze E02 semantics, close currency-snapshot and VOID residuals, phase the epic |
| Scope | This document and companion planning pointers |
| Dependencies | R2 decision pack; E01 COMPLETE / RELEASE-READY |
| Non-scope | Application code, schema, migrations, tests |
| Tests | None |
| Migration | No |
| Exit criteria | Plan committed; no `src/` / Prisma / R1 snapshot changes; residuals #3 and #4 closed here |
| Status | **COMPLETE** with this commit |

### P-E02-01 — Persistence / domain foundation

| | |
| --- | --- |
| Objective | Persist the Invoice tracking record and domain types. Choose Prisma names |
| Scope | Schema + migration; repository port / adapter; conceptual fields in Data Model Delta; no application use cases yet beyond repository isolation |
| Dependencies | P-E02-00 |
| Non-scope | Server Actions, UI, Accrued, Payment table, Contract currency guard wiring |
| Tests | Persistence create / get / list / update / void; workspace isolation; amount CHECK; dueDate null iff terms null |
| Migration | **Yes. Only E02 migration.** |
| Exit criteria | Invoice rows persist; VOID is not a physical delete; Contract / TimeEntry / E01 tables unchanged |
| Status | **COMPLETE** |

Implemented identifiers:

| Conceptual field | Prisma / domain |
| --- | --- |
| Invoice aggregate | `Invoice` / `InvoiceRecord` |
| currency snapshot | `Invoice.currency` `CHAR(3)` |
| payment-terms snapshot | `Invoice.paymentTermsDays` |
| due date | `Invoice.dueDate` `DATE` |
| VOID marker | `Invoice.voidedAt` (`null` = ACTIVE) |
| amount | `Decimal(19,4)` + SQL `Invoice_amount_positive` |
| dueDate ↔ terms | SQL `Invoice_dueDate_terms_consistency` |
| workspace isolation | `workspaceId` + composite FK `Invoice_workspaceId_contractId_fkey` Restrict |

Migration: `prisma/migrations/20260922210000_add_invoice_tracking`.

Repository: `InvoiceRepository` — `createInvoice`, `getInvoice`, `listInvoicesForContract`, `updateInvoice` (no `contractId` / currency / terms rewrite), `voidInvoice`, `existsForContract` (includes VOID). All methods take `workspaceId`.

Domain: `src/domain/invoice.ts` amount / currency / reference / terms / VOID predicates. Amount status and overdue remain unpersisted.

Tests: `tests/unit/domain/invoice.test.ts`, `tests/integration/persistence/invoices.test.ts`, plus migration / isolation / FK regression.

### P-E02-02 — Invoice application service

| | |
| --- | --- |
| Objective | Workspace-scoped create / update / void / get / list and Contract currency guard |
| Scope | Application functions; parsers; errors; `updateContract` currency immutability; membership |
| Dependencies | P-E02-01 |
| Non-scope | UI; AlertService; AnalyticsService changes; Payment |
| Tests | AC-01…04, AC-08…10, AC-14, AC-17 write paths; currency mismatch; VOID edit rejected |
| Migration | No |
| Exit criteria | All Invoice writes go through application functions. Contract currency guard holds including VOID |
| Status | **COMPLETE** |

Implemented application use cases:

| Function | Behaviour |
| --- | --- |
| `createInvoice` | WorkspaceContext → Contract in workspace → snapshot `currency` + `paymentTermsDays` → `dueDate = computeDueDate(invoiceDate, snapshot)`. Expired Contract and archived Client allowed. Client-supplied currency, if present, must equal Contract currency or the write is rejected (`InvalidInvoiceInputError.currency`). User-supplied terms / dueDate are ignored. |
| `getInvoice` | Workspace-scoped. Returns ACTIVE and VOID. Foreign / unknown id → `InvoiceNotFoundError`. |
| `listInvoicesForContract` | Contract must belong to the workspace. Default `ACTIVE`. Optional `VOID` / `ALL`. No workspace invoice index. |
| `updateInvoice` | ACTIVE only. Editable: `invoiceDate`, `amount`, `reference`. `invoiceDate` change recomputes `dueDate` from the Invoice terms snapshot, not live Contract terms. Rejects `contractId` / `currency` / `paymentTermsDays` / `dueDate` / `voidedAt`. VOID → `InvoiceNotEditableError`. |
| `voidInvoice` | ACTIVE → VOID. Re-void → `InvoiceAlreadyVoidedError`. No restore. Row remains. |
| `assertContractCurrencyMutable` | `InvoiceRepository.existsForContract` (includes VOID), workspace-scoped. Used by `updateContract` only when `currency` actually changes. |

`dueDate` construction uses `computeDueDate` in `src/domain/invoice.ts`: calendar-day add on UTC date components (`Date.UTC(year, month, day + terms)`). `null` terms → `null`. `0` → `invoiceDate`. Not a timezone instant.

Contract currency guard: `existsForContract(workspaceId, contractId)` is true for ACTIVE and VOID. A cross-workspace Invoice does not block. Same-currency Contract updates remain allowed after invoices exist.

### P-E02-02 race / consistency finding

`runInTransaction` exists and rebuilds repositories on the Prisma transaction client. Invoice create and Contract currency update remain separate application calls with check-then-act (`existsForContract` then `updateContract`; `getContract` then `createInvoice`).

Repositories have no `SELECT FOR UPDATE` / serializable isolation API. Concurrent `createInvoice` and `updateContract(currency)` at the default Read Committed isolation can still interleave so a currency change commits after an Invoice exists, or an Invoice snapshots a currency that then changes in the other transaction.

This is the same class of documented race as first-workspace creation. Full protection needs row locking or a higher isolation level that is not present. Not invented here.

### P-E02-02 test evidence

Unit: `tests/unit/domain/invoice.test.ts` (`computeDueDate`), `tests/unit/application/invoices/invoice-services.test.ts`, currency-guard cases in `tests/unit/application/contracts/contract-services.test.ts`.

Integration: `tests/integration/application/invoices/invoice-services.test.ts` — create/read/update/void, snapshots, expired Contract, archived Client, currency mismatch, currency guard ACTIVE/VOID, workspace isolation.

Regression: Invoice persistence; Contract application / integrity; Accrued / Expected / reporting suites via the existing `updateContract` signature (now receives `InvoiceRepository`).

P-E02-03 is COMPLETE. P-E02-04 remains NOT STARTED. Payment and UI are out of this phase.

The P-E02-02 concurrent Invoice-create / Contract-currency-update race is not resolved here. Classified in P-E02-05 as F-E02-001. HIGH. Does not block E02.

### P-E02-03 — Derived status / due-date behaviour

| | |
| --- | --- |
| Objective | Pure dueDate / amount-status / overdue functions wired into Invoice reads |
| Scope | `computeDueDate`, `deriveAmountStatus`, `isOverdue`; create/update use snapshot terms; `today` from `Workspace.timezone`; paidAmount argument defaults to 0 |
| Dependencies | P-E02-02 |
| Non-scope | Payment persistence; alerts; UI chrome |
| Tests | AC-05, AC-06, AC-07, AC-11; timezone boundary; `paymentTermsDays = 0`; dueDate = today not overdue |
| Migration | No |
| Exit criteria | Predicates match State Model. Process TZ cannot shift overdue |
| Status | **COMPLETE** |

Implemented predicates (`src/domain/invoice-derived.ts`):

| Function | Behaviour |
| --- | --- |
| `deriveAmountStatus(amount, paidAmount)` | Exact decimal compare. `0` → UNPAID; `0 < paid < amount` → PARTIAL; `paid = amount` → PAID; `paid > amount` → MISMATCH. No float, no rounding, no FX. |
| `isOverdue(dueDate, today, paidAmount, amount)` | `dueDate ≠ null AND dueDate < today AND paidAmount < amount`. `today` is an explicit `{ year, month, day }`. No system clock inside the predicate. |
| `deriveInvoiceFields` | Pure derived bundle: `trackingState`, `paidAmount`, `amountStatus`, `overdue`. Does not persist. |

`today` / timezone: application reads `getTodayInTimezone(Workspace.timezone, now)`. `now` is injectable. Process timezone cannot shift the calendar day. UTC is not used as a workspace default.

dueDate (unchanged write semantics):

- `paymentTermsDays = null` → `dueDate` null → never overdue
- terms `0` → `dueDate = invoiceDate`
- terms `N` → `dueDate = invoiceDate + N` calendar days (`computeDueDate`)
- Invoice snapshot: later Contract terms edits do not rewrite existing invoices
- ACTIVE `invoiceDate` edit recomputes `dueDate` from the Invoice terms snapshot
- VOID remains non-editable

E02 paidAmount: there is no Payment aggregate. Reads pass `paidAmount = 0`. Effective E02 `amountStatus` is always UNPAID. PARTIAL / PAID / MISMATCH are implemented so E03 can supply a sum without rewriting the predicates.

Read wiring: `getInvoice` / `listInvoicesForContract` return `InvoiceDerivedView` (`InvoiceRecord` plus derived fields). No `amountStatus` column. No Payment schema. VOID still computes the same predicates and is marked `trackingState = VOID`; it is not an active payable item. No new payment-filtering semantics.

P-E02-02 race finding is unchanged. Classified in P-E02-05 as F-E02-001.

### P-E02-04 — Contract-scoped invoice UI

| | |
| --- | --- |
| Objective | Minimum Contract-attached surface: list / create / edit / VOID |
| Scope | Existing Contract detail only. Default ACTIVE list. Optional voided filter. Display stored amount and currency code. No new workspace route required |
| Dependencies | P-E02-03 |
| Non-scope | Dashboard widgets; `/reports` Invoice columns; workspace invoice index; restore control; money on E01 tables |
| Tests | E2E AC paths on Contract detail; reports / dashboard unchanged |
| Migration | No |
| Exit criteria | AC-12, AC-13, AC-15, AC-16 hold on existing surfaces. E01 UI still does not render Accrued as Invoice |
| Status | **COMPLETE** |

Invoice visibility is Contract detail only. No workspace invoice index, dashboard cards, E01 columns, analytics changes, global search, Payment UI, fiscal/PDF/numbering/SDI, or alerts.

UI surface:

| Route | Behaviour |
| --- | --- |
| `/contracts/[contractId]` | Commercial terms unchanged. New Invoices section. Default list `ACTIVE`. Filter links `Active` / `Void` / `All` via `?tracking=`. |
| `/contracts/[contractId]/invoices/new` | Create form. Currency and payment terms from the Contract, read-only. `dueDate` preview only. |
| `/contracts/[contractId]/invoices/[invoiceId]` | Detail for ACTIVE and VOID. VOID remains readable. Confirm void via `?confirm=void`. |
| `/contracts/[contractId]/invoices/[invoiceId]/edit` | ACTIVE only. VOID redirects back to detail. |

Create / update / void:

- Create fields: `invoiceDate`, `amount`, optional `reference`. Currency is the Contract currency, not an input. Payment terms shown from the Contract. `dueDate` is derived by `computeDueDate` and is not submitted.
- Update fields: `invoiceDate`, `amount`, `reference`. Currency, contract, payment-terms snapshot, and `dueDate` are not editable. Changing `invoiceDate` previews the recomputed due date; the server recomputes from the Invoice terms snapshot.
- VOID is a separate confirm action (same pattern as client archive). After VOID: no edit, no restore. Direct detail URL still shows the VOID invoice.

Default list excludes VOID. Filter `VOID` / `ALL` uses `listInvoicesForContract`. VOID cards are visually marked.

Derived status: E02 has no Payment, so `amountStatus` displays Unpaid. `dueDate` null → "No due date" and no overdue label. Past due + unpaid → Overdue. Today is not overdue.

Security / isolation: Server Actions bind `contractId` from the route. `getInvoiceOnContract` requires WorkspaceContext, Contract in workspace, and Invoice.contractId match. Foreign workspace and same-workspace other-contract IDs 404. Application services remain the write authority.

E2E evidence: `tests/e2e/contract-invoices.spec.ts` — 1 passed. Covers create, invalid amount, due-date preview, edit ACTIVE, void, VOID filter + direct detail, null payment terms → no due date, Contract currency rejected after an invoice exists, other-contract ID 404, other-workspace 404. Contract regression: `tests/e2e/contracts.spec.ts`.

UX: Invoices section added under existing commercial terms. No Contract detail redesign. Currency is a labeled read-only value. Due date preview is `aria-live`. VOID confirm uses the archive-style alert + confirm control.

P-E02-02 race finding is unchanged. Classified in P-E02-05 as F-E02-001.

### P-E02-05 — Engineering Review

| | |
| --- | --- |
| Objective | Review that implementation matches this plan and approved decisions |
| Scope | ER under `docs/release/` if still unlabeled |
| Dependencies | P-E02-04 |
| Non-scope | New features; E03 payments; reopening D2 |
| Exit criteria | ER recorded; E01 intact; no silent fiscal / FX / revenue rewrite |
| Carried finding | P-E02-02 concurrent Invoice create + Contract currency update can bypass the currency guard under Read Committed without row lock / serializable protection. Classified as F-E02-001. |
| Status | **COMPLETE** — PASS WITH FINDINGS |

**HEAD reviewed:** `454a7936a658a13bb11f84db909cc61bc56c7a84`

```text
VERDICT:                 PASS WITH FINDINGS
BLOCKING FINDINGS:       NONE
F-E02-001:               OPEN — HIGH — currency race
F-E02-002:               OPEN — MEDIUM — VOID update TOCTOU
F-E02-003:               OPEN — LOW — companion docs stale
P-E02:                   NOT BLOCKED
P-E02-06 QA:             AUTHORIZED
PRODUCTION READINESS:    UNCHANGED (R2 not production-ready)
```

Full review: § Engineering Review below.

### P-E02-06 — QA

| | |
| --- | --- |
| Objective | QA Invoice writes, VOID, currency guard, isolation, timezone, E01 regression |
| Dependencies | P-E02-05 |
| Exit criteria | AC-01…17 evidenced. Accrued / Expected suites green |
| Status | **COMPLETE** — PASS WITH FINDINGS |

**HEAD reviewed:** `3ccbb181072a0e83b90ecbe5a3b2a93fbb7c99a3`

```text
VERDICT:                 PASS WITH FINDINGS
BLOCKING FINDINGS:       NONE
F-E02-001:               CLOSED — concurrency lock
F-E02-002:               CLOSED — VOID update WHERE
F-E02-003:               CLOSED — companions synchronized in P-E02-07
F-E02-004:               OPEN — NON-BLOCKING / TEST HYGIENE
P-E02:                   COMPLETE WITH NON-BLOCKING FINDING
P-E02-07:                COMPLETE
PRODUCTION READINESS:    UNCHANGED (R2 not production-ready)
```

Full QA: § P-E02-06 QA Gate below.

### P-E02-07 — Documentation / closure

| | |
| --- | --- |
| Objective | Align companions to implemented E02. Do not mark R2 production-ready |
| Dependencies | P-E02-06 |
| Exit criteria | Plan status COMPLETE / RELEASE-READY or equivalent evidenced close. Next = R2-E03. R2 not production-ready |
| Status | **COMPLETE** — E02 COMPLETE WITH NON-BLOCKING FINDING |

**HEAD closed:** this P-E02-07 commit.

```text
VERDICT:                 COMPLETE WITH NON-BLOCKING FINDING
F-E02-001:               CLOSED
F-E02-002:               CLOSED
F-E02-003:               CLOSED — companions synchronized
F-E02-004:               OPEN — NON-BLOCKING / TEST HYGIENE
BLOCKING FINDINGS:       NONE
R2-E02:                  COMPLETE WITH NON-BLOCKING FINDING
NEXT R2 WORK:            R2-E03 Payment Tracking (detailed plan)
PRODUCTION READINESS:    UNCHANGED (R2 not production-ready)
```

---

## Documentation

Documents updated by **this** planning commit (P-E02-00):

| Document | Update |
| --- | --- |
| `docs/release/r2-e02-invoice-tracking.md` | This plan |
| `docs/release/r2-open-decisions.md` | Residuals #3 and #4 closed; point here |
| `docs/release/r2-epic-map.md` | E02 detailed-plan pointer; phase labels |
| `docs/release/r2-decision-pack.md` | Residual table |
| `docs/release/r2-architecture-delta.md` | Invoice snapshot / VOID planning class |
| `MASTER_PLAN.md` | §4 / §19 / next-actions pointer |
| `docs/product-vision.md` | E02 plan recorded |
| `docs/domain-model.md` | Pointer to this plan |
| `docs/architecture.md` | Deferred Invoice snapshot / VOID residual closed as planning |
| `CHANGELOG.md` | Unreleased planning entry |
| `README.md` | Status line |

Documents to update at **P-E02-07** (not now):

| Document | Update |
| --- | --- |
| This plan | Phase statuses COMPLETE |
| `docs/release/r2-epic-map.md` | E02 implementation status |
| `docs/release/r2-architecture-delta.md` | Persistence implemented |
| `docs/domain-model.md` §12 | Invoice tracking record exists |
| `docs/storage.md` | Invoice table, once named |
| `docs/architecture.md` | Invoice module boundary |
| `MASTER_PLAN.md` | Next = E03 |
| `CHANGELOG.md` / `README.md` | Implementation close |

Do not rewrite:

- `docs/release/r1-freeze.md`
- `docs/release/production-validation.md`
- `docs/release/production-certification.md`
- E01 plan status (remains COMPLETE / RELEASE-READY)

---

## Commit

Planning-only message for P-E02-00:

```text
docs(r2-e02): plan invoice tracking
```

---

## P-E02-05 Engineering Review

**Date:** 2026-09-22  
**Phase:** P-E02-05  
**Reviewed HEAD:** `454a7936a658a13bb11f84db909cc61bc56c7a84`  
(`5a9a5b2` P-E02-00 · `1fc3a06` P-E02-01 · `0a05a35` P-E02-02 · `b773402` P-E02-03 · `454a793` P-E02-04)

### Verdict

**PASS WITH FINDINGS**

No blocker. Invoice Tracking matches the approved operational model. Invariants hold on sequential write paths. Currency / VOID concurrency holes are real and classified. E01 Accrued / Expected / reporting are untouched. No Payment table, no fiscal lifecycle, no restore, no physical delete.

### Findings

#### F-E02-001

| Field | Value |
| --- | --- |
| Severity | high |
| Area | Concurrency / INV-E02-04 / INV-E02-05 |
| Evidence | `createInvoice` is `getContract` then insert. `updateContract` is `existsForContract` then update when currency changes. The two use cases are separate application calls. Repositories expose no `SELECT FOR UPDATE`. Prisma default isolation is Read Committed. `runInTransaction` exists and rebuilds repositories on the transaction client, but neither path uses it. |
| Impact | Concurrent `existsForContract() → false` on T1 and T2 can commit a Contract currency change after an Invoice exists, or let an Invoice snapshot a currency that the other transaction then changes. Sequential paths reject the change, including after VOID. The invariant is application-enforced only. |
| Why it is real | Under Read Committed, the existence probe does not lock the Contract row. T1 and T2 can both observe “no invoice” / “current currency”, then write. There is no indirect transactional protection, no composite write, and no database trigger / constraint tying `Contract.currency` mutation to Invoice existence. |
| Why it does not block E02 | Same class as accepted first-workspace check-then-act (F-004-001). Sequential AC-04 holds. Requires concurrent requests. Architecture does not yet provide a row-lock API; inventing one inside this review is out of scope. |
| Remediation | Lock the Contract row inside `runInTransaction` on both `createInvoice` and currency-changing `updateContract` (`SELECT FOR UPDATE` of the Contract, then exists/read, then write). Do not switch the whole app to Serializable. A Contract-update trigger that rejects currency change when any Invoice exists is a valid second line; a perpetual `Invoice.currency = Contract.currency` CHECK is the wrong tool (the snapshot is historical). |
| Recommended phase | Before E03 Payment writes. Not P-E02-06. No PO decision. |

#### F-E02-002

| Field | Value |
| --- | --- |
| Severity | medium |
| Area | Concurrency / INV-E02-15 |
| Evidence | Application `updateInvoice` rejects VOID via `isActiveInvoice`, then calls the repository. Repository `updateInvoice` uses `WHERE id + workspaceId` only. Repository `voidInvoice` already uses `voidedAt: null`. |
| Impact | Concurrent VOID + update can edit a VOID invoice. Sequential VOID edit / re-void / no-restore paths are tested and hold. |
| Remediation | `updateMany` must include `voidedAt: null`. If count is 0 and the row is VOID, raise `InvoiceNotEditableError`. |
| Recommended phase | Same follow-up as F-E02-001, before E03. Does not block E02. |

#### F-E02-003

| Field | Value |
| --- | --- |
| Severity | low |
| Area | Documentation |
| Evidence | `docs/release/r2-epic-map.md` still lists P-E02-01…04 as NOT STARTED. `docs/release/r2-open-decisions.md` still says E02 implementation is not started. `docs/architecture.md` still says Invoice persistence is not implemented. `docs/release/r2-architecture-delta.md` still classifies the Invoice table as absent and still derives Payment `expectedPaymentDate` from live `Contract.paymentTermsDays` (superseded by E02-D11 snapshot). |
| Impact | Companions are stale. This plan and the implemented code are the E02 authority. |
| Remediation | Synchronize in P-E02-07. Do not rewrite R1 freeze snapshots. Architecture-delta Payment date must point at Invoice `dueDate` / snapshotted terms. |
| Recommended phase | P-E02-07. Does not block P-E02-06. |

### Verified areas

- Domain: 1 Contract → N Invoice; Invoice → exactly one Contract; `amount > 0` in parse + SQL `Invoice_amount_positive`; `Decimal(19,4)`; currency / paymentTermsDays / dueDate snapshots; `contractId` and Invoice currency immutable after create; ACTIVE / VOID via `voidedAt`; VOID one-way; no `deleteInvoice`; no fiscal fields / numbering / lines / PDF / SDI.
- Persistence: composite FK `Invoice_workspaceId_contractId_fkey` Restrict; `@@unique([workspaceId, id])`; planned indexes present; `Invoice_dueDate_terms_consistency` CHECK; no Payment model; no `paidAmount` / `amountStatus` columns.
- Application: create snapshots Contract currency + terms and computes `dueDate`; client-supplied currency must match or is rejected; user terms / dueDate are not write inputs; update recomputes `dueDate` from the Invoice terms snapshot; forbidden update fields rejected; VOID cannot update or restore; re-void rejected; `existsForContract` includes VOID and is workspace-scoped.
- Snapshots: later Contract currency / terms / rate edits do not rewrite Invoice rows. `invoiceDate` edit uses the Invoice terms snapshot, not live Contract terms.
- Derived status: exact decimal compare; 0 → UNPAID; partial → PARTIAL; equal → PAID; over → MISMATCH. `isOverdue` uses explicit `today`; no system clock in the predicate; `dueDate = today` not overdue; null `dueDate` not overdue; partial overdue possible; paid / mismatch not overdue. Reads pass `paidAmount = 0`.
- Timezone: `today = getTodayInTimezone(Workspace.timezone, now)`; calendar dates as UTC midnight; process TZ cannot shift the day.
- Isolation: every repository method takes `workspaceId`; `invoiceId` / `contractId` are not tenant grants; cross-workspace and cross-contract reads / writes 404 or not-found; currency guard does not see foreign-workspace invoices.
- UI security: Server Actions resolve `WorkspaceContext`; create binds route `contractId`; update / void require `getInvoiceOnContract`; form payload cannot set currency, contractId, terms, dueDate, or voidedAt; VOID edit route redirects; no restore control.
- E03 boundary: no Payment table, no Payment UI, no payment lifecycle. Predicates are pure and take `paidAmount`. VOID still computes the same predicates and is marked `trackingState = VOID`. E03-D-VOID-PAYMENTS was E03-owned at this review; closed by P-E03-00 (Option A).
- E01 boundary: `src/application/analytics/*` and reporting DTOs were not modified by E02 commits. Invoice is not read by Accrued / Expected. No dashboard / report Invoice columns.
- Performance: Contract-scoped `findMany` with `(workspaceId, contractId, invoiceDate)` index. No serial N+1. Duplicate workspace/contract loads on Contract detail are the existing page-loader pattern, not a new list N+1.

### Test Evidence

Executed for this review (no new tests added):

| Suite | Passed | Failed | Skipped | Result |
| --- | --- | --- | --- | --- |
| Unit domain invoice / invoice-derived + invoice application + contract-services + invoice features | 79 | 0 | 0 | PASS |
| Unit analytics / reporting | 116 | 0 | 0 | PASS |
| Integration invoice persistence / invoice application / contract-invoice-access / contract application / contract persistence | 34 | 0 | 0 | PASS |
| Integration Accrued / Expected / revenue-reporting / reporting-service / TimeEntry snapshot | 58 | 0 | 0 | PASS |
| E2E `contract-invoices.spec.ts` + `contracts.spec.ts` | 2 | 0 | 0 | PASS |
| `pnpm typecheck` | — | — | — | PASS |
| `pnpm lint` | — | — | — | PASS |

**Total: 289 passed / 289. Failed: 0. Skipped: 0.**

Coverage notes (not findings): workspace / contract isolation, currency snapshot + guard including VOID, VOID one-way, dueDate snapshot, derived status, overdue / timezone, and Contract-detail E2E are real. Accrued / Expected independence after Invoice writes is design-enforced (analytics does not read Invoice) and is evidenced by the E01 suites staying green, not by a dedicated Invoice-then-Accrued assertion. The currency race has no concurrent test, as expected.

### Concurrency

F-E02-001 is confirmed. The currency invariant is bypassable under concurrent `createInvoice` and `updateContract(currency)` at Read Committed. There is no hidden row lock or serializable wrap. It does **not** block E02. Remediation is Contract-row locking inside the existing transaction helper, optionally plus a Contract-update trigger. Do not implement that remediation in this commit.

F-E02-002 is the same check-then-act class on VOID editability.

### E03 Readiness

- Consume `Invoice.dueDate` and snapshotted `Invoice.paymentTermsDays`. Do not reread live `Contract.paymentTermsDays`.
- Pass `sum(payment.amount)` into the existing `deriveAmountStatus` / `isOverdue` / `deriveInvoiceFields` predicates. Do not persist `paidAmount` or `amountStatus`.
- `Payment.currency` must equal `Invoice.currency`.
- VOID invoices still derive UNPAID / overdue mathematically. E03 must exclude VOID from active paidAmount / outstanding / alert lists. E03-D-VOID-PAYMENTS was E03-owned at this review; closed by P-E03-00 (Option A). E02 did not invent “delete payments with VOID” or “VOID is a payment status”.
- Close F-E02-001 before Payment writes if Contract currency immutability after first monetary record must be absolute.

### Release Impact

- Blocker: no
- E02 release-ready: no (P-E02-06 QA and P-E02-07 closure remain; R2 is not production-ready)
- Open findings: F-E02-001, F-E02-002, F-E02-003
- Product Owner decisions: none for E02. E03-D-VOID-PAYMENTS was left to E03; closed by P-E03-00 (Option A).
- P-E02-06 QA is authorized. P-E02-06 is **not** started by this review.

---

## P-E02-06 QA Gate

**Date:** 2026-09-22  
**Phase:** P-E02-06  
**Reviewed HEAD:** `3ccbb181072a0e83b90ecbe5a3b2a93fbb7c99a3`  
**Host clock:** Europe/Rome (CEST, UTC+2)

### Verdict

**PASS WITH FINDINGS**

No blocker. AC-01…AC-17 and INV-E02-01…16 hold on existing unit, integration, concurrency, and E2E evidence. F-E02-001 and F-E02-002 are closed by `3ccbb18`. F-E02-003 remains for P-E02-07. F-E02-004 is an environmental parallel-E2E timeout; isolated rerun passed. E01 Accrued / Expected / reporting remain green. No application remediation. No new product decision.

### Commands executed

| Command | Result |
| --- | --- |
| `pnpm test:db:migrate` | PASS — no pending migrations |
| Targeted E02 unit | PASS — 80 / 80 |
| Targeted E02 integration (incl. concurrency) | PASS — 28 / 28 |
| Full unit (`pnpm test`) | PASS — 572 / 572 |
| E01 Accrued / Expected / reporting / snapshot integration | PASS — 63 / 63 |
| Full integration (`pnpm test:integration`) | PASS — 289 / 289 |
| E2E contract-invoices | PASS — 1 / 1 |
| E2E contracts (isolated rerun) | PASS — 1 / 1 |
| E2E reports | PASS — 21 / 21 |
| E2E dashboard | PASS — 5 / 5 |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm build` | PASS |

First parallel E2E batch (5 workers: invoices + contracts + reports + dashboard): 28 passed / 1 failed (`contracts.spec.ts` 30s timeout). Isolated rerun of that file: 16.3s PASS. Classified as environment, not an application defect.

### Test matrix

| Suite | Passed | Failed | Skipped | Result |
| --- | ---: | ---: | ---: | --- |
| Unit domain invoice / invoice-derived + invoice application + contract-services + invoice features | 80 | 0 | 0 | PASS |
| Full unit | 572 | 0 | 0 | PASS |
| Integration invoice persistence / application / concurrency / UI access / contracts | 28 | 0 | 0 | PASS |
| Integration Accrued / Expected / revenue-reporting / reporting-service / snapshot | 63 | 0 | 0 | PASS |
| Full integration | 289 | 0 | 0 | PASS |
| E2E `contract-invoices.spec.ts` | 1 | 0 | 0 | PASS |
| E2E `contracts.spec.ts` (isolated) | 1 | 0 | 0 | PASS |
| E2E `reports.spec.ts` | 21 | 0 | 0 | PASS |
| E2E `dashboard.spec.ts` | 5 | 0 | 0 | PASS |
| Lint | — | 0 | 0 | PASS |
| Typecheck | — | 0 | 0 | PASS |
| Build | — | 0 | 0 | PASS |

### Acceptance criteria

| ID | Result | Evidence |
| --- | --- | --- |
| AC-01 | PASS | Unit/integration create; amount > 0 parse + SQL CHECK; E2E create |
| AC-02 | PASS | Create snapshots Contract currency; supplied USD mismatch rejected |
| AC-03 | PASS | Update parser rejects `currency`; repository cannot rewrite it; E2E no currency input |
| AC-04 | PASS | Application guard ACTIVE + VOID; concurrency create-then-currency rejected |
| AC-05 | PASS | Null terms → null dueDate; `isOverdue` false; E2E “No due date” |
| AC-06 | PASS | `computeDueDate` calendar add; terms `0` → invoiceDate; E2E 2026-09-01 + 30 → 2026-10-01 |
| AC-07 | PASS | Integration: Contract terms edit leaves Invoice snapshot / dueDate |
| AC-08 | PASS | Update allows date/amount/reference; forbids contractId/currency/terms/dueDate |
| AC-09 | PASS | VOID row remains; default list excludes; get-by-id and VOID filter return it |
| AC-10 | PASS | VOID edit / re-void / restore rejected; `updateMany` requires `voidedAt: null`; no delete API |
| AC-11 | PASS | Reads pass `paidAmount = 0` → UNPAID; overdue independent; today not overdue |
| AC-12 | PASS | Analytics/reporting do not read Invoice; E01 suites 63/63; full integration 289/289 |
| AC-13 | PASS | No fiscal fields / Payment model / PDF / SDI routes |
| AC-14 | PASS | Persistence/application/UI isolation; E2E foreign workspace 404 |
| AC-15 | PASS | List/detail show stored amount + snapshot currency; no FX; no mixed total |
| AC-16 | PASS | No Payment table, Payment UI, alerts, or persisted `paidAmount` / `amountStatus` |
| AC-17 | PASS | Create allowed on expired Contract and archived-client Contract |

INV-E02-01…16 hold on the same evidence. INV-E02-16: Contract-scoped list never sums amounts.

### Findings

#### F-E02-001

| Field | Value |
| --- | --- |
| Severity | high |
| Area | Concurrency / INV-E02-04 / INV-E02-05 |
| Status | **CLOSED** — `3ccbb18` |
| Evidence | `lockContract` `SELECT … FOR UPDATE` inside `runInTransaction` on create and Contract update. Integration: create-then-currency → `ContractCurrencyImmutableError`, both stay EUR; currency-then-create snapshots USD. |
| Impact | Sequential and concurrent currency invariants hold. |
| Remediation phase | None. |

#### F-E02-002

| Field | Value |
| --- | --- |
| Severity | medium |
| Area | Concurrency / INV-E02-15 |
| Status | **CLOSED** — `3ccbb18` |
| Evidence | Repository `updateInvoice` `WHERE voidedAt: null`. Persistence VOID update → `InvoiceNotEditableError`. Concurrent VOID-then-update rejected; amount unchanged. |
| Impact | VOID cannot be edited after the row is voided. |
| Remediation phase | None. |

#### F-E02-003

| Field | Value |
| --- | --- |
| Severity | low |
| Area | Documentation |
| Status | **CLOSED** — P-E02-07 |
| Evidence | QA recorded companions stale. P-E02-07 synchronized `r2-epic-map.md`, `r2-architecture-delta.md`, `r2-open-decisions.md`, `MASTER_PLAN.md`, `CHANGELOG.md`, `README.md`, `docs/architecture.md`, `docs/domain-model.md`, `docs/product-vision.md`, and `docs/storage.md`. |
| Impact | Companions now match implemented E02. |
| Remediation | Synchronized in P-E02-07. Do not rewrite R1 freeze snapshots. |
| Recommended phase | P-E02-07 |

#### F-E02-004

| Field | Value |
| --- | --- |
| Severity | low |
| Area | Environment / E2E |
| Status | **OPEN — NON-BLOCKING / TEST HYGIENE** (historical) |
| Evidence | Parallel Playwright (5 workers) timed out `contracts.spec.ts` at 30s. Isolated rerun: 16.3s PASS. Same file passed in P-E02-05 with 2 workers. Product paths in that file are unchanged by E02 except the currency-guard error after invoices exist, which is covered by `contract-invoices.spec.ts`. |
| Impact | No application defect. Parallel E2E load + default 30s timeout. Does not block E02 closure. |
| Remediation | None in product code. Optional later timeout / worker hygiene. Not required for E02 closure. Not remediating here. |
| Recommended phase | Optional test hygiene. Does not block E02. |

### Regression

E01 Accrued / Expected / reporting / commercial snapshot integration 63/63. Full integration 289/289 includes isolation, membership, timezone, and Contract application. E2E reports 21/21 and dashboard 5/5. Dashboard and `/reports` have no Invoice reads. Contract E2E isolated PASS.

### Concurrency

| Race | Result |
| --- | --- |
| In-flight `createInvoice` lock vs `updateContract(currency)` | PASS — currency update rejected; Invoice and Contract stay EUR |
| In-flight Contract currency lock vs `createInvoice` | PASS — Invoice snapshots committed USD |
| In-flight VOID vs `updateInvoice` | PASS — `InvoiceNotEditableError`; amount unchanged; `voidedAt` set |

F-E02-001 CLOSED. F-E02-002 CLOSED.

### Security / isolation

PASS. Repository and application queries carry `workspaceId`. `invoiceId` / `contractId` are not tenant grants. Cross-workspace create/get/list/update/VOID → not found. Cross-contract Invoice URL → 404. Server Actions bind route ids and re-check Contract + Invoice association. Form payload cannot set currency, `contractId`, terms, `dueDate`, or `voidedAt`. VOID edit route redirects. No restore.

### Build / tooling

| Check | Result |
| --- | --- |
| typecheck | PASS |
| lint | PASS |
| build | PASS — invoice routes only under `/contracts/[contractId]/invoices/…`; no workspace invoice index; no Payment route |

### Release impact

| Item | Value |
| --- | --- |
| Blocker | No |
| E02 release-ready | COMPLETE WITH NON-BLOCKING FINDING after P-E02-07 |
| Open findings | F-E02-004 (non-blocking / test hygiene) |
| PO decision required | No |
| P-E02-07 | COMPLETE |
| R2 production-ready | No |

---

## P-E02-07 Documentation / Epic closure

**Date:** 2026-09-22  
**Phase:** P-E02-07  
**Scope:** Documentation only. No application, schema, Payment, or UX change.

### Verdict

**COMPLETE WITH NON-BLOCKING FINDING**

Companions identified by F-E02-003 are aligned to the implemented E02
scope, Engineering Review, concurrency remediation, and QA Gate.
F-E02-004 remains as historical test hygiene. No new product decision.
R2-E02 is closed as an epic. R2 as a release is not production-ready.

### F-E02-003 remediation

| Companion | Alignment |
| --- | --- |
| `docs/release/r2-epic-map.md` | E02 / P-E02-01…P-E02-07 status set to implemented / COMPLETE. ER PASS WITH FINDINGS. QA PASS WITH FINDINGS. |
| `docs/release/r2-architecture-delta.md` | Invoice table exists. Payment `expectedPaymentDate` reads Invoice `dueDate` / snapshotted terms. Payment remains unimplemented. |
| `docs/release/r2-open-decisions.md` | Residuals #3 / #4 remain APPROVED / CLOSED and marked implemented. Residuals #1 / #2 / #5 unchanged. |
| `MASTER_PLAN.md` | §4 / §19 / next-actions: E02 COMPLETE WITH NON-BLOCKING FINDING. Next work = R2-E03 detailed plan. |
| `CHANGELOG.md` | Unreleased entry for E02 closure. Historical rows not rewritten. |
| `README.md` | Status line: E02 COMPLETE WITH NON-BLOCKING FINDING. Next = E03 plan. R2 not production-ready. |
| `docs/architecture.md` | Invoice Tracking persistence implemented. §35 invoice-aggregate residual no longer “persistence not implemented”. |
| `docs/domain-model.md` | §12 Invoice Tracking record exists; E02 COMPLETE WITH NON-BLOCKING FINDING. Accrued / Expected unchanged. |
| `docs/product-vision.md` | §14 E02 COMPLETE WITH NON-BLOCKING FINDING. E03–E05 remain in planning. |
| `docs/storage.md` | Invoice table recorded. Payment still not designed here. No invoice lifecycle. |

R1 freeze / certification / production-validation snapshots were not rewritten.

### Documented E02 semantics (unchanged)

- Invoice Tracking is an operational record. Not fiscal invoicing, numbering, PDF, SDI, lines, or Invoice Lifecycle.
- 1 Contract → N Invoice; Invoice → exactly one Contract.
- Create snapshots Contract `currency` and `paymentTermsDays`. `dueDate` is computed and stored. Later Contract term edits do not rewrite Invoice rows. `invoiceDate` edit recomputes `dueDate` from the Invoice snapshot, not live Contract terms.
- Invoice currency is immutable after create. Contract currency is immutable after the first Invoice, including VOID.
- VOID is one-way soft-delete via `voidedAt`. Default lists exclude VOID. Get-by-id remains. No restore. No physical delete.
- Derived `amountStatus` / overdue are read-time. E02 has no Payment; reads pass `paidAmount = 0`. Effective amount status is UNPAID.
- Invoice does not write Accrued or Expected. Analytics / reporting do not read Invoice.
- Payment is not implemented.

### QA evidence (from P-E02-06; not re-run)

| Item | Value |
| --- | --- |
| QA Verdict | PASS WITH FINDINGS |
| F-E02-001 | CLOSED |
| F-E02-002 | CLOSED |
| F-E02-003 | CLOSED (this phase) |
| F-E02-004 | OPEN — NON-BLOCKING / TEST HYGIENE |
| Unit | 572 / 572 |
| Integration | 289 / 289 |
| E02 targeted integration + concurrency | 28 / 28 |
| E01 regression | 63 / 63 |
| E2E contract-invoices | 1 / 1 |
| E2E contracts isolated | 1 / 1 |
| E2E reports | 21 / 21 |
| E2E dashboard | 5 / 5 |
| Typecheck / lint / build | PASS |
| AC-01…AC-17 | PASS |
| INV-E02-01…16 | PASS |
| Blocker | None |

### Final status

```text
R2-E02 Invoice Tracking = COMPLETE WITH NON-BLOCKING FINDING

NEXT:                      R2-E03 Payment Tracking (detailed plan)
E03 / E04 / E05:           NOT COMPLETE
R2 PRODUCTION-READY:       NO
```
