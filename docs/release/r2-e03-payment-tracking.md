# R2-E03 — Payment Tracking & Reconciliation — Epic Plan

**Epic:** R2-E03 — Payment Tracking & Reconciliation  
**Release:** Release 2 — Revenue Operations  
**MASTER_PLAN identifier:** R2-E03 (`MASTER_PLAN.md` §19)  
**Status:** P-E03-00 COMPLETE. P-E03-01…P-E03-07 NOT STARTED / NOT AUTHORIZED.  
**Authority:** `docs/release/r2-decision-pack.md`  
**Companions:** `docs/release/r2-epic-map.md`, `docs/release/r2-architecture-delta.md`, `docs/release/r2-open-decisions.md`  
**Predecessor:** R2-E02 COMPLETE WITH NON-BLOCKING FINDING (`docs/release/r2-e02-invoice-tracking.md`)  
**Does not assign:** an EPIC-2xx number

```text
P-E03-00  PLANNING / VOID POLICY CLOSURE   COMPLETE
P-E03-01  PERSISTENCE / DOMAIN FOUNDATION  NOT STARTED / NOT AUTHORIZED
P-E03-02  PAYMENT APPLICATION SERVICE      NOT STARTED / NOT AUTHORIZED
P-E03-03  PAYMENT ALERTS                   NOT STARTED / NOT AUTHORIZED
P-E03-04  CONTRACT-SCOPED PAYMENT UI       NOT STARTED / NOT AUTHORIZED
P-E03-05  ENGINEERING REVIEW               NOT STARTED / NOT AUTHORIZED
P-E03-06  QA                               NOT STARTED / NOT AUTHORIZED
P-E03-07  DOCUMENTATION / EPIC CLOSURE     NOT STARTED / NOT AUTHORIZED

R2-E03: P-E03-00 COMPLETE — IMPLEMENTATION NOT OPENED
R2-E02: COMPLETE WITH NON-BLOCKING FINDING
R2-E01: COMPLETE / RELEASE-READY
R1: FROZEN / GRANTED
R2: NOT PRODUCTION-READY
```

This plan does not implement Payment. It does not modify `src/` or
Prisma. It does not open P-E03-01.

---

## R2-E03 Planning Verdict

**P-E03-00 COMPLETE**

`E03-D-VOID-PAYMENTS` is **DECIDED / CLOSED**.

| Residual | Closure |
| --- | --- |
| E03-D-VOID-PAYMENTS | **Option A — Freeze writes on VOID.** Existing Payment rows may remain. No create / update / delete on a VOID Invoice. Payments stay readable as history. VOID is excluded from active paidAmount / outstanding / overdue lists / payment alerts. No cascade-delete. No restore. |

No Product Owner question remains that blocked this planning close.
Deferred technical items below stay open. They must not be assumed in
implementation. This commit does **not** authorize P-E03-01.

---

## 1. Source documents

| Document | Used for |
| --- | --- |
| `docs/release/r2-decision-pack.md` | D5, D6, R2-OD-008…011 |
| `docs/release/r2-open-decisions.md` | Residual #4 VOID tail |
| `docs/release/r2-architecture-delta.md` | Payment / alert / currency planning classes |
| `docs/release/r2-epic-map.md` | Release-level E03 envelope |
| `docs/release/r2-e02-invoice-tracking.md` | Invoice parent, reserved contract, predicati |
| `MASTER_PLAN.md` §19 | R2 scope pointer |

Where a historical document and the decision pack disagree, the
decision pack wins. E02 reserved contract wins over older “live
Contract terms / currency” Payment wording.

---

## 2. Epic definition

Track expected versus actual payments operationally and surface simple
deterministic discrepancies — without an accounting subsystem.

Know whether an Invoice is UNPAID, PARTIAL, PAID, MISMATCH, and/or
overdue, from editable Payment events.

---

## 3. Scope

### In scope

