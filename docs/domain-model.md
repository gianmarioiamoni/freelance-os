# FreelanceOS — Domain Model + Business Rules

**Status:** Draft domain baseline  
**Scope:** MVP (R1 baseline). R2 domain additions: `docs/release/r2-decision-pack.md`, `docs/release/r2-architecture-delta.md`. R2 planning baseline: `docs/release/r2-epic-map.md`. R2 is in planning and is not production-ready.

## 1. Domain Objective

The domain model describes the professional workflow from client relationship to contractual conditions, recorded work, billable amount, operational monitoring and reporting.

The model must preserve historical correctness and provide deterministic results.

## 2. Domain Language

- **Workspace** — isolated professional environment containing users and business data.
- **User** — authenticated person using the system.
- **Client** — business/customer for whom work is performed.
- **Contract** — time-bounded commercial agreement defining billing conditions.
- **TimeEntry** — recorded work performed on a specific date for a client under a contract context.
- **Billable** — work eligible for billing under the applicable contract/rules.
- **Contracted Hours** — monthly number of hours agreed for a contract.
- **Contract Utilization** — consumed contracted hours divided by contracted hours.
- **Capacity** — user's available working time for a period.
- **Alert** — system-generated operational condition requiring user awareness.
- **Billing Period** — reporting period used to determine billable activity and accrued amount.
- **Accrued Revenue** *(R2)* — consuntivo economic value of billable TimeEntries using the commercial value applicable when the work occurred. Independent of invoice and payment.
- **Expected Revenue** *(R2)* — HOURLY contractual-capacity value for the reporting period, using existing pro-rata semantics. Null if capacity is unavailable. DAILY has no Expected Revenue in R2. Independent of TimeEntry, Invoice, and Payment.
- **Forecast Revenue** *(R2)* — deterministic linear projection of Accrued Revenue: Accrued / elapsedFraction on the certified current period only. Elapsed includes today. elapsed=0 or Accrued=0 ⇒ 0. Historical/custom ⇒ null. Derived, not persisted. Not ML/AI.
- **Invoice Tracking** *(R2)* — operational record of an invoiced amount and date for a Contract. Not a fiscal invoice. One Contract has many Invoices; one Invoice has exactly one Contract.
- **Payment** *(R2)* — operational payment event against an Invoice Tracking record. Status is derived (UNPAID / PARTIAL / PAID / MISMATCH). PAYMENT_OVERDUE is independent.
- **allocatedMinutes** *(R2)* — optional Contract-level total time budget in minutes. Distinct from `monthlyContractedMinutes`. Null = no allocation / no status / no alert. 0 = valid zero allocation / no status / no alert (8-C). Positive: `<80%` NORMAL, `80–100%` WARNING, `>100%` EXCEEDED.
- **PIVA Balance** *(external)* — system that owns costs, profitability, and fiscality / accounting. Not part of the FreelanceOS domain.

## 3. Core Entities

### 3.1 User

Represents an authenticated person. A user may belong to one or more workspaces in the future. Authentication identity and business profile are conceptually separate.

### 3.2 Workspace

The security and data-isolation boundary. All business entities are owned by or scoped to a workspace.

### 3.3 Client

Represents the customer/business relationship. Client identity is independent from contractual conditions.

Core attributes: identity, VAT/tax identifiers, address/contact information, status and notes.

### 3.4 Contract

Represents a commercial agreement for a client during a validity interval.

Core attributes: client, valid-from, valid-to, billing model, rate, monthly contracted hours, payment terms, and (R2) optional allocated minutes.

### 3.5 TimeEntry

Represents work recorded by a user for a client on a date.

Core attributes: date, client/contract context, duration in minutes, description and billable status.

### 3.6 Alert

Represents a deterministic operational condition generated from domain data, such as contractual utilization reaching a threshold.

### 3.7 Notification

Represents the user-facing delivery/read state of an alert or operational message. Alert generation and notification presentation should remain conceptually separate.

## 4. Relationships

Conceptual relationship:

`User → WorkspaceMembership → Workspace → Client → Contract → TimeEntry`

