# FreelanceOS — Domain Model + Business Rules

**Status:** Draft domain baseline  
**Scope:** MVP

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

Core attributes: client, valid-from, valid-to, billing model, rate, monthly contracted hours and payment terms.

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
- **Money** — amount plus currency, with explicit precision/rounding policy to be finalized.
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

Exact conversion and rounding rules are an open decision.

### 7.2 Daily contracts

Daily-rate contracts are supported by the domain, but partial-day and multiple-entry rules require explicit definition before implementation.

### 7.3 Monthly contracted hours

A contract may define a monthly contracted-hours threshold.

Consumption is evaluated within the relevant calendar month unless a different contractual period is explicitly modeled later.

### 7.4 Contract changes

A new contract should normally represent a new validity interval rather than mutating historical commercial conditions.

## 8. TimeEntry Rules

- A TimeEntry belongs to one workspace.
- A TimeEntry has one work date.
- Duration is stored as minutes.
- A TimeEntry has a billable/non-billable state.
- A TimeEntry must reference a client.
- The applicable contract must be determinable for its work date where billing requires a contract.
- Editing/deleting historical entries may require audit or period-closing rules in a later release.

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

- **OBD-001** — Exact daily-rate billing semantics, including partial days.
- **OBD-002** — Monetary rounding and currency precision.
- **OBD-003** — Whether TimeEntry may cross midnight.
- **OBD-004** — Holiday calendar model.
- **OBD-005** — Vacation/absence model.
- **OBD-006** — Exact capacity warning threshold.
- **OBD-007** — Rules for editing/deleting entries after billing-period closure.
- **OBD-008** — Audit requirements.
- **OBD-009** — Workspace roles and permissions.
- **OBD-010** — Payment-term catalog and semantics.
- **OBD-011** — Multi-currency behavior.
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