- Payment event aggregate: Invoice 1 → N Payment
- `paidAmount = SUM(payment.amount)` passed into existing E02 predicates
- Amount status UNPAID / PARTIAL / PAID / MISMATCH (R2-OD-009)
- Independent overdue (R2-OD-009)
- `expectedPaymentDate = Invoice.dueDate` (snapshot). Never live Contract terms
- Events editable / deletable on **ACTIVE** invoices only (R2-OD-010 + E03-D-VOID-PAYMENTS A)
- Alerts `PAYMENT_OVERDUE` / `PAYMENT_PARTIAL` / `PAYMENT_MISMATCH` (D6)
- Invoice read wiring: stop hardcoding `paidAmount = "0"`
- Contract-scoped Invoice surfaces already in E02
- VOID exclusion from active aggregates / alerts
- Freeze writes on VOID (this close)

### Out of scope

- Accounts receivable / accounting / bank reconciliation
- Installment / schedule / grace / risk / AI / percentage thresholds
- Immutable ledger / reversal / audit
- Persisted `paidAmount` / `amountStatus`
- FX / workspace-base / cross-currency totals
- Accrued / Expected / Forecast
- Fiscal lifecycle, PDF, numbering, SDI, lines
- Restore Invoice
- Cascade-delete Payment
- Serializable isolation globally
- Perpetual `Invoice.currency = Contract.currency` CHECK
- Workspace payment index, dashboard money, E01 / E05 columns
- Invented scheduler / cron
- F-E02-004
- E04 / E05

### Dependencies

- E02 Invoice Tracking (snapshots, `dueDate`, predicates, Contract-scoped UI)
- `Workspace.timezone` for `today`
- `AlertService` (alert phase)
- E02 concurrency: `lockContract`, Invoice `voidedAt IS NULL` conditional writes

---

## 4. Domain model delta

```text
Workspace 1 → N Contract 1 → N Invoice 1 → N Payment
```

Payment is a new operational event. Invoice remains the parent. No
TimeEntry association. No Accrued rewrite.

Conceptual fields (D5 / architecture-delta). **Prisma names are not
decided.**

| Concept | Kind | Note |
| --- | --- | --- |
| identity | persist | |
| workspaceId | persist | isolation on every call |
| invoiceId | persist | immutable; Restrict; same workspace |
| paymentDate | persist | calendar date; `invoiceDate` / `workDate` convention |
| amount | persist | `Decimal(19,4)` analogue; sign = `E03-D-PAYMENT-AMOUNT` (open) |
| currency | persist or inherit | must equal `Invoice.currency` at write; representation open |
| notes | persist optional | |
| createdAt / updatedAt | persist | audit only |

Do not persist Payment.status, paidAmount, amountStatus, overdue, or
expectedPaymentDate.

Invoice schema is unchanged. Reads pass the SUM into
`deriveAmountStatus` / `isOverdue` / `deriveInvoiceFields`.

---

## 5. Invariants

Reuse INV-E02-01…16. E03 adds:

| ID | Invariant |
| --- | --- |
| INV-E03-01 | Payment belongs to exactly one Invoice in the same workspace |
| INV-E03-02 | `invoiceId` is immutable after create |
| INV-E03-03 | Payment currency equals Invoice currency at write; Payment currency is not independently mutable |
| INV-E03-04 | No Payment without an Invoice |
| INV-E03-05 | `paidAmount` is SUM of events; `0` when none exist |
| INV-E03-06 | Amount status and overdue are not persisted source of truth |
| INV-E03-07 | Overdue is a condition, not an amount status |
| INV-E03-08 | VOID Invoice is excluded from active paidAmount / outstanding / overdue lists / payment alerts |
| INV-E03-09 | Payment is not a ledger; ACTIVE edit/delete recalculates derived state |
| INV-E03-10 | Mixed-currency amounts are never summed |
| INV-E03-11 | Payment does not modify Accrued or Expected |
| INV-E03-12 | Live Contract `paymentTermsDays` is not reread |
| INV-E03-13 | VOID Invoice rejects Payment create / update / delete (E03-D-VOID-PAYMENTS A) |
| INV-E03-14 | Existing Payments on VOID remain; they are not cascade-deleted |
| INV-E03-15 | Invoice restore is not in R2 |

