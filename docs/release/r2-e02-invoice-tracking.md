# R2-E02 — Invoice Tracking — Epic Plan

**Epic:** R2-E02 — Invoice Tracking  
**Release:** Release 2 — Revenue Operations  
**MASTER_PLAN identifier:** R2-E02 (`MASTER_PLAN.md` §19)  
**Status:** P-E02-01 COMPLETE — READY FOR P-E02-02  
**Authority:** `docs/release/r2-decision-pack.md`  
**Companions:** `docs/release/r2-epic-map.md`, `docs/release/r2-architecture-delta.md`, `docs/release/r2-open-decisions.md`  
**Predecessor:** R2-E01 COMPLETE / RELEASE-READY (`docs/release/r2-e01-revenue-visibility.md`, closure `278101a347b6063450c34a91200878e548836edb`)  
**Does not assign:** an EPIC-2xx number

```text
P-E02-00  PLANNING / DECISION CLOSURE      COMPLETE
P-E02-01  PERSISTENCE / DOMAIN FOUNDATION  COMPLETE
P-E02-02  INVOICE APPLICATION SERVICE      NOT STARTED
P-E02-03  DERIVED STATUS / DUE DATE        NOT STARTED
P-E02-04  CONTRACT-SCOPED INVOICE UI       NOT STARTED
P-E02-05  ENGINEERING REVIEW               NOT STARTED
P-E02-06  QA                               NOT STARTED
P-E02-07  DOCUMENTATION / EPIC CLOSURE     NOT STARTED

R2-E02: P-E02-01 COMPLETE
IMPLEMENTATION: IN PROGRESS
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

E03 still owns payment-event persistence, alerts, and the exact
payment-list interaction with VOID invoices. E02 only reserves the
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
- E03: payment events may remain attached; they are excluded from active tracking. E03 must not physically delete the Invoice to hide payments

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
| E03-D-VOID-PAYMENTS | E03 | Payment rows attached to VOID invoices; alert exclusion |

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
VOID invoice: payments remain; excluded from active aggregates and alerts
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

### P-E02-05 — Engineering Review

| | |
| --- | --- |
| Objective | Review that implementation matches this plan and approved decisions |
| Scope | ER under `docs/release/` if still unlabeled |
| Dependencies | P-E02-04 |
| Non-scope | New features; E03 payments; reopening D2 |
| Exit criteria | ER recorded; E01 intact; no silent fiscal / FX / revenue rewrite |

### P-E02-06 — QA

| | |
| --- | --- |
| Objective | QA Invoice writes, VOID, currency guard, isolation, timezone, E01 regression |
| Dependencies | P-E02-05 |
| Exit criteria | AC-01…17 evidenced. Accrued / Expected suites green |

### P-E02-07 — Documentation / closure

| | |
| --- | --- |
| Objective | Align companions to implemented E02. Do not mark R2 production-ready |
| Dependencies | P-E02-06 |
| Exit criteria | Plan status COMPLETE / RELEASE-READY or equivalent evidenced close. Next = R2-E03. R2 not production-ready |

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