Workspace also owns Alerts/Notifications, while reporting is derived from operational entities.

### 4.1 Client vs Contract

Client identifies **WHO** the customer is.

Contract identifies **HOW** the relationship is commercially governed during a specific period.

### 4.2 Contract vs TimeEntry

A TimeEntry must be attributable to the contract conditions applicable on its work date.

Historical entries must not silently change commercial meaning when a later contract is created.

## 5. Value Objects / Enumerations

- **Duration** — integer number of minutes; no floating-point hours in persistence.
- **Money** — amount plus currency. R2 published / displayed amounts round to the nearest integer; intermediate calculations are not prematurely rounded (R2-OD-002). No accounting-grade precision.
- **BillingModel** — HOURLY, DAILY for MVP.
- **ClientStatus** — ACTIVE, ARCHIVED.
- **PaymentTerms** — controlled domain value or extensible representation; exact catalog to be finalized.
- **AlertSeverity** — informational / warning / critical, subject to final UX terminology.
- **BillableStatus** — BILLABLE / NON_BILLABLE.

## 6. Business Invariants

| ID | Rule | Definition |
|---|---|---|
| BR-001 | Workspace isolation | A user may access only data belonging to an authorized workspace. |
| BR-002 | Contract validity | A TimeEntry must resolve to the commercial conditions applicable to its work date. |
| BR-003 | Historical integrity | Changing a current/future contract must not alter historical TimeEntry meaning. |
| BR-004 | Duration integrity | Duration must be a positive integer number of minutes. |
| BR-005 | Client lifecycle | Archiving a client must preserve historical entries, contracts and reporting. |
| BR-006 | Contract overlap | Two active contracts for the same client must not create ambiguous commercial applicability for the same date. |
| BR-007 | Billable eligibility | Only entries marked billable and governed by a billable contract/rule contribute to billable revenue. |
| BR-008 | Contract utilization | Utilization is consumed contracted hours divided by contracted monthly hours; exact handling of zero/no-limit contracts is defined separately. |
| BR-009 | Alert determinism | Alerts are generated from deterministic domain rules and current domain state. |
| BR-010 | Reporting consistency | Dashboard and reports must use the same underlying domain calculation rules. |
| BR-011 | No destructive history | Business records required for historical reporting should not be physically deleted when doing so would corrupt history. |
| BR-012 | Workspace ownership | Business entities cannot be reassigned across workspaces through ordinary client-controlled input. |

## 7. Contract Rules

### 7.1 Hourly contracts

For an hourly contract, billable amount is derived from billable duration and the applicable hourly rate.

Conceptually:

`billable minutes → billable hours → rate application → monetary amount`

Hourly conversion remains `billable minutes / 60 × hourly rate` (D4). R2 published amounts round to the nearest integer (R2-OD-002).

### 7.2 Daily contracts

Daily-rate contracts are supported by the domain.

R2 Accrued Daily (R2-OD-001): a DAILY Contract contributes one accrued billable day if at least one TimeEntry exists for that Contract on that calendar date. Multiple entries on the same day count once. No work-calendar model. Accrued remains `billable days × daily rate`. BR-007 still applies.

### 7.3 Monthly contracted hours

A contract may define a monthly contracted-hours threshold.

Consumption is evaluated within the relevant calendar month unless a different contractual period is explicitly modeled later.

R2 optional `allocatedMinutes` is a total project / Contract time budget. It is not monthly contracted capacity and must not be conflated with `monthlyContractedMinutes` (R2-OD-013).

### 7.4 Contract changes

A new contract should normally represent a new validity interval rather than mutating historical commercial conditions.

EPIC-102 implementation defaults, temporary until the Product Owner decides:

- creating a contract for an archived client is rejected; existing contracts remain readable and editable (proposed OBD-015)
- commercial-field edits after TimeEntries exist are allowed; TimeEntry stores `contractId` and no rate snapshot (P102-F-001 / proposed OBD-016)

These defaults do not close OBD-015 or OBD-016 and are not accepted product policy.

