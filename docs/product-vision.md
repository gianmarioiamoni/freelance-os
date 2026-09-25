# FreelanceOS — Product Vision + Functional Specification

**Status:** Draft baseline for Product Discovery  
**Scope:** MVP (historical). R2 product decisions live in `docs/release/r2-decision-pack.md`. This MVP specification is not rewritten. R2 is in planning and is not production-ready.

## 1. Product Vision

### 1.1 Working name

**FreelanceOS** — provisional name.

### 1.2 Product statement

FreelanceOS is a web application for freelancers and independent professionals to manage clients, contracts and economic conditions, working hours, billable activities, accrued revenue, contract utilization, reports and operational alerts.

The objective is to replace a fragmented workflow based on spreadsheets, notes, calendars and separate invoicing tools with a single operational system.

## 2. Problem Statement

A freelancer working for multiple clients must continuously reconcile clients, contracts, hours, billable work, accrued amounts, invoices and payments. These data are often distributed across different systems, creating fragmented information, manual calculations, poor visibility and reactive control of contractual limits.

## 3. Product Goal

The product should change the user's experience from:

> "I have to reconstruct what I did this month."

to:

> "The system tells me where I stand at any time."

## 4. Target User

### 4.1 Primary user

- Freelancers / independent professionals working for multiple clients.
- Professionals billing by hour or day.
- Professionals with contracts containing monthly hour allocations.
- Professionals working predominantly remotely and needing simple operational control.

### 4.2 Secondary target

Later phases may support consultants, small professional firms, freelancers with collaborators and micro-agencies.

Complex enterprise team management is outside MVP scope.

## 5. Product Principles

1. **Simple daily operation** — recording work should take very little time.
2. **Data first** — operational data must be structured and queryable.
3. **Deterministic calculations** — hours, amounts, thresholds and statistics are calculated by the application, not by an LLM.
4. **Proactive control** — the system should identify operational problems before they become surprises.
5. **Historical correctness** — changing a contract must not retroactively corrupt historical work data.
6. **Multi-user by design** — the data model should support multiple users/workspaces.
7. **AI optional** — the MVP must be fully usable without AI.

## 6. MVP Scope

The MVP contains seven primary capabilities:

- Authentication
- Workspace
- Client Management
- Contract Management
- Time Tracking
- Dashboard
- Reporting & Alerts

Billing calculation is included as an operational capability, but electronic invoicing is not part of the MVP.

## 7. Functional Specification

### 7.1 Authentication

#### F-001 — User registration
Registration via email/password and Google.

#### F-002 — Login
Authenticated login.

#### F-003 — Logout
Terminate the authenticated session.

#### F-004 — Password recovery
Recover a forgotten password.

#### F-005 — Session persistence
Maintain authenticated sessions according to the security architecture.

### 7.2 Workspace

#### F-010 — Workspace creation
Create a workspace as part of the initial user setup.

#### F-011 — Workspace isolation
Users must not access data belonging to another workspace.

#### F-012 — Multi-user foundation
The model must support multiple users per workspace, even if MVP roles are limited.

### 7.3 Client Management

#### F-020 — Create client
Create a client with company name, VAT number, tax code, address, contact name, email, phone and notes; some fields may be optional.

#### F-021 — Client list
List clients with company name, status, active contract and current-period hours.

#### F-022 — Client detail
View general information, active contract, contract history, hours and billing summary.

#### F-023 — Edit client
Modify client master data.

#### F-024 — Archive client
Prefer ACTIVE / ARCHIVED status over destructive deletion to preserve history.

### 7.4 Contract Management

#### F-030 — Create contract
A contract contains client, validity dates, billing model, rate, monthly contracted hours and payment terms.

#### F-031 — Billing models
MVP supports HOURLY and DAILY. MONTHLY_FIXED may be reserved in the model for a later release.

#### F-032 — Contract history
A client can have multiple contracts over time.

#### F-033 — Contract activation
The system must identify the contract valid on the date of a TimeEntry so historical entries use the appropriate commercial conditions.

### 7.5 Time Tracking

#### F-040 — Create time entry
Record date, client, duration, description and billable/non-billable status.

#### F-041 — Duration
Represent duration internally in minutes; the UI may display hours/minutes.

#### F-042 — Edit time entry
Modify a recorded entry.

#### F-043 — Delete time entry
Delete an entry according to future audit rules.

#### F-044 — Daily view
View all activities for a day and daily totals.

#### F-045 — Weekly timesheet
Provide a weekly client-by-day timesheet with totals.

#### F-046 — Calendar view
Navigate the calendar and see daily workload.

#### F-047 — Copy previous entry
Optional MVP convenience feature for duplicating previous work.

### 7.6 Dashboard

#### F-050 — Current-period dashboard
Show current-month total hours, billable hours, non-billable hours and estimated revenue.

#### F-051 — Client allocation
Show distribution of time by client.

#### F-052 — Contract utilization
Show contracted hours, consumed hours and utilization for relevant clients.

#### F-053 — Current alerts
Highlight current operational anomalies and threshold warnings.

### 7.7 Billing Calculation

#### F-060 — Billable amount
For hourly contracts, calculate billable amount from billable duration and hourly rate.

#### F-061 — Daily rate
Support daily-rate contracts, with detailed rules for partial days and multiple entries to be defined during Domain Design. R2-OD-001 later approved one accrued billable day per Contract per calendar date with at least one TimeEntry; multiples count once.

#### F-062 — Estimated revenue
Show estimated revenue and amount to invoice; full invoice lifecycle is deferred.

R2 (2026-09-22) replaces “invoice lifecycle” with Invoice Tracking and defines Accrued / Expected / Forecast Revenue plus optional Contract Time Allocation. See `docs/release/r2-decision-pack.md`. These MVP lines remain historical R1 scope and were not delivered in R1 (PD-105-001).