Contract currency remains immutable after the first Invoice, including
VOID (E02). Payment is never the first monetary record.

---

## 6. Payment semantics

Payment is an operational event, not a status machine and not a ledger.

| Axis | Owner |
| --- | --- |
| trackingState ACTIVE \| VOID | Invoice |
| amountStatus UNPAID \| PARTIAL \| PAID \| MISMATCH | derived Invoice |
| overdue | derived Invoice |
| Payment | event; no own status |

```text
paidAmount = SUM(payment.amount WHERE invoiceId)
0                  → UNPAID
0 < paid < amount  → PARTIAL
paid = amount      → PAID
paid > amount      → MISMATCH

overdue ≡ dueDate ≠ null AND dueDate < today AND paidAmount < amount
```

Exact stored-decimal compare. No tolerance. R2-OD-002 publication
rounding does not apply. `today` is `getTodayInTimezone(Workspace.timezone)`.
`dueDate = today` is not overdue. Null terms never overdue.
PARTIAL + OVERDUE is valid. PAID / MISMATCH are not overdue.

ACTIVE edit/delete recalculates derived state. Delete removes the event
(no reversal row), consistent with R2-OD-010.

ACTIVE Invoice `amount` / `invoiceDate` edits (E02-D03) still
recalculate derived status without rewriting Payment rows.

---

## 7. VOID semantics — E03-D-VOID-PAYMENTS

| Field | Value |
| --- | --- |
| ID | E03-D-VOID-PAYMENTS |
| Historical ID | R2-OD-007 residual payment-row tail; residual #4 |
| Status | **DECIDED / CLOSED** by P-E03-00 |
| Owner | Product Owner |
| Decision | **Option A — Freeze writes on VOID** |

### Closed rule

- A VOID Invoice may keep existing Payment rows.
- CREATE Payment on VOID is rejected.
- UPDATE Payment on VOID is rejected.
- DELETE Payment on VOID is rejected.
- Existing Payments remain readable as history (get-by-id / voided filter).
- VOID is not a payment status.
- VOID is excluded from active paidAmount / outstanding / overdue lists / payment alerts.
- No cascade-delete of Payments.
- No Invoice restore.
- `paidAmount` / `amountStatus` remain derived and unpersisted.
- No ledger / reversal / audit.
- No FX.
- No Accrued / Expected change.

Get-by-id of a VOID Invoice may pass the historical SUM into the
existing predicates. Those values are historical, not active tracking.

VOID of an Invoice must not delete Payments. Active payment alerts for
that Invoice must be excluded; resolve-on-VOID follows from exclusion
and is not a new product page.

### Historical options (not current)

Considered during planning. Not available as current choices.

| Option | Meaning | Disposition |
| --- | --- | --- |
| A. Freeze writes on VOID | No create/update/delete; history remains | **ADOPTED** |
| B. Full Payment CRUD on VOID | Writes remain after VOID | Rejected by PO |
| C. Create forbidden; edit/delete allowed | Mixed write rule | Rejected by PO |
| Cascade-delete Payments | Hide history | Excluded by E02 reserved contract |
| Restore Invoice | Re-open VOID | Excluded by E02-D02 |

---

## 8. Currency / reconciliation

```text
Contract.currency  →  Invoice.currency (snapshot, immutable)
Invoice.currency   →  Payment write authority (must match; no FX)
```

D5 / architecture-delta still say “consistent with Contract”. E02-D01 /
E02-D07 / E02 reserved contract make Invoice the write-time authority.
After the first Invoice, Contract currency cannot change, so live
Contract and Invoice snapshot cannot diverge under R2-OD-011.