EPIC-103 did not change them. Immutable `TimeEntry.contractId` protects the association, not the commercial terms it points at, so P102-F-001 remains open.

## 8. TimeEntry Rules

- A TimeEntry belongs to one workspace.
- A TimeEntry has one work date.
- Duration is stored as minutes.
- A TimeEntry has a billable/non-billable state.
- A TimeEntry must reference a client.
- The applicable contract must be determinable for its work date where billing requires a contract.
- Editing/deleting historical entries may require audit or period-closing rules in a later release.

EPIC-103 implementation, finalized by Product Owner decisions:

- `workDate`, `clientId`, and `contractId` are immutable after creation. Correcting them requires delete and recreate (PD-103-002, PD-103-003).
- Update permits `durationMinutes`, `description`, and `billable` only.
- Deletion is a hard delete. There is no TimeEntry archive state, `archivedAt`, or status field (PD-103-001).
- `contractId` remains required for every entry, including `billable = false` (F-P2-004).
- Contract eligibility for a work date is `[validFrom, validTo)`; `validTo = null` is open-ended. Validated at create only, because the fields it depends on cannot change.
- Duration is an integer between 1 and 1440 minutes.
- Future work dates are permitted (PD-103-004).
- Duplicate entries for the same contract and date are permitted (PD-103-005). Overlapping entries are not validated.
- `workDate` is a calendar date. Midnight-crossing work is not representable (OBD-003 open).
- Creating an entry for an archived client is rejected; existing entries for an archived client remain readable, editable, and listed in time-tracking views (F-103-002 CLOSED, EPIC-110 / P110-02). Archived clients are not selectable for new entries. Analytics includes them, per PD-104-001 (see §9).
- No rate, billing, utilization, or forecasting calculation is derived from a TimeEntry in R1. Editing Contract commercial fields can still change historical interpretation until R2 commercial snapshot persistence exists (P102-F-001; R2-OD-003 semantics approved).
- No audit trail exists for TimeEntry edits or deletions (OBD-008 historically open; out of R2).

Review: `docs/epics/EPIC-103/engineering-review.md`.

## 9. Monthly Aggregation Rules

For a calendar month and client, the system can derive:

- Total worked minutes
- Billable minutes
- Non-billable minutes
- Contracted hours
- Consumed hours
- Remaining hours
- Utilization percentage
- Billable/estimated amount

The aggregation layer must be the common source for dashboard, reports, alerts and future AI queries.

### Implemented by EPIC-104

EPIC-104 implemented the aggregation layer for worked, billable, and non-billable minutes, client allocation, and contract utilization. Billable/estimated amounts were an explicit non-goal and are not computed. Review: `docs/epics/EPIC-104/engineering-review.md`.

Rules established and proven:

- **Stored associations are authoritative.** Analytics reads the `clientId` and `contractId` stored on each TimeEntry and never re-resolves them against current state. Changing a client's status does not alter historical totals.
- **Archived clients are included (PD-104-001).** Analytics selects client rows by identifier with no `status` filter, so time recorded for a client that was later archived remains counted. Time-tracking lists also show historical entries for archived clients (F-103-002 CLOSED). Create selection remains ACTIVE-only.
- **Archived is exposed, not hidden.** Each client allocation carries `isArchived`, which the dashboard renders as an explicit `Archived` label. Archived time is never silently omitted and never silently indistinguishable.
- **Utilization uses all tracked time (PD-104-002).** The consumption numerator applies no `billable` filter, so billable and non-billable minutes both consume contracted capacity. Billable percentage and utilization percentage are therefore independent figures.
- **Contracted capacity is the denominator.** Utilization compares consumption against `Contract.monthlyContractedMinutes`. When that value is absent, `utilizationPercentage` is `null`: no denominator is invented.
- **Integer minutes only.** All aggregation is integer arithmetic; a zero denominator yields `null` rather than zero or a fabricated percentage.
- **Default period ends "through today" (PD-104-003 / PD-105-002).** The canonical reading is "through today" in the workspace timezone. `getCurrentMonthPeriod()` returns the first of the month through the workspace-local today (not the last day of the month). F-104-017 is resolved: the "through today" reading is canonical. Implemented by EPIC-105 P105-03.
- **`Workspace.timezone` is the sole period-boundary authority (PD-105-003).** Every period constructor accepts the workspace timezone as an explicit argument; no period boundary is derived from the process clock timezone or from a browser-supplied parameter. Implemented by EPIC-105 P105-03.
- **Ongoing and unlimited are independent contract properties (PD-105-004 / PD-104-004).** `isOngoing` ≡ `validTo === null` (contract has no scheduled end). Unlimited capacity ≡ `monthlyContractedMinutes === null` (no contracted hours ceiling). A contract may be ongoing with finite capacity, or finite-term with unlimited capacity; the two properties are orthogonal. F-104-003 is resolved: `isOngoing` is derived exclusively from `validTo`. Implemented by EPIC-105 P105-04.
- **Contract capacity is pro-rated to the reporting period (PD-105-005).** `contractedMinutes` for a reporting period is `monthlyContractedMinutes × (overlapDays / periodDays)`, where `overlapDays` is the count of days in `[validFrom, validTo) ∩ period`. When `monthlyContractedMinutes` is null the capacity is null (no denominator is invented). No rollover, carry-over, or expiry applies; OBD-012 gates any future rollover decision.
- **Relevance-driven contract list; out-of-validity time retained and flagged (PD-105-006).** A contract is included in a report if its validity interval overlaps the period **or** it has in-period consumption. Time entries recorded outside `[validFrom, validTo)` are retained (not dropped) and the contract row is flagged `isOutOfValidity = true`. A zero-capacity contract (out of validity, no overlap) shows consumed hours with a null utilization percentage (zero denominator per BR-104-011). Implemented by EPIC-105 P105-04.
- **Contract validity is applied in the reporting layer.** F-104-004 is resolved for the reporting surface: contracts with validity overlap appear even with zero consumption; contracts with consumption but no validity overlap appear with the `isOutOfValidity` flag. The application layer still prevents recording a new entry against an out-of-validity contract.
- **Denominator stability is limited by P102-F-001.** Utilization reads the contract's current contracted capacity, so editing that capacity retroactively changes historical utilization. Documented, not resolved.
- **Workspace isolation.** Every aggregation query is scoped by `workspaceId`; no route parameter or form field can influence analytics scope.

Not implemented: weekly aggregation (F-104-013) and workspace-timezone period boundaries (F-104-005).

## 10. Alert Rules

| ID | Condition | Rule |
|---|---|---|
| AR-001 | Contract warning | Default threshold: 80% of monthly contracted hours. |
| AR-002 | Contract reached/exceeded | Consumed hours reach or exceed the contracted amount. |
| AR-003 | Capacity warning | Recorded work approaches configured monthly capacity; exact threshold is to be defined. |
| AR-004 | Capacity exceeded | Recorded work exceeds configured capacity. |

## 11. Historical Correctness

Historical correctness is a first-class domain requirement.

A TimeEntry recorded under Contract A must continue to report under the commercial conditions applicable to that work period even if Contract B later becomes active.

The final persistence design must make contract applicability unambiguous. The exact mechanism—explicit contract reference, validity resolution, or a combination—belongs to the storage/architecture phase.

## 12. Billing Boundary

MVP calculates accrued/to-be-invoiced amounts but does not implement electronic invoicing or a complete invoice lifecycle.

A later Invoice aggregate may snapshot the commercial lines used for an invoice so that subsequent contract changes cannot modify an already issued billing document.

