# MVP Integration Epic

**Document:** `docs/epics/MVP-INTEGRATION/epic-plan.md`
**Status:** PLANNING
**Prerequisite:** EPIC-106 COMPLETE — Engineering Review PASS
**Reference:** MASTER_PLAN.md §17

---

## 1. Objective

Validate and, where necessary, complete the integration loop of the entire
MVP operational chain:

```text
Authentication
  ↓
Workspace
  ↓
Client
  ↓
Contract
  ↓
TimeEntry
  ↓
Analytics
  ↓
Dashboard
  ↓
Alerts / Notifications
  ↓
Reports
```

This is not a feature Epic. It is the integration certification step
required before release gates. All individual domain Epics (EPIC-101
through EPIC-106) are complete and passed engineering review. This Epic
closes the gaps that are only visible across domain boundaries.

---

## 2. Scope

- Map the integration chain as it exists in the repository (source of truth).
- Identify real, evidence-backed gaps across domain boundaries.
- Resolve those gaps with targeted, minimal changes.
- Deliver at least one cross-domain E2E journey test that traverses
  Authentication → TimeEntry → Analytics → Alerts → Reports in a single run.
- Certify the full loop passes all test gates.
- Update MASTER_PLAN.md and close the Epic.

---

## 3. Non-Goals

- New features (invoice, payment, expense, tax, forecasting).
- Settings page implementation (placeholder remains accepted for MVP).
- UI visual polish.
- Performance optimization beyond existing baselines.
- Any schema migration not required to fix an identified gap.
- Multi-workspace management.
- Release 2+ scope.

---

## 4. Current Integration Map

### 4.1 Authentication