Whether Payment **persists** a currency column or inherits Invoice
currency at read remains `E03-D` technical (deferred). The match rule
does not.

Reconciliation in R2 is operational expected vs actual:

| Expected | Actual | Discrepancy |
| --- | --- | --- |
| `invoice.amount` + `dueDate` | `paidAmount` | amountStatus + overdue + alerts |

Not bank matching. Not accounting.

---

## 9. Concurrency

Reuse E02. No global Serializable. No new locking framework.

| Race | Rule |
| --- | --- |
| Payment create vs Invoice VOID | Reject if VOID. `runInTransaction` + Invoice row lock `FOR UPDATE`, or a write conditioned on `voidedAt IS NULL`. Same class as F-E02-002 |
| Payment update/delete vs VOID | Same. VOID wins; mutation rejected |
| Payment vs Invoice currency change | Invoice currency is immutable. Validate match at write |
| Payment vs `updateContract(currency)` | Contract already locked after first Invoice. Do not add a second Contract lock path unless a later phase proves need |
| Concurrent Payments on one Invoice | Derived SUM needs no inter-Payment lock. Do not persist status |
| Invoice amount edit vs Payment write | Read-time derived state stays consistent. Alert dedup uses existing unique `deduplicationKey` |

Do not introduce a perpetual `Invoice.currency = Contract.currency`
CHECK.

---

## 10. Security / isolation

- Every use case: `WorkspaceContext` + membership
- Every persist call includes `workspaceId`
- Resource id is not a tenant grant
- Foreign workspace / other-contract Invoice → not found
- VOID does not bypass isolation
- Alert / Notification remain `workspaceId` + `userId`
- OBD-009 unchanged

---

## 11. API / UI boundary

No new workspace-level routes (E02-D05).

| Surface | E03 intent |
| --- | --- |
| Contract Invoice list | Real `paidAmount`; PARTIAL / PAID / MISMATCH; PARTIAL+Overdue |
| Invoice detail ACTIVE | Payment list + create / edit / delete |
| Invoice detail VOID | Historical Payment list; no write controls |
| Invoice edit / VOID | Unchanged E02; derived status recalculates |
| Dashboard / reports / E01 | No |
| Existing alert inbox | New types only, same isolation |

Application services + Server Actions. No new REST surface required
by this plan. Exact action names are not decided here.

---

## 12. Test strategy

| Layer | Focus |
| --- | --- |
| Unit domain | Existing predicates + SUM; PARTIAL+OVERDUE; MISMATCH; null dueDate; VOID math vs active exclusion |
| Unit application | create/update/delete on ACTIVE; all three writes rejected on VOID; currency mismatch; isolation |
| Integration | FK Restrict; workspace scope; no paidAmount column; delete removes event on ACTIVE only |
| Concurrency | Payment vs VOID; N inserts on one Invoice; Invoice amount vs Payment |
| Alert | Three types; VOID excluded / resolved; PARTIAL+OVERDUE; no % / risk |
| E2E | Multi-event status; edit/delete recalculates; overpay = Mismatch; VOID has no payment form; E01 reports/dashboard unchanged |

---

## 13. Performance

- Natural lookup: `(workspaceId, invoiceId)`
- Invoice list: one aggregated SUM, not N+1
- Do not materialize paidAmount
- No FX join

---

## 14. Migration implications

- Payment table is required in a later authorized phase
- Possible `AlertType` extension in the alert phase
- Invoice / TimeEntry / Accrued schema unchanged
- No backfill: E02 has no events
- Prisma names are not chosen in P-E03-00
- `docs/storage.md` does not design Payment

This close creates no migration.

---

## 15. Open decisions

### DECISION REQUIRED NOW

None. `E03-D-VOID-PAYMENTS` is CLOSED.

### CAN BE DEFERRED — remain OPEN