**R2 supersession (2026-09-22):** FreelanceOS does not generate fiscal invoices.
R2 adds **Invoice Tracking** only (date, amount, currency tied to Contract,
optional reference, VOID / soft-delete) to support payment tracking.
Accrued / Expected / Forecast Revenue are separate from Invoice Tracking
and Payment. Profitability is out of this domain (PIVA Balance).
Accrued uses Commercial Snapshot semantics (R2-OD-003). P-E01-01 persists
`snapshotBillingModel`, `snapshotRate`, and `snapshotCurrency` on TimeEntry.
R2-OD-016 / R2-OD-017 are implemented. Accrued and Expected are published
by AnalyticsService (P-E01-02 / P-E01-03). E01 is COMPLETE / RELEASE-READY.
Canonical text: `docs/release/r2-e01-revenue-visibility.md`.
R2-E02 Invoice Tracking record exists (`Invoice` table). Operational
fields only: date, amount, currency snapshot, optional reference,
snapshotted `paymentTermsDays` / `dueDate`, VOID via `voidedAt`.
Not a fiscal invoice. Invoice does not modify Accrued / Expected.
Payment is implemented as an Invoice-owned operational event
(`Payment` table). `paidAmount` is `SUM(Payment.amount)`. `amountStatus`
and overdue are derived, not persisted. Outstanding is presentation-only.
VOID freezes Payment writes; existing rows remain readable. E02 is
COMPLETE WITH NON-BLOCKING FINDING
(`docs/release/r2-e02-invoice-tracking.md`). E03 is CERTIFIED
(`docs/release/r2-e03-payment-tracking.md`). E04 is CERTIFIED
(`docs/release/r2-e04-forecasting-allocation.md`).

## 13. Capacity Model

The MVP may derive capacity from user-configured working hours/day and working days/week.

Detailed holiday, vacation and calendar rules remain open decisions and must not be implicitly invented in implementation.

## 14. Reporting Boundary

Reports are read models derived from domain/application services. They do not become separate sources of truth.

The same calculation services should support dashboard widgets, reports, alerts and future natural-language analytics.

## 15. AI Boundary

The LLM, when introduced, is not a domain authority.

It may interpret user intent and formulate responses, but it must invoke controlled application services for numerical facts.

Example:

`"How much did I bill ACME in Q2?" → structured intent → reporting/application service → deterministic result → natural-language response`

## 16. Open Business Decisions

- **OBD-001** — Exact daily-rate billing semantics, including partial days. R2 Accrued Daily closed by R2-OD-001.
- **OBD-002** — Monetary rounding and currency precision. R2 publication rounding closed by R2-OD-002.
- **OBD-003** — Whether TimeEntry may cross midnight.
- **OBD-004** — Holiday calendar model.
- **OBD-005** — Vacation/absence model.
- **OBD-006** — Exact capacity warning threshold.
- **OBD-007** — Rules for editing/deleting entries after billing-period closure. OUT OF R2 (R2-OD-014). Historically open for a later release.
- **OBD-008** — Audit requirements. OUT OF R2 (R2-OD-015). Historically open for a later release.
- **OBD-009** — Workspace roles and permissions.
- **OBD-010** — Payment-term catalog and semantics. Catalog deferred. R2 expected payment date uses `paymentTermsDays` (D5). Null days: no dueDate and no automatic overdue (R2-OD-008).
- **OBD-011** — Multi-currency behavior. CLOSED (D7 + R2-OD-011 + E02-D01): Contract currency, TimeEntry currency-agnostic, no FX, per-currency aggregates, immutable after first monetary record. Invoice persists a currency snapshot that must match Contract at write.
- **OBD-012** — Whether contracted hours roll over or expire monthly.

## 17. Domain Design Acceptance Criteria

- The core business concepts have unambiguous definitions.
- Client and Contract are distinct concepts.
- Historical contract applicability is deterministic.
- Time duration is represented without floating-point ambiguity.
- Billing, reporting and alerts derive from shared domain/application rules.
- Workspace isolation is a domain/security invariant.
- Open business decisions are explicitly tracked rather than silently assumed.
- The model can support future invoices, payments, forecasting and AI without making them dependencies of the MVP.

## 18. Next Phase

The next phase is **System Architecture**.

It will translate these domain concepts into module boundaries, application services, persistence responsibilities, authentication/authorization boundaries, API contracts and deployment architecture.

The Architecture phase must not silently change domain semantics; any necessary change becomes an explicit decision.