### 7.8 Reporting

#### F-070 — Period selection
Today, this week, last week, this month, last month, this year and custom range.

#### F-071 — Hours report
Total, billable, non-billable and hours by client.

#### F-072 — Revenue report
Estimated revenue and revenue by client/period.

#### F-073 — Contract report
Contracted, consumed, remaining, utilization percentage and overrun.

#### F-074 — Annual overview
Annual overview of hours, revenue and client distribution.

### 7.9 Alerts

#### F-080 — Contract utilization warning
Default warning threshold of 80% of monthly contracted hours.

#### F-081 — Contract exceeded
Create an alert when consumed hours exceed contracted hours.

#### F-082 — Monthly capacity warning
Compare recorded work with configured working capacity.

#### F-083 — Capacity exceeded
Show a warning when recorded work exceeds configured capacity.

### 7.10 Notification Center

- Provide a notification center for operational alerts.
- Allow notifications to be marked as read.
- Allow a notification to lead to the related client, contract or other resource.

## 8. Forecast

Forecasting is explicitly deferred from the first MVP.

R2 Forecast is a simple deterministic linear projection of Accrued Revenue using elapsed time in the current reporting period. No ML, AI, or historical-behaviour engine. Exact arithmetic is CLOSED by P-E04-00 (`docs/release/r2-e04-forecasting-allocation.md` E04-D-FORECAST-ARITHMETIC): Forecast = Accrued / elapsedFraction on the certified current period.

## 9. AI Scope

The MVP does not require LLM functionality. The system must be fully functional without AI.

Future AI capabilities may include:

- Natural Language Reporting
- Timesheet Assistant
- Business Assistant

The intended architecture is:

`natural language → intent/structured request → controlled application/domain services → data → natural-language response`

The LLM must not become the source of truth for calculations.

## 10. MVP Non-Goals

- Electronic invoicing / SDI
- Payment management (R1 non-goal; R2 adds operational Payment Tracking only — D5)
- Accounting (PIVA Balance domain; never FreelanceOS — D3)
- Expense management
- Tax management
- Profitability / cost accounting (PIVA Balance — D3)
- Advanced team management
- Native mobile application
- Calendar/Slack/Teams integrations
- AI assistant
- Advanced forecasting
- Advanced expense management

## 11. MVP End-to-End Acceptance Workflow

1. Register
2. Login
3. Create client
4. Create contract
5. Register work
6. View weekly timesheet
7. View monthly dashboard
8. See contract utilization
9. Receive threshold warning
10. View monthly revenue
11. Generate report

The MVP is considered functionally complete when this end-to-end workflow works reliably.

## 12. Success Criteria

- A normal workday can be recorded in less than one minute.
- The user can determine monthly worked hours within seconds.
- The user can determine accrued / to-be-invoiced revenue within seconds.
- The system signals contractual threshold breaches before or when they occur.
- Historical contract conditions remain consistent with historical work.
- A first-time user can understand the core workflow without technical documentation.

## 13. Open Decisions

| ID | Decision |
|---|---|
| OD-001 | Detailed billing rules for daily-rate contracts — R2-OD-001 APPROVED |
| OD-002 | Amount rounding rules — R2-OD-002 APPROVED |
| OD-003 | Time entries crossing midnight |
| OD-004 | Holiday handling |
| OD-005 | Vacation handling |
| OD-006 | Working calendar model |
| OD-007 | Editing entries in already billed/closed periods — OUT OF R2 (R2-OD-014) |
| OD-008 | Audit log requirements — OUT OF R2 (R2-OD-015) |
| OD-009 | Workspace roles |
| OD-010 | Email notification policy |
| OD-011 | CSV/PDF export — PDF out of core R2; simple CSV CLOSED in R2-E05 (R2-OD-012 / E05-D-EXPORT-FORMATS B). Excel is not a decision. |
| OD-012 | Multi-currency — closed by R2 D7 + R2-OD-011 + E02-D01 Invoice currency snapshot. |

## 14. Release Structure

- **Release 0 — Foundation:** architecture and technical infrastructure.
- **Release 1 — MVP:** authentication, workspace, clients, contracts, time tracking, dashboard, reporting and alerts.
- **Release 2 — Revenue Operations:** revenue visibility (Accrued / Expected / Forecast), Invoice Tracking (not Invoice Lifecycle), operational payment tracking, deterministic linear Forecast, optional Contract Time Allocation, advanced reporting and simple export if decided. Official decisions: `docs/release/r2-decision-pack.md`. Planning baseline: `docs/release/r2-epic-map.md`. R2-E01: COMPLETE / RELEASE-READY (`docs/release/r2-e01-revenue-visibility.md`). R2-E02: COMPLETE WITH NON-BLOCKING FINDING (`docs/release/r2-e02-invoice-tracking.md`). Historical label “Billing & Intelligence” is superseded. Profitability is out of FreelanceOS (PIVA Balance). R2 is not production-ready. R2-E03 CERTIFIED. R2-E04 CERTIFIED. E05 CERTIFIED (`docs/release/r2-e05-advanced-reporting-export.md`; P-E05-00…P-E05-06).
- **Release 3 — Integrations:** electronic invoicing, calendar and accounting integrations.
- **Release 4 — AI:** natural-language analytics, timesheet assistant and business assistant.

## 15. Next Engineering Phase

The next phase is **Domain Model + Business Rules**. It defines entities, value objects, relationships, invariants, lifecycle rules, historical correctness and domain terminology.

Only after that baseline should the system architecture and data architecture be finalized.

This document intentionally does not prescribe implementation details. It is the product baseline that feeds Domain Design and Architecture.