Do not close these in P-E03-00. Do not assume defaults in
implementation.

| ID | Question | Blocks | Owner |
| --- | --- | --- | --- |
| E03-D-ALERT-TRIGGER | On-write vs other trigger. Scheduler is not documented; do not invent one. On-write leaves a calendar-only overdue gap until the next eval | Alert phase | Architect |
| E03-D-ALERT-SHAPE | `AlertType` + `deduplicationKey` vs an `invoiceId` column | Alert phase | Architect |
| E03-D-PAYMENT-AMOUNT | `amount > 0` vs `>= 0`. Negative is not supported (would be a reversal) | Persistence | Architect |
| Payment currency representation | Persist a currency column vs inherit Invoice currency at read | Persistence | Architect |
| Prisma / repository names | Field and method identifiers | Persistence | Architect |
| paymentDate future | Invoice future dates are allowed. No Payment restriction is documented; do not invent one | Persistence / UI | Architect |

### ALREADY DECIDED

| ID | Decision |
| --- | --- |
| D5 / R2-OD-009 | SUM + four amount statuses + independent overdue |
| D6 | Three deterministic payment alerts; no risk / % / AI |
| R2-OD-008 | Null terms → no dueDate, no overdue |
| R2-OD-010 | ACTIVE events editable / deletable; no ledger |
| R2-OD-011 / D7 / E02-D01 / E02-D07 | No FX; Invoice snapshot; Payment matches Invoice |
| E02-D02 | VOID one-way; payments may remain; exclude active aggregates |
| E03-D-VOID-PAYMENTS | Option A — freeze writes on VOID |
| E02-D03 | ACTIVE Invoice amount/date edit recalculates derived status |
| E02-D05 | Contract-scoped surfaces only |
| E02-D06 | No Accrued / Expected rewrite |
| E02-D11 | dueDate snapshot |
| R2-OD-014 / 015 | No period-close; no audit ledger |

---

## 16. Phase breakdown

Methodology: one phase, one objective, one commit. No implementation
commit is created by this close.

### P-E03-00 — Planning / VOID policy closure

| | |
| --- | --- |
| Objective | Freeze E03 semantics and close `E03-D-VOID-PAYMENTS` |
| Dependencies | E02 COMPLETE WITH NON-BLOCKING FINDING; PO Option A |
| Changes | This document and companion planning pointers |
| Non-scope | `src/`, Prisma, migrations, tests, P-E03-01 |
| Acceptance | Option A documented as definitive; decision no longer OPEN; P-E03-01 still NOT STARTED / NOT AUTHORIZED |
| Tests | None |
| Migration | No |
| Commit boundary | Documentation only |
| Status | **COMPLETE** with this commit |

### P-E03-01 — Persistence / domain foundation

| | |
| --- | --- |
| Objective | Persist the Payment event and domain types |
| Dependencies | P-E03-00 |
| Status | **NOT STARTED / NOT AUTHORIZED** |
| Risks | Starting before authorization; inventing Prisma names / FX / persisted status |

Later phases (P-E03-02…07) remain NOT STARTED / NOT AUTHORIZED.
Intents: application service + Invoice SUM wiring; alerts; Contract-scoped
UI; Engineering Review; QA; documentation closure.

---

## 17. Dependencies / critical path

```text
E02 COMPLETE
    → E03-D-VOID-PAYMENTS CLOSED (Option A)
        → P-E03-00 COMPLETE
            → P-E03-01 NOT STARTED / NOT AUTHORIZED
```

E04 remains parallel (depends on E01, not E03). E05 reads payment
facts only after they exist. R2 is not production-ready.

---

## 18. Release impact

- Blocker for this close: no
- E03 implementation: not opened
- P-E03-01: NOT STARTED / NOT AUTHORIZED
- Open PO decisions for E03: none
- Deferred technical decisions: remain open
- R2 production-ready: no