| Aspect | Implementation | Evidence |
|---|---|---|
| Entry point | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` | `src/app/(auth)/**`, `src/app/(public-auth)/**` |
| Application service | `getServerAuthSession` | `src/infrastructure/auth/session.ts` |
| Repository | BetterAuth provider | `src/infrastructure/auth/` |
| Persistence | Prisma (users, sessions) | `src/infrastructure/prisma/client.ts` |
| Authorization | Session → WorkspaceContext resolved per request | `src/infrastructure/workspace/current-workspace.ts` |
| UI | Sign-in/up/reset forms | `src/features/auth/*.tsx` |
| Test coverage | Integration: auth sessions, protected boundary, password recovery, Google OAuth | `tests/integration/auth/` |
| Downstream dependency | WorkspaceContext derivation on every protected route | `getCurrentWorkspaceContext()` |

### 4.2 Workspace

| Aspect | Implementation | Evidence |
|---|---|---|
| Entry point | `/onboarding` (first workspace), `(workspace-gate)` layout group | `src/app/(workspace-gate)/` |
| Application service | `resolveWorkspaceContext`, `getAuthorizedWorkspace`, `createFirstWorkspace` | `src/application/workspace/` |
| Repository | `WorkspaceRepository`, `WorkspaceMemberRepository` | `src/infrastructure/persistence/workspace-repository.ts` |
| Persistence | `Workspace`, `WorkspaceMember` tables via Prisma | Prisma schema |
| Authorization | `requireWorkspaceAccess`, server-trusted `WorkspaceContext` | `src/features/workspace/` |
| UI | `CreateFirstWorkspaceForm`, `AppShell` (name display) | `src/features/workspace/`, `src/components/app-shell/` |
| Test coverage | Integration: authorization isolation, membership resolution, boundary | `tests/integration/workspace/` |
| Downstream dependency | All domain services receive `WorkspaceContext` | `src/application/*` |

### 4.3 Client

| Aspect | Implementation | Evidence |
|---|---|---|
| Entry point | `/clients`, `/clients/new`, `/clients/:id`, `/clients/:id/edit` | `src/app/(app)/clients/**` |
| Application service | `createClient`, `getClient`, `listClients`, `updateClient`, `archiveClient` | `src/application/clients/` |
| Repository | `ClientRepository` | `src/infrastructure/persistence/client-repository.ts` |
| Persistence | `Client` table, `workspaceId` FK | Prisma schema |
| Authorization | `workspaceId` scoped on every query | All client services |
| UI | `ClientList`, `ClientDetail`, `ClientForm`, `ArchiveClientForm` | `src/features/clients/` |
| Test coverage | Integration: client isolation; Unit: client input, services | `tests/integration/application/clients/`, `tests/unit/application/clients/` |
| Downstream dependency | `clientId` in Contract; `clientId` in TimeEntry (validation) | Contract and TimeEntry services |

### 4.4 Contract

| Aspect | Implementation | Evidence |
|---|---|---|
| Entry point | `/contracts`, `/contracts/new`, `/contracts/:id`, `/contracts/:id/edit` | `src/app/(app)/contracts/**` |
| Application service | `createContract`, `getContract`, `listContracts`, `listContractsForClient`, `updateContract`, `getContractCoveringDate` | `src/application/contracts/` |
| Repository | `ContractRepository` | `src/infrastructure/persistence/contract-repository.ts` |
| Persistence | `Contract` table, `clientId` FK, `workspaceId` FK | Prisma schema |
| Authorization | `workspaceId` scoped on every query | All contract services |
| UI | `ContractList`, `ContractDetail`, `ContractForm`, `ClientContractHistory` | `src/features/contracts/` |
| Test coverage | Integration: contract integrity, services; Unit: contract input, services, validity | `tests/integration/application/contracts/`, `tests/unit/application/contracts/` |
| Downstream dependency | `contractId` in TimeEntry; `contractId` in Analytics; `contractId` in Alerts | TimeEntry, Analytics, Alert services |

### 4.5 TimeEntry

| Aspect | Implementation | Evidence |
|---|---|---|
| Entry point | `/time-tracking`, `/time-tracking/new`, `/time-tracking/:id/edit` | `src/app/(app)/time-tracking/**` |
| Application service | `createTimeEntry`, `getTimeEntry`, `listTimeEntries`, `updateTimeEntry`, `deleteTimeEntry` | `src/application/time-entries/` |
| Repository | `TimeEntryRepository` | `src/infrastructure/persistence/time-entry-repository.ts` |
| Persistence | `TimeEntry` table, `contractId`+`clientId` FKs, `durationMinutes` (integer) | Prisma schema |
| Authorization | `workspaceId` scoped; `contract-validation` guards clientId/contractId coherence | `src/application/time-entries/contract-validation.ts` |
| UI | `TimeEntryForm`, `TimeEntryList`, `WeeklyTimesheet`, `ClientContractSelector`, `DurationInput`, `DeleteTimeEntryForm` | `src/features/time-entries/` |
| Test coverage | Integration: time-tracking, time-tracking-security; Unit: services, input, contract-validation | `tests/integration/time-tracking*.test.ts`, `tests/unit/application/time-entries/` |
| Downstream dependency | Triggers `triggerAlertEvaluation` after create/update/delete (best-effort) | `src/features/time-entries/trigger-alert-evaluation.ts` |

### 4.6 Analytics

| Aspect | Implementation | Evidence |
|---|---|---|
| Entry point | Shared capability; consumed by Dashboard, Alerts, Reporting | — |
| Application service | `AnalyticsService` | `src/application/analytics/analytics-service.ts` |
| Repository | `AnalyticsRepository` | `src/infrastructure/persistence/analytics-repository.ts` |
| Persistence | Reads `TimeEntry`, `Contract`, `WorkspaceSettings` | Prisma queries |
| Authorization | Workspace-scoped via `WorkspaceContext`; membership guard in service | `AnalyticsService.validateMembership` |
| UI | Consumed by `Dashboard` component; no direct analytics route | `src/components/dashboard/Dashboard.tsx` |
| Test coverage | Integration: isolation, membership guard, product decisions, timezone propagation, weekly, workspace isolation; Unit: calculations, pro-rata, service | `tests/integration/analytics/`, `tests/unit/application/analytics/` |
| Downstream dependency | Dashboard, AlertService, ReportingService | — |

### 4.7 Dashboard

| Aspect | Implementation | Evidence |
|---|---|---|
| Entry point | `/` (root of app group) | `src/app/(app)/page.tsx` |
| Application service | `AnalyticsService.getCurrentMonthAnalytics` | Direct call in page RSC |
| Repository | Via `AnalyticsService` | — |
| Persistence | Reads `TimeEntry`, `Contract` | Via analytics repository |
| Authorization | `getCurrentWorkspaceContext()` → redirect if unauthenticated/unresolved | `src/app/(app)/page.tsx` |
| UI | `Dashboard` component | `src/components/dashboard/Dashboard.tsx` |
| Test coverage | Integration: dashboard-page; E2E: dashboard, dashboard-accessibility | `tests/integration/dashboard/`, `tests/e2e/dashboard*.spec.ts` |
| Downstream dependency | None (leaf node in read path) | — |

### 4.8 Alerts / Notifications

| Aspect | Implementation | Evidence |
|---|---|---|
| Entry point | `/alerts` (notification center) | `src/app/(app)/alerts/page.tsx` |
| Application service | `AlertService.evaluateContractAlerts`, `createAlertService` | `src/application/alerts/alert-service.ts` |
| Repository | `AlertRepository`, `NotificationRepository` | `src/infrastructure/persistence/alert-repository.ts`, `notification-repository.ts` |
| Persistence | `Alert`, `Notification` tables | Prisma schema |
| Authorization | Membership guard inside `AlertService`; workspace-scoped notification fetch | — |
| UI | `NotificationList`, `NotificationCard`, mark-as-read action | `src/features/notifications/` |
| Test coverage | Integration: alert-service, notification-center, time-entry-alert-trigger; Unit: alert-dedup-key, alert-service; E2E: alerts | All test folders |
| Trigger | `triggerAlertEvaluation` called from create/update/delete TimeEntry actions (best-effort) | `src/features/time-entries/trigger-alert-evaluation.ts` |
| Downstream dependency | None (leaf node) | — |

### 4.9 Reports

| Aspect | Implementation | Evidence |
|---|---|---|
| Entry point | `/reports?period=...` | `src/app/(app)/reports/page.tsx` |
| Application service | `ReportingService` (wraps `AnalyticsService`) | `src/application/reporting/reporting-service.ts` |
| Repository | Via `AnalyticsService` → `AnalyticsRepository` | — |
| Persistence | Reads `TimeEntry`, `Contract` | Via analytics repository |
| Authorization | `getCurrentWorkspaceContext()` called outside try block (P105-05 criterion) | `src/app/(app)/reports/page.tsx:6` |
| UI | `HoursByClientTable`, `ContractReportTable`, `AnnualOverviewTable`, `PeriodSelector` | `src/features/reporting/` |
| Test coverage | Integration: reporting-service, reporting-performance; Unit: reporting-display-logic, reporting-types; E2E: reports | All test folders |
| Downstream dependency | None (leaf node) | — |

---

## 5. Product Decisions

### PD-INT-001 — Settings page scope for MVP

| Field | Value |
|---|---|
| **Status** | DEFERRED / OUT OF SCOPE |
| **Question** | Should the Settings page be implemented before the integration Epic closes? |
| **Current behavior** | `/settings` renders `PlaceholderPage` with "Settings is not implemented yet." |
| **Why it matters** | The `Workspace.timezone` is set at workspace creation and cannot be changed. If a user selects the wrong timezone, there is no recovery path in MVP. |
| **Options** | (A) Keep placeholder — timezone is immutable after onboarding (MVP accepted); (B) Add minimal timezone-edit form in Settings. |
| **Recommended default** | A — Keep placeholder. Timezone is collected at onboarding. Document as known MVP limitation. |
| **Decision required from Product Owner** | Confirm that timezone immutability post-creation is acceptable for MVP release. |

### PD-INT-002 — Notification badge in app shell navigation

| Field | Value |
|---|---|
| **Status** | DECISION REQUIRED |
| **Question** | Should the "Alerts" navigation item display an unread notification badge/count in the sidebar? |
| **Current behavior** | The navigation sidebar shows the "Alerts" label with the Bell icon but no unread count. The unread count is only shown on the `/alerts` page itself. |
| **Why it matters** | Without a badge, users have no visual signal to check the alerts page. This breaks the discovery path of the integration loop: TimeEntry → Alert → User awareness. |
| **Options** | (A) Add unread count badge to "Alerts" nav item (requires loading notification count in layout); (B) Accept current behavior as MVP-sufficient — user must proactively visit `/alerts`. |
| **Recommended default** | A — Add badge. The layout already loads workspace context; a count query is low-cost. Finding F-106-P04-001 (accepted unbounded list) documents that a badge is a natural follow-up. |
| **Decision required from Product Owner** | Confirm whether the nav badge is required before release gate or deferred to Release 2. |

### PD-INT-003 — Dashboard cache invalidation after TimeEntry mutations

| Field | Value |
|---|---|
| **Status** | DECISION REQUIRED |
| **Question** | After a TimeEntry create/update/delete, the Dashboard RSC data is not explicitly invalidated. Does the user experience stale analytics until the next navigation? |
| **Current behavior** | TimeEntry actions redirect to `/time-tracking?date=...`. No `revalidatePath("/")` or `revalidatePath("/reports")` is called. Next.js RSC cache may or may not re-fetch depending on cache strategy. |
| **Why it matters** | If the Dashboard shows stale month totals after adding a time entry, the integration loop appears broken to the user. |
| **Options** | (A) Add `revalidatePath("/")` and `revalidatePath("/reports")` to all TimeEntry mutation actions; (B) Rely on Next.js default cache behavior (no explicit invalidation); (C) Accept eventual consistency at MVP. |
| **Recommended default** | A — Explicit `revalidatePath` calls are cheap, targeted, and correct. Stale dashboard after a mutation is a user-visible integration failure. |
| **Decision required from Product Owner** | Confirm whether immediate dashboard/reports refresh after TimeEntry mutations is required. |

### PD-INT-004 — Cross-domain E2E test scope

| Field | Value |
|---|---|
| **Status** | DECISION REQUIRED |
| **Question** | Should the MVP Integration Epic produce a single, unified E2E test that walks the full chain (Auth → Workspace → Client → Contract → TimeEntry → Dashboard → Alerts → Reports), or is the existing per-domain E2E coverage sufficient? |
| **Current behavior** | Each domain has its own E2E spec. No single test crosses more than 2–3 domain boundaries. The alerts E2E creates a time entry and checks the notification, which is the closest to a cross-domain test. |
| **Why it matters** | Individual domain tests can all pass while the integration chain has a broken link. A unified journey test catches regressions that per-domain tests cannot. |
| **Options** | (A) Write one cross-domain E2E journey test file; (B) Accept per-domain coverage as sufficient; (C) Write a targeted integration test covering the data flow without a full browser session. |
| **Recommended default** | A — One cross-domain E2E journey file is the primary certification artifact for this Epic. |
| **Decision required from Product Owner** | Confirm the cross-domain E2E journey is a hard gate for Epic closure. |

### PD-INT-005 — auth.spec.ts flaky test (F-106-P05-001)

| Field | Value |
|---|---|
| **Status** | DECISION REQUIRED |
| **Question** | The pre-existing `auth.spec.ts` E2E failure ("should register, stay authenticated, and sign out") is classified PRE-EXISTING / FLAKY / ACCEPTED. Should it be resolved or continue as accepted in the integration Epic? |
| **Current behavior** | 1 E2E failure in `auth.spec.ts`. Reproduced at `95eaede` (pre-EPIC-106). Accepted in EPIC-106 closure. |
| **Options** | (A) Investigate and fix the flaky test as part of this Epic's P-INT-01; (B) Continue to accept it as a known flaky test and document in Epic closure. |
| **Recommended default** | A — The integration Epic is the correct place to audit and resolve pre-existing test debt before release gates. |
| **Decision required from Product Owner** | Confirm whether the flaky auth E2E must be resolved before release gate. |

---

### Established Decisions (carried from prior Epics — not re-opened)

| Decision | Source | Status |
|---|---|---|
| TimeEntry uses `durationMinutes` (integer) | EPIC-103 | ESTABLISHED |
| `Workspace.timezone` is the temporal authority for period boundaries | EPIC-105 BR-105-014 | ESTABLISHED |
| Client and Contract are separate entities; `clientId` is a FK in Contract | EPIC-102 | ESTABLISHED |
| TimeEntry contains `contractId` (FK); `clientId` stored for query efficiency | EPIC-103 | ESTABLISHED |
| Workspace isolation: all domain queries scoped by `workspaceId` from server-trusted context | EPIC-104 | ESTABLISHED |
| AlertService → AnalyticsService dependency (AlertService consumes analytics) | EPIC-106 | ESTABLISHED |
| Alert trigger is best-effort (failure does not roll back TimeEntry) | EPIC-106 | ESTABLISHED |
| Unbounded notification list is MVP-accepted finding (F-106-P04-001) | EPIC-106 | ESTABLISHED |
| Ongoing contracts have `null` endDate and unlimited capacity | EPIC-105 | ESTABLISHED |
| Pro-rata capacity calculation for partial contract months | EPIC-105 | ESTABLISHED |

---

## 6. Architecture Assessment

### 6.1 Layer stack (confirmed)

```text
UI (RSC pages + feature components)
  ↓  Server Actions / page data loaders
Application Layer (services: analytics, alerts, reporting, clients, contracts, time-entries, workspace)
  ↓
Domain (repositories interfaces, types, errors)
  ↓
Infrastructure (Prisma repositories, auth, workspace resolver)
  ↓
Persistence (PostgreSQL via Prisma)
```

All domains respect this layering. No direct infrastructure calls from UI. No cross-domain repository access (each domain service receives only its own repositories).

### 6.2 Workspace context path (confirmed correct)

```text
HTTP request
  → getServerAuthSession() [server-only]
  → resolveWorkspaceContext(userId, members, workspaces)
  → WorkspaceContext { workspaceId, userId, timezone }
  → cached per React render via React.cache()
  → passed to all domain services as first argument
```

No client-provided workspace ID is trusted. The context is always server-derived. ✅

### 6.3 AlertService → AnalyticsService dependency (confirmed)

`triggerAlertEvaluation` instantiates both `AnalyticsService` and `AlertService` inline. The `AlertService` consumes `AnalyticsService`. No circular dependency. ✅

### 6.4 Analytics as shared capability (confirmed)

`AnalyticsService` is consumed by:
- Dashboard page (RSC)
- `AlertService` (via `triggerAlertEvaluation`)
- `ReportingService`

No duplication. All consumers go through the same service. ✅

### 6.5 Cross-workspace leakage (confirmed absent)

Every repository method accepts `workspaceId` as the first parameter. The `WorkspaceContext` is server-derived. No evidence of cross-workspace data access. ✅

### 6.6 Architecture compliance — no regressions proposed

No microservices, no riscritture, no architectural changes proposed. The integration Epic operates within the existing stack.

---

## 7. Domain / Data Invariants

Verification that the integration loop preserves all established invariants:

| Invariant | Preserved in integration loop? | Evidence |
|---|---|---|
| Client and Contract are separate entities | ✅ | Contract has `clientId` FK; no merging |
| TimeEntry contains `contractId` (integer minutes) | ✅ | `src/application/time-entries/create-time-entry.ts` |
| `contract-validation` guards clientId/contractId coherence | ✅ | `src/application/time-entries/contract-validation.ts` |
| `Workspace.timezone` used for period boundaries in analytics/alerts/reporting | ✅ | All three services read `context.timezone` |
| Workspace isolation: all queries scoped by `workspaceId` | ✅ | No evidence of cross-workspace access |
| ACTIVE/ARCHIVED client behavior (ARCHIVED clients excluded from new time entry selection) | ⚠️ | **GAP-INT-002** — see §8 |
| Alert lifecycle: deduplication via `alert-dedup-key` | ✅ | `src/application/alerts/alert-dedup-key.ts` |
| Historical correctness: time entries are immutable for `workDate`/`contractId`/`clientId` | ✅ | Confirmed in EPIC-103 |
| Ongoing contracts: `null` endDate, unlimited capacity | ✅ | `analytics-service.ts` pro-rata logic |
| Pro-rata capacity for partial months | ✅ | `src/application/analytics/analytics-service.ts` |

---

## 8. Integration Gaps

Evidence-backed gaps only. No theoretical issues.

### GAP-INT-001 — Dashboard/Reports not revalidated after TimeEntry mutations

| Field | Value |
|---|---|
| **ID** | GAP-INT-001 |
| **Severity** | HIGH |
| **Evidence** | `src/features/time-entries/create-time-entry-action.ts`, `update-time-entry-action.ts`, `delete-time-entry-action.ts` — none call `revalidatePath("/")` or `revalidatePath("/reports")`. Only `delete-time-entry-action.ts` redirects to `/time-tracking`. |
| **Impact** | After a TimeEntry mutation, the Dashboard may show stale analytics totals until the user manually navigates to `/`. The Reports page may also be stale. This breaks the visible integration loop for the user. |
| **Proposed phase** | P-INT-02 |
| **Status** | OPEN |

### GAP-INT-002 — ARCHIVED client visibility in TimeEntry form (ClientContractSelector)

| Field | Value |
|---|---|
| **ID** | GAP-INT-002 |
| **Severity** | MEDIUM |
| **Evidence** | `src/features/time-entries/ClientContractSelector.tsx` receives `clients` prop. The origin of this data requires verification: does `load-time-entries.ts` or `authenticated-time-entry-context.ts` filter ARCHIVED clients? |
| **Impact** | If ARCHIVED clients appear in the TimeEntry form selector, users can log time against archived clients, violating the ACTIVE/ARCHIVED invariant. |
| **Proposed phase** | P-INT-01 (discovery/verification pass) then P-INT-02 if a fix is required |
| **Status** | NEEDS VERIFICATION |

### GAP-INT-003 — No cross-domain E2E journey test

| Field | Value |
|---|---|
| **ID** | GAP-INT-003 |
| **Severity** | HIGH |
| **Evidence** | `tests/e2e/` — all spec files are single-domain. `alerts.spec.ts` creates a time entry within the same spec, which is the closest to cross-domain, but does not assert Dashboard or Reports. No spec traverses Auth → Client → Contract → TimeEntry → Dashboard → Alerts → Reports. |
| **Impact** | The integration chain can have broken links that no existing test catches. |
| **Proposed phase** | P-INT-04 |
| **Status** | OPEN |

### GAP-INT-004 — Pre-existing flaky auth E2E test (F-106-P05-001)

| Field | Value |
|---|---|
| **ID** | GAP-INT-004 |
| **Severity** | MEDIUM |
| **Evidence** | `auth.spec.ts` — "should register, stay authenticated, and sign out" — reproduced at `95eaede`. Accepted in EPIC-106 but not resolved. |
| **Impact** | A flaky auth E2E test undermines E2E gate reliability. A cross-domain E2E that depends on auth will inherit this instability. |
| **Proposed phase** | P-INT-01 |
| **Status** | OPEN (pending PD-INT-005 decision) |

### GAP-INT-005 — No unread notification badge in app shell navigation

| Field | Value |
|---|---|
| **ID** | GAP-INT-005 |
| **Severity** | LOW (UX) |
| **Evidence** | `src/lib/navigation.ts`, `src/components/app-shell/AppNav.tsx` — navigation items are static links with no badge. `src/features/notifications/NotificationList.tsx` computes `unreadCount` only on the `/alerts` page. |
| **Impact** | Users have no visual signal that new notifications exist. The alert discovery path is broken at the navigation level. |
| **Proposed phase** | P-INT-03 (pending PD-INT-002 decision) |
| **Status** | OPEN (pending PD-INT-002 decision) |

---

## 9. Phase Plan

### P-INT-01 — Discovery & Verification Pass

**Objective:** Resolve all ambiguities identified in this planning document before writing any code.

**Scope:**
- Verify GAP-INT-002: audit `authenticated-time-entry-context.ts` and `load-time-entries.ts` to confirm whether ARCHIVED clients are filtered in the TimeEntry form.
- Investigate F-106-P05-001 (flaky auth E2E) to determine root cause and whether it is fixable.
- Collect PD-INT-001 through PD-INT-005 decisions from Product Owner.

**Out of scope:** Any code change.

**Dependencies:** This Planning document (MVP-INTEGRATION epic-plan.md).

**Acceptance criteria:**
- GAP-INT-002 status confirmed (no fix needed OR fix scoped).
- F-106-P05-001 root cause documented.
- All five Product Decisions resolved.

**Test gate:** None (discovery only).

**Expected commit:** `docs(integration): record P-INT-01 findings`

**Findings policy:** Any new gap found must be documented in this file before implementation begins.

---

### P-INT-02 — Integration Gap Fixes

**Objective:** Fix all HIGH-severity integration gaps with minimal, targeted changes.

**Scope:**
- GAP-INT-001: Add `revalidatePath("/")` and `revalidatePath("/reports")` to `create-time-entry-action.ts`, `update-time-entry-action.ts`, `delete-time-entry-action.ts`.
- GAP-INT-002: Fix ARCHIVED client filtering in TimeEntry form if P-INT-01 confirms the gap.
- Any additional HIGH gaps found in P-INT-01.

**Out of scope:**
- Schema changes.
- New features.
- UX polish.

**Dependencies:** P-INT-01 complete; all PD decisions collected.

**Acceptance criteria:**
- After TimeEntry create/update/delete, navigating to Dashboard and Reports shows updated data without manual reload.
- ARCHIVED clients are not selectable in the TimeEntry form.
- All existing unit and integration tests pass.

**Test gate:** Full unit + integration suite (no regressions).

**Expected commit:** `fix(integration): resolve GAP-INT-001 cache invalidation and GAP-INT-002 client filtering`

**Findings policy:** Any regression found must block merge.

---

### P-INT-03 — Nav Badge (conditional on PD-INT-002)

**Objective:** Add unread notification count badge to the "Alerts" navigation item in the app shell.

**Scope (if PD-INT-002 resolves to Option A):**
- Load unread notification count in the app layout (server-side, cached).
- Pass count to `AppNav` / `AppSidebar`.
- Render a badge on the "Alerts" nav item when count > 0.

**Out of scope:**
- Real-time badge updates (polling / websockets).
- Badge on mobile nav (unless trivial to add).

**Dependencies:** P-INT-02 complete; PD-INT-002 confirmed as Option A.

**Acceptance criteria:**
- Badge visible on "Alerts" nav item when unread notifications exist.
- Badge absent when no unread notifications.
- No layout performance regression.

**Test gate:** Unit test for badge rendering; existing integration tests pass.

**Expected commit:** `feat(integration): add unread notification badge to Alerts nav item`

**Findings policy:** Standard.

---

### P-INT-04 — Cross-Domain E2E Journey Test

**Objective:** Deliver the primary certification artifact: a single E2E test that traverses the full MVP integration loop.

**Scope:**
- File: `tests/e2e/mvp-integration-journey.spec.ts`
- Single test: authenticated user → onboarding → create client → create contract → log time entry → verify dashboard updated → verify reports updated → verify alert triggered (if threshold crossed) → verify notification on /alerts → mark as read.
- Use existing E2E helpers (`first-workspace.ts`, `analytics-fixtures.ts`, etc.).

**Out of scope:**
- Per-domain edge cases (covered by domain specs).
- Performance benchmarking.

**Dependencies:** P-INT-02 complete (GAP-INT-001 fixed — dashboard must show correct data post-mutation); PD-INT-004 confirmed.

**Acceptance criteria:**
- Test passes in CI with no flakiness on 3 consecutive runs.
- Test covers at minimum: Auth, Workspace, Client, Contract, TimeEntry, Dashboard, Reports, Alerts.
- All existing E2E tests continue to pass (or F-106-P05-001 documented exception maintained).

**Test gate:** All E2E tests pass (subject to PD-INT-005 decision on F-106-P05-001).

**Expected commit:** `test(integration): add cross-domain MVP integration E2E journey`

**Findings policy:** Any domain boundary failure found during E2E authoring must be documented as a new gap before fixing.

---

### P-INT-05 — Engineering Review

**Objective:** Formal review of the integration Epic deliverables.

**Scope:**
- Review all changes from P-INT-01 through P-INT-04.
- Verify all gaps are closed or explicitly deferred.
- Verify all test gates pass.
- Produce engineering review document at `docs/epics/MVP-INTEGRATION/engineering-review.md`.

**Out of scope:** New features, new gaps.

**Dependencies:** P-INT-04 complete.

**Acceptance criteria:**
- Engineering review document produced.
- No blocking findings open.
- All test gates documented as PASS.

**Expected commit:** `docs(integration): produce MVP Integration engineering review`

---

### P-INT-06 — Documentation & Closure

**Objective:** Synchronize all documentation and close the Epic.

**Scope:**
- Update `docs/epics/MVP-INTEGRATION/epic-plan.md` with final status.
- Update `MASTER_PLAN.md`:
  - Mark MVP Integration Epic as COMPLETE.
  - Update `next:` block to Release Gates.
- Update `docs/testing-strategy.md` with final suite totals.

**Out of scope:** Any code change.

**Dependencies:** P-INT-05 complete.

**Acceptance criteria:**
- MASTER_PLAN.md reflects EPIC status COMPLETE.
- All documents consistent with actual repository state.

**Expected commit:** `docs(integration): close MVP Integration Epic and synchronize roadmap`

---

## 10. E2E Certification Scenario

### Scenario: MVP Full Integration Journey

**File:** `tests/e2e/mvp-integration-journey.spec.ts`

**Preconditions:**
- Clean test database (isolated E2E DB).
- No pre-existing users, workspaces, clients, contracts, or time entries.
- Application running locally or in CI environment.

**Actions:**

1. Navigate to `/sign-in`.
2. Register a new user account (email + password).
3. Verify redirect to `/onboarding`.
4. Create first workspace with name and timezone (e.g., `Europe/Rome`).
5. Verify redirect to `/` (Dashboard). Dashboard should show empty state.
6. Navigate to `/clients/new`. Create a client (e.g., `"Integration Test Client"`).
7. Verify redirect to `/clients/:id`. Client detail page visible.
8. Navigate to `/contracts/new`. Create a contract for the client:
   - `contractedHours`: set to a low threshold (e.g., 10h) so alerts can trigger.
   - `startDate`: first of current month.
   - `endDate`: null (ongoing).
9. Verify redirect to `/contracts/:id`. Contract detail page visible.
10. Navigate to `/time-tracking/new`. Create a time entry:
    - Select the client and contract created above.
    - Set `workDate` to today.
    - Set duration > 80% of contracted hours (to trigger an alert).
    - Add a description.
11. Verify redirect to `/time-tracking?date=...`. Time entry visible in list.
12. Navigate to `/` (Dashboard). Assert:
    - Dashboard shows updated hours tracked for the current month (not stale).
    - Contract utilization bar reflects the logged hours.
13. Navigate to `/reports`. Assert:
    - "Hours by Client" table includes the test client.
    - "Contract Report" table includes the test contract with correct utilization.
14. Navigate to `/alerts`. Assert:
    - At least one notification is present (alert triggered by the time entry above threshold).
    - Notification is marked as unread.
15. Click "Mark as read" on the notification. Assert:
    - Notification is now shown as read (or removed from unread count).
    - Page reflects the updated state without a full reload.

**Expected results:**
- All 15 steps complete without errors.
- No 500 errors, no redirects to `/workspace-unavailable` or `/sign-in`.
- Dashboard and Reports reflect real data (not empty/stale).
- Alert notification is present and mark-as-read works.

**Isolation expectations:**
- Test uses a unique email (via `uniqueE2EEmail` helper pattern).
- Test data is scoped to the created workspace.
- No data leaks to other test contexts.

**Failure points (expected to catch):**
- GAP-INT-001: Dashboard shows stale data → test fails at step 12.
- GAP-INT-003: No cross-domain test existed → this test fills the gap.
- Auth flow regression → test fails at step 2–4.
- Alert evaluation failure → test fails at step 14.
- Cache invalidation missing on reports → test fails at step 13.

---

## 11. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-INT-001 | GAP-INT-001 closed: TimeEntry mutations explicitly revalidate Dashboard and Reports cache. |
| AC-INT-002 | GAP-INT-002 resolved: ARCHIVED clients are not selectable in the TimeEntry form (or confirmed already filtered). |
| AC-INT-003 | GAP-INT-003 closed: `tests/e2e/mvp-integration-journey.spec.ts` exists and passes. |
| AC-INT-004 | GAP-INT-004 resolved: F-106-P05-001 flaky test fixed OR explicitly accepted with documented justification. |
| AC-INT-005 | GAP-INT-005 resolved: Nav badge implemented (if PD-INT-002 confirms) OR explicitly deferred with PO sign-off. |
| AC-INT-006 | All unit tests pass (≥ 379 passing, no regressions). |
| AC-INT-007 | All integration tests pass (≥ 219 passing, no regressions). |
| AC-INT-008 | All E2E tests pass including new cross-domain journey (subject to accepted exceptions). |
| AC-INT-009 | Engineering review document produced with no blocking findings open. |
| AC-INT-010 | MASTER_PLAN.md updated to reflect Epic COMPLETE. |

---

## 12. Risks & Findings

| ID | Description | Severity | Status |
|---|---|---|---|
| RISK-INT-001 | F-106-P05-001 flaky auth E2E may be environment-dependent and hard to reproduce reliably | MEDIUM | Pending investigation (P-INT-01) |
| RISK-INT-002 | Cross-domain E2E journey (step 14: alert trigger) depends on contractedHours threshold being crossed in test data; test setup must be careful about timing and current-month period boundaries | MEDIUM | Mitigated by using low threshold and explicit current-month date |
| RISK-INT-003 | `revalidatePath` calls in TimeEntry actions (GAP-INT-001 fix) may introduce unexpected cache invalidation side-effects if other pages share the same cache segment | LOW | Targeted paths only (`"/"`, `"/reports"`) |

---

## 13. Definition of Done

- [ ] All Product Decisions (PD-INT-001 through PD-INT-005) resolved or explicitly deferred.
- [ ] All HIGH gaps (GAP-INT-001, GAP-INT-003) closed.
- [ ] All MEDIUM gaps (GAP-INT-002, GAP-INT-004) closed or explicitly accepted.
- [ ] LOW gap (GAP-INT-005) resolved per PD-INT-002 decision.
- [ ] Cross-domain E2E journey test passes in CI.
- [ ] Unit test suite: ≥ 379 passing.
- [ ] Integration test suite: ≥ 219 passing.
- [ ] All E2E tests pass (accepted exceptions documented).
- [ ] Engineering review produced and signed off.
- [ ] MASTER_PLAN.md updated.
- [ ] `docs/testing-strategy.md` updated with final totals.

---

## 14. Document Status

```yaml
epic: MVP-INTEGRATION
phase: PLANNING
status: PLANNING
created: 2026-09-17
author: planning session
product_decisions:
  PD-INT-001: DEFERRED (recommended) — pending PO confirmation
  PD-INT-002: DECISION REQUIRED
  PD-INT-003: DECISION REQUIRED
  PD-INT-004: DECISION REQUIRED
  PD-INT-005: DECISION REQUIRED
gaps:
  GAP-INT-001: OPEN — HIGH — dashboard/reports cache invalidation
  GAP-INT-002: NEEDS VERIFICATION — MEDIUM — archived client in TimeEntry form
  GAP-INT-003: OPEN — HIGH — no cross-domain E2E
  GAP-INT-004: OPEN — MEDIUM — flaky auth E2E
  GAP-INT-005: OPEN — LOW — nav badge pending PD-INT-002
phases:
  P-INT-01: Discovery & Verification — PENDING
  P-INT-02: Integration Gap Fixes — PENDING
  P-INT-03: Nav Badge — PENDING (conditional)
  P-INT-04: Cross-Domain E2E Journey — PENDING
  P-INT-05: Engineering Review — PENDING
  P-INT-06: Documentation & Closure — PENDING
next:
  phase: P-INT-01
  objective: Resolve Product Decisions and verify GAP-INT-002 and GAP-INT-004
```
