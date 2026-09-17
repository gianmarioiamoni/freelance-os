# EPIC-106 — Alerts & Notifications

**Epic:** EPIC-106\
**Release:** Release 1 — MVP\
**MASTER_PLAN identifier:** R1-E06 — Alerts & Notifications (`MASTER_PLAN.md` §16)\
**Status:** COMPLETE / CLOSED — Engineering Review PASS\
**Dependencies:** EPIC-002, EPIC-003, EPIC-004, EPIC-005, EPIC-006, EPIC-101, EPIC-102, EPIC-103, EPIC-104, EPIC-105\
**Previous Epic:** EPIC-105 Reporting (`docs/epics/EPIC-105/engineering-review.md`, commit `03ff14e`)

```text
PLANNING:              COMPLETE
PRODUCT DECISIONS:     RESOLVED — PD-106-001 DEFERRED, PD-106-002 IN-APP ONLY, PD-106-003 ON-WRITE
BLOCKING DECISIONS:    NONE OUTSTANDING
IMPLEMENTATION:        COMPLETE
P106-00:               COMPLETE — (planning commit — part of P106-00 chat)
P106-01:               REMOVED (PD-106-001 DEFERRED — capacity alerts out of MVP scope)
P106-02:               COMPLETE — commit 6daf2cd
P106-03:               COMPLETE — commit 012f6da
P106-04:               COMPLETE — commit 95eaede
P106-05:               COMPLETE — commit 72d9f1d
P106-06:               COMPLETE — documentation sync
P106-07:               COMPLETE — commit 13a48a0
P106-08:               COMPLETE — commit 47f82ec
P106-09:               COMPLETE — commit b421e60
P106-10:               COMPLETE — EPIC CLOSURE
```

---

## 1. Objective

Implement the alert engine and in-app notification surface for FreelanceOS MVP.

The engine evaluates deterministic rules against existing analytics state, creates persisted alerts with deduplication, and delivers in-app notifications to the workspace member who triggered the evaluation.

No email delivery, Slack integration, or push notifications are in scope for MVP.

---

## 2. Business Context

Freelancers working against fixed-capacity contracts need to know:
- when they are approaching the contracted limit (warning threshold);
- when they have reached or exceeded the contracted limit;
- when their monthly recorded work approaches or exceeds their configured capacity.

These conditions exist implicitly in the analytics layer (EPIC-104/105) but are never surfaced proactively. The user must manually read utilization numbers and draw conclusions.

EPIC-106 makes these conditions explicit, persistent, and visible without requiring the user to check the dashboard or reports.

OBD-006 is resolved: the Product Owner has approved a capacity warning threshold of **80%**. This applies to both contract utilization warnings and monthly capacity warnings.

---

## 3. Scope

### In scope

- **Alert evaluation service** — deterministic rule engine consuming `AnalyticsService` and `WorkspaceSettings`; no calculation duplication.
- **Alert types** — `CONTRACT_WARNING`, `CONTRACT_EXCEEDED` (MVP scope after PD-106-001 DEFERRED). `CAPACITY_WARNING` and `CAPACITY_EXCEEDED` remain in the schema but are not evaluated in MVP.
- **Alert persistence** — `Alert` table exists with full schema: `deduplicationKey`, `resolvedAt`, `periodStart`/`periodEnd`, `clientId`, `contractId`.
- **Alert deduplication** — idempotent: if an alert with the same `deduplicationKey` already exists and is active, no duplicate is created.
- **Alert resolution** — when the condition drops below threshold, the active alert is resolved (`resolvedAt` set).
- **Notification creation** — one `Notification` row per workspace member per alert event.
- **In-app notification center** — `/alerts` route (currently a placeholder), listing notifications for the current user; read/unread state; mark-as-read.
- **Workspace isolation** — every alert and notification is scoped to `workspaceId`; no cross-tenant access.
- **WorkspaceSettings integration** — threshold read from `WorkspaceSettings.contractWarningPercent` (default 80, OBD-006 resolved). `monthlyCapacityWarningPercent` is not evaluated in MVP (PD-106-001 DEFERRED).
- **Alert evaluation trigger** — on-write, called after successful TimeEntry mutations (`create-time-entry-action.ts`, `update-time-entry-action.ts`, `delete-time-entry-action.ts`) as a non-blocking side-effect (PD-106-003 resolved).

### Out of scope

- **`CAPACITY_WARNING` / `CAPACITY_EXCEEDED` alert types** — DEFERRED (PD-106-001). Monthly workspace capacity has insufficient domain semantics for MVP. No `monthlyCapacityMinutes` field added. No P106-01 migration.
- Email notification delivery (PD-106-002 resolved: in-app only).
- Slack or any external channel.
- Push notifications.
- Background scheduled job / cron (PD-106-003 resolved: on-write trigger).
- Inngest or any external job queue.
- Webhook delivery.
- Alert subscription management per-user.
- Multi-user notification fan-out (MVP has one member per workspace; the architecture supports fan-out, but it will not be exercised).
- Alert snooze or acknowledgement beyond read/unread.
- Alert history pagination.
- Real-time (WebSocket/SSE) push of new notifications.
- Settings UI for configuring thresholds (WorkspaceSettings exist but no settings page is in scope for this Epic).
- OBD-012 rollover/expiry semantics — alert capacity calculation uses the same no-rollover pro-rata logic as EPIC-105.

---

## 4. Explicit Non-Goals

| Non-goal | Rationale |
| --- | --- |
| `CAPACITY_WARNING` / `CAPACITY_EXCEEDED` alert evaluation | PD-106-001 DEFERRED — monthly capacity lacks sufficient domain semantics for MVP |
| `monthlyCapacityMinutes` field / migration | Not introduced; PD-106-001 defers the capacity model |
| Email delivery | PD-106-002 resolved: in-app only for MVP |
| Slack / Teams | PD-106-002 resolved: in-app only; explicitly deferred in `MASTER_PLAN.md` §18 |
| Background cron / scheduler | PD-106-003 resolved: on-write trigger; no scheduler introduced |
| Inngest or external queue | PD-106-003 resolved: not needed; over-engineering for MVP |
| Multi-channel notification platform | Architecture boundary exists for future channels; MVP is in-app only |
| Alert rule configuration UI | Thresholds are workspace-level settings; a full settings UI is out of scope |
| AI-based anomaly detection | Deferred to future release |
| Billing / revenue alerts | Revenue calculations are not implemented |
| OBD-012 rollover semantics | Carries forward from EPIC-105; alert evaluation uses same no-rollover pro-rata logic |

---

## 5. Existing Capabilities Reused

The following are already delivered and must not be reimplemented.

### Domain / persistence layer (fully reused, no changes)

| Artifact | Location | What it provides |
| --- | --- | --- |
| `AlertType` enum | `prisma/schema.prisma`, `src/domain/persistence-types.ts` | `CONTRACT_WARNING`, `CONTRACT_EXCEEDED`, `CAPACITY_WARNING`, `CAPACITY_EXCEEDED` |
| `AlertSeverity` enum | same | `INFO`, `WARNING`, `ERROR` |
| `Alert` model | `prisma/schema.prisma` | Full schema: `id`, `workspaceId`, `type`, `severity`, `clientId`, `contractId`, `periodStart`, `periodEnd`, `deduplicationKey`, `createdAt`, `resolvedAt` |
| `Notification` model | `prisma/schema.prisma` | Full schema: `id`, `workspaceId`, `userId`, `alertId`, `type`, `title`, `body`, `readAt`, `createdAt` |
| `WorkspaceSettings` model | `prisma/schema.prisma` | `contractWarningPercent` (default 80), `monthlyCapacityWarningPercent` (default 80) |
| `AlertRecord`, `NotificationRecord` | `src/domain/persistence-types.ts` | Domain record types |
| `CreateAlertInput`, `CreateNotificationInput` | `src/domain/persistence-types.ts` | Input types |
| `AlertRepository`, `NotificationRepository` | `src/domain/repositories.ts` | Repository interfaces |
| `WorkspaceSettingsRepository` | `src/domain/repositories.ts` | `getSettings`, `putSettings` |
| `createAlertRepository` | `src/infrastructure/persistence/alert-repository.ts` | Full implementation: `createAlert`, `getAlert`, `findAlertByDeduplicationKey`, `resolveAlert` |
| `createNotificationRepository` | `src/infrastructure/persistence/notification-repository.ts` | Full implementation: `createNotification`, `getNotification`, `listNotificationsForUser`, `markNotificationRead` |
| `createRepositories()` | `src/infrastructure/persistence/create-repositories.ts` | Both repositories already registered |
| `mapAlert`, `mapNotification` | `src/infrastructure/persistence/mappers.ts` | Already implemented |
| Navigation entry | `src/lib/navigation.ts` | `/alerts` link already in sidebar with `Bell` icon |
| `/alerts` route | `src/app/(app)/alerts/page.tsx` | Placeholder to be replaced |

### Analytics layer (reused, no duplication)

| Artifact | What it provides |
| --- | --- |
| `AnalyticsService.getContractUtilizations()` | `ContractUtilization[]` with `consumedMinutes`, `contractedMinutes`, `utilizationPercentage` per contract per period |
| `AnalyticsService.getMonthlyAnalytics()` | `totalMinutes`, `billableMinutes` per period |
| `getCurrentMonthPeriod(timezone)` | Workspace-timezone-aware current month period |
| `WorkspaceContext` | `workspaceId`, `userId`, `timezone` — workspace boundary |
| `requireWorkspaceAccess` | membership guard pattern |
| `DEFAULT_CONTRACT_WARNING_PERCENT` | 80 — already defined in `create-first-workspace.ts` |
| `DEFAULT_MONTHLY_CAPACITY_WARNING_PERCENT` | 80 — already defined |

### UI system (reused)

Shadcn/ui `Alert`, `Button`, `Card`, `EmptyState`, `LoadingState`, `ErrorState`, `PageHeader`, `PageContent` — all available.

---

## 6. Product Decisions

### PD-106-001 — Capacity model (RESOLVED: DEFERRED)

**Decision:** DEFER `CAPACITY_WARNING` and `CAPACITY_EXCEEDED` alerts.

**Rationale:** Monthly workspace capacity has insufficient domain semantics for MVP. Introducing a new capacity model solely to support alerts would fabricate a denominator (contra BR-104-011). Contract-capacity alerts are addressable via existing EPIC-105 semantics.

**Consequences:**
- AR-003 and AR-004 are **not implemented** in MVP.
- `monthlyCapacityMinutes` field is **not added** to `WorkspaceSettings`.
- No schema migration required (P106-01 removed from phase breakdown).
- `CAPACITY_WARNING` and `CAPACITY_EXCEEDED` enum values remain in the schema for future use.
- `monthlyCapacityWarningPercent` field in `WorkspaceSettings` is not read in MVP.

---

### PD-106-002 — Notification channels (RESOLVED: IN-APP ONLY)

**Decision:** In-app notifications only for MVP.

**Consequences:**
- `/alerts` is the notification center MVP.
- No email, Slack, push, or external delivery provider.
- Architecture does not couple the domain model to the in-app UI, permitting future channels without domain rework.

---

### PD-106-003 — Alert evaluation trigger (RESOLVED: ON-WRITE AFTER TIMEENTRY MUTATIONS)

**Decision:** `evaluateAlerts(context)` is called as a non-blocking side-effect after successful TimeEntry mutations.

**Verified TimeEntry mutation files (repository-confirmed):**
- `src/features/time-entries/create-time-entry-action.ts`
- `src/features/time-entries/update-time-entry-action.ts`
- `src/features/time-entries/delete-time-entry-action.ts`

All three are in scope for trigger integration (P106-03).

**Consequences:**
- No cron, scheduler, Inngest, polling, or background monitoring introduced.
- Alert lifecycle: created when threshold exceeded; resolved when condition no longer true; re-created when condition re-fires after resolution.
- Evaluation failure does not fail the TimeEntry operation (non-blocking fire-and-forget pattern).

---

### Non-blocking decisions (defaults applied)

| ID | Decision | Applied default |
| --- | --- | --- |
| PD-106-004 | Re-trigger semantics | Resolve active alert; create new alert when condition re-fires. Treat resolved dedup key as "not found". |
| PD-106-005 | Notification read/unread UI | Individual `markNotificationRead` per notification. |
| PD-106-006 | Alert history retention | All alerts retained; no auto-expiry in MVP. |
| PD-106-007 | Notification fan-out | MVP: one notification for the requesting user. Supports future fan-out when OBD-009 resolved. |

---

## 7. Domain Model

### Concepts (distinct, not synonymous)

| Concept | Definition |
| --- | --- |
| **Alert condition** | A business state that satisfies a threshold rule (e.g., `utilizationPercentage >= 80`). A condition is a logical truth, not a record. |
| **Alert** | A persisted record created when a condition is first detected and not yet active. Has a `deduplicationKey` scoped to `(workspaceId, type, contractId?, period)`. Is created once per condition occurrence; not re-created while active. |
| **Alert state** | `active` (no `resolvedAt`) or `resolved` (`resolvedAt` is set). |
| **Notification** | A persisted user-facing delivery of an alert event. Created once per alert event per user. Has its own `readAt` state. Independent from alert state. |
| **Alert resolution** | When the condition that created the alert drops below threshold, `resolvedAt` is set on the alert. No new notification is created for resolution (unless PD-106-004 is overridden). |
| **Re-trigger** | If a condition resolves and later fires again, a new alert is created (old alert is resolved; new alert has a different `id` but the same key pattern with an incremented or timestamp suffix). |
| **Deduplication key** | A deterministic string `"{type}:{workspaceId}:{contractId?}:{periodStart}"` that uniquely identifies one alert occurrence. Prevents duplicate active alerts for the same condition within the same period. |
| **Workspace isolation** | All alerts and notifications carry `workspaceId`. Repositories always include `workspaceId` in queries. No cross-tenant access. |

### Alert rules (from `docs/domain-model.md` §10)

| Rule ID | Type | Condition | Threshold | Severity | MVP Status |
| --- | --- | --- | --- | --- | --- |
| AR-001 | `CONTRACT_WARNING` | `utilizationPercentage >= contractWarningPercent` | `WorkspaceSettings.contractWarningPercent` (default 80%) | `WARNING` | **IN SCOPE** |
| AR-002 | `CONTRACT_EXCEEDED` | `consumedMinutes >= contractedMinutes` (utilization >= 100%) | 100% (hard) | `ERROR` | **IN SCOPE** |
| AR-003 | `CAPACITY_WARNING` | `totalMinutes / monthlyCapacityMinutes >= monthlyCapacityWarningPercent / 100` | `WorkspaceSettings.monthlyCapacityWarningPercent` (default 80%) | `WARNING` | **DEFERRED — PD-106-001** |
| AR-004 | `CAPACITY_EXCEEDED` | `totalMinutes >= monthlyCapacityMinutes` | same | `ERROR` | **DEFERRED — PD-106-001** |

**MVP implements AR-001 and AR-002 only.** AR-003 and AR-004 are deferred (PD-106-001) and require a future capacity model decision before implementation.

---

## 8. Alert Semantics

### 8.1 Alert lifecycle

```text
condition NOT met → no action (idempotent)
condition met → findAlertByDeduplicationKey()
  → alert exists and active → no action (deduplication)
  → alert exists and resolved → create new alert + notify
  → alert not found → create alert + notify
condition drops below threshold → resolveAlert() if active alert exists
```

### 8.2 Deduplication key construction

```text
CONTRACT_WARNING:  "cw:{workspaceId}:{contractId}:{periodStart}"    ← MVP
CONTRACT_EXCEEDED: "ce:{workspaceId}:{contractId}:{periodStart}"    ← MVP
CAPACITY_WARNING:  "capw:{workspaceId}:{periodStart}"               ← DEFERRED (PD-106-001)
CAPACITY_EXCEEDED: "cape:{workspaceId}:{periodStart}"               ← DEFERRED (PD-106-001)
```

Period is the current month period (matching the analytics evaluation period). Keys are deterministic and stable within a period.

### 8.3 Re-trigger behavior (PD-106-004 default)

1. Alert is active → condition drops below threshold → `resolveAlert()` called.
2. Next evaluation: condition re-fires → `findAlertByDeduplicationKey()` returns the resolved alert.
3. Since the resolved alert exists, create a **new** alert. To avoid key collision: append a suffix derived from the new `createdAt` timestamp (ISO timestamp suffix) OR increment a counter stored as a query on the resolved count.

**Decision:** For MVP, if `findAlertByDeduplicationKey` returns a resolved alert, treat it as "not found" — create a new alert. The deduplication key suffix strategy deferred until Product Owner specifies re-trigger suppression windows.

### 8.4 Persistence model (existing schema, no migration needed for AR-001/AR-002)

```text
Alert {
  id                uuid PK
  workspaceId       uuid FK → Workspace
  type              AlertType  (CONTRACT_WARNING | CONTRACT_EXCEEDED | CAPACITY_WARNING | CAPACITY_EXCEEDED)
  severity          AlertSeverity (INFO | WARNING | ERROR)
  clientId          uuid? FK → Client
  contractId        uuid? FK → Contract
  periodStart       date?
  periodEnd         date?
  deduplicationKey  string UNIQUE per workspace
  createdAt         timestamptz
  resolvedAt        timestamptz?
}
```

**No migration required for MVP.** PD-106-001 is DEFERRED; `monthlyCapacityMinutes` is not added to `WorkspaceSettings`. The existing schema is sufficient for AR-001 and AR-002.

### 8.5 Null capacity handling

Follows the established pattern (BR-104-011, EPIC-104/105): if `contractedMinutes` is null (unlimited contract), `utilizationPercentage` is null. No alert is fired for a contract with null contracted capacity. This is deterministic and correct.

---

## 9. Notification Semantics

### 9.1 Notification lifecycle

```text
alert created → create notification(s) for workspace member(s)
notification exists → user opens /alerts → list displayed
user clicks mark-as-read → markNotificationRead(notificationId, readAt=now())
```

### 9.2 Notification content

| Field | Value |
| --- | --- |
| `type` | `"ALERT"` (string; extensible) |
| `title` | Human-readable condition label (e.g., "Contract approaching limit") |
| `body` | Detail with client name, contract period, utilization percentage |
| `alertId` | FK to the alert that generated the notification |
| `readAt` | `null` until user reads; set by `markNotificationRead` |

### 9.3 Notification vs alert state independence

Reading a notification does not resolve the alert. Resolving an alert does not delete the notification. They are independent lifecycle objects.

### 9.4 Fan-out (MVP)

For MVP (single-member workspace), one notification is created for `WorkspaceContext.userId`. The `listNotificationsForUser(workspaceId, userId)` query is already implemented.

---

## 10. Capacity Warning Semantics

### Contract utilization (AR-001, AR-002 — MVP IN SCOPE)

- **What is measured:** `consumedMinutes` per contract per current period.
- **Denominator:** `contractedMinutes` — pro-rated from `Contract.monthlyContractedMinutes` using the overlap between `[validFrom, validTo)` and the current month period (identical to EPIC-105 reporting logic).
- **Reporting period:** current month period resolved from `Workspace.timezone` (same as `getCurrentMonthPeriod(timezone)`).
- **Threshold:** `WorkspaceSettings.contractWarningPercent` (default 80, OBD-006 resolved).
- **Alert fires when:** `utilizationPercentage >= contractWarningPercent` (float comparison).
- **Alert resolves when:** `utilizationPercentage < contractWarningPercent`.
- **Exceeded condition:** `consumedMinutes >= contractedMinutes` (≥ 100%). This may overlap with warning; both alerts may exist simultaneously for the same contract.
- **Null denominator:** no alert fires if `contractedMinutes` is null (unlimited contract).
- **Per-contract evaluation:** each contract is evaluated independently; one alert per contract per period.
- **Calculation source:** `AnalyticsService.getContractUtilizations()` — not duplicated in `AlertService`.

### Monthly workspace capacity (AR-003, AR-004 — DEFERRED PD-106-001)

Monthly workspace capacity alerts are **not implemented in MVP**. The capacity model (denominator, semantics) lacks sufficient domain definition. Future implementation requires a separate Product Decision resolving the capacity model before reintroducing AR-003/AR-004.

---

## 11. Architecture

### Application service: `AlertService`

New application service at `src/application/alerts/alert-service.ts`.

**Responsibilities:**
- Membership guard (pattern from `AnalyticsService`).
- Call `AnalyticsService.getContractUtilizations(context, period)`.
- Evaluate AR-001, AR-002 per contract (MVP scope).
- AR-003, AR-004 evaluation deferred (PD-106-001).
- For each firing condition: `findAlertByDeduplicationKey` → create or skip.
- For each resolving condition: `resolveAlert` if active alert exists.
- After alert create/resolve: `createNotification` for each workspace member.
- Return evaluation summary: `AlertEvaluationResult`.

**Dependencies injected:**
- `AlertRepository`
- `NotificationRepository`
- `WorkspaceMemberRepository`
- `WorkspaceSettingsRepository`
- `AnalyticsService` (or its underlying `AnalyticsRepository` + member repo already held)

**Signature:**
```typescript
evaluateAlerts(context: WorkspaceContext): Promise<AlertEvaluationResult>
getNotificationsForUser(context: WorkspaceContext): Promise<NotificationRecord[]>
markNotificationRead(context: WorkspaceContext, notificationId: string): Promise<NotificationRecord>
```

**Must not:**
- Duplicate utilization calculations (delegates to `AnalyticsService`).
- Accept `workspaceId` from the browser.
- Bypass membership guard.

### Dependency diagram

```text
AlertService
  ↓ reads
AnalyticsService (existing) → getContractUtilizations()
  ↓ reads
WorkspaceSettingsRepository (existing) → getSettings()
  ↓ writes
AlertRepository (existing) → createAlert / resolveAlert / findAlertByDeduplicationKey
  ↓ writes
NotificationRepository (existing) → createNotification
  ↓ reads
WorkspaceMemberRepository (existing) → listMembers (for fan-out)
```

### UI: `/alerts` notification center

Replace the placeholder `src/app/(app)/alerts/page.tsx` with an RSC that:
- Calls `AlertService.getNotificationsForUser(context)`.
- Renders a list of notifications (unread first, then read).
- Each notification shows: title, body, creation date, read/unread badge.
- Mark-as-read via Server Action → `AlertService.markNotificationRead()`.
- Empty state when no notifications.
- Unread count badge in sidebar navigation (requires reading count server-side in layout or via dedicated query).

### Module structure (as delivered)

```text
src/application/alerts/
  alert-service.ts          # AlertService
  alert-evaluation-types.ts # AlertEvaluationResult
  alert-dedup-key.ts        # Deterministic dedup key builder

src/features/notifications/           # Note: path differs from plan (alerts/ → notifications/)
  NotificationList.tsx                # Notification list RSC component
  NotificationCard.tsx                # Individual notification card with mark-as-read
  load-notifications.ts               # Server query helper
  mark-notification-read-action.ts    # Server Action with ownership check

src/features/time-entries/
  trigger-alert-evaluation.ts         # Non-blocking alert evaluation trigger

src/app/(app)/alerts/
  page.tsx                            # RSC notification center (replaces placeholder)
```

---

## 12. Workspace Isolation

All existing isolation invariants apply.

| Invariant | Enforcement |
| --- | --- |
| `Alert.workspaceId` always set | Repository `createAlert(workspaceId, input)` — first param |
| `Notification.workspaceId` always set | Repository `createNotification(workspaceId, input)` — first param |
| `WorkspaceContext` from server session only | `getCurrentWorkspaceContext()` — never from request param |
| Membership guard in `AlertService` | `WorkspaceMemberRepository.getMember()` before any operation |
| No `workspaceId` from browser | Server Actions resolve context server-side |
| Cross-workspace read denied | `listNotificationsForUser(workspaceId, userId)` scoped by both |

Security invariant (SI-106-001): alert evaluation never exposes data from another workspace, even if two users share a `userId` across workspaces (which is the multi-membership case, currently rejected by `resolveWorkspaceContext`).

---

## 13. Async / Background Processing

**PD-106-003 RESOLVED: ON-WRITE TRIGGER.**

`evaluateAlerts(context)` is called within the TimeEntry Server Actions after a successful write, as a non-blocking side-effect. Evaluation does not block or fail the TimeEntry operation.

**Trigger points (all three must be wired in P106-03):**
- `src/features/time-entries/create-time-entry-action.ts`
- `src/features/time-entries/update-time-entry-action.ts`
- `src/features/time-entries/delete-time-entry-action.ts`

Pattern:
```typescript
// in TimeEntry Server Action — after successful mutation
void alertService.evaluateAlerts(context).catch((err) => {
  console.error("[alert-evaluation] failed", err);
});
```

**Trade-off:** Evaluation errors are logged but do not fail the TimeEntry operation. The alert state may lag by one mutation cycle if evaluation errors accumulate.

**No cron, scheduler, Inngest, polling, or background monitoring introduced.**

---

## 14. Error / Failure Handling

| Scenario | Handling |
| --- | --- |
| `AnalyticsService` throws | `AlertService.evaluateAlerts()` propagates; caller (server action or page) catches and logs; evaluation skipped for this cycle |
| `AlertRepository` `createAlert` fails (unique constraint on dedup key) | Repository already uses `withPersistenceErrors`; duplicate creates should not reach the DB due to `findAlertByDeduplicationKey` pre-check; if race occurs, treat as idempotent success |
| `NotificationRepository.createNotification` fails | Log error; alert creation is already committed; notification may be retried on next evaluation |
| `markNotificationRead` on a notification from another user/workspace | Repository query `WHERE id AND workspaceId` — `RecordNotFoundError` thrown; Server Action returns user-safe error |
| Evaluation runs concurrently (two requests same user) | Both will find the same active alert via `findAlertByDeduplicationKey` and skip creation; safe |

---

## 15. UI / UX Scope

### `/alerts` page

- **RSC** — no `use client`, no `useEffect`.
- **Authorization:** `getCurrentWorkspaceContext()` outside any try/catch (following F-103-001 precedent).
- **Content:** `NotificationList` component receiving `NotificationRecord[]`.
- **States:** `EmptyState` (no notifications), `ErrorState` (evaluation failed).
- **Individual notification:** title, body, formatted date, unread indicator (dot/badge), mark-as-read button.
- **Sort:** `listNotificationsForUser` returns newest first (already implemented in `notification-repository.ts`).
- **Mark-as-read:** Server Action, optimistic UI not required for MVP.

### Sidebar notification badge

- Unread notification count displayed on the `/alerts` sidebar link.
- Resolved server-side in the `(app)/layout.tsx` by calling `AlertService.getUnreadCount(context)` or by counting `readAt IS NULL` from `listNotificationsForUser`.
- Must not add a `use client` directive to the layout.

### Dashboard integration

Not applicable — PD-106-003 resolved to on-write trigger. Alert evaluation occurs on TimeEntry mutations, not on dashboard load.

---

## 16. Testing Strategy

### 16.1 Unit tests (`tests/unit/`)

| Suite | Behaviours |
| --- | --- |
| `unit/application/alerts/alert-service.test.ts` | AR-001 fires at >= threshold; AR-001 does not fire below threshold; AR-002 fires at >= 100%; null utilization produces no alert; active alert not duplicated (deduplication); resolved alert triggers re-creation; resolveAlert called when condition drops; membership guard rejects non-members; null contractedMinutes suppresses alert; no alert for out-of-validity contract with null capacity |
| `unit/lib/alert-dedup-key.test.ts` (if extracted) | Deterministic key construction per type and input |

**Count target:** ~20 unit tests.

### 16.2 Integration tests (`tests/integration/`)

| Suite | Behaviours |
| --- | --- |
| `integration/alerts/alert-service.test.ts` | Full evaluation against real DB: create time entries → evaluate → assert alert created; add more time entries → evaluate again → assert no duplicate; time entries reduced → evaluate → assert alert resolved; workspace isolation (two workspaces, no cross-alert); null-capacity contract → no alert; contract with 0 contracted minutes → no alert; settings threshold respected (use non-default setting) |
| `integration/alerts/notification-repository.test.ts` | `listNotificationsForUser` returns only own workspace; `markNotificationRead` updates readAt; non-member access denied |

**Count target:** ~20 integration tests. The existing `notifications.test.ts` persistence test (2 tests) is already in the integration suite.

### 16.3 Authorization / isolation tests

| Case | Level |
| --- | --- |
| Notification from workspace A not visible to workspace B member | Integration |
| `markNotificationRead` with wrong workspaceId → `RecordNotFoundError` | Integration |
| Evaluation with non-member context → `UnauthorizedWorkspaceAccessError` | Unit |

### 16.4 E2E tests (`tests/e2e/`)

| Journey | Scope |
| --- | --- |
| Create time entries to 80%+ utilization → load dashboard or reports → open `/alerts` → notification visible | Playwright |
| Mark notification as read → unread badge count decrements | Playwright |
| Empty state when no alerts | Playwright |

**Count target:** 3–5 E2E tests.

### 16.5 Boundary / edge cases

| Case | Test level |
| --- | --- |
| `utilizationPercentage` = exactly 80.0 → alert fires | Unit |
| `utilizationPercentage` = exactly 79.99 → alert does not fire | Unit |
| `utilizationPercentage` = exactly 100 → both WARNING and EXCEEDED fire | Unit |
| `contractedMinutes` = null → no alert | Unit |
| Timezone boundary: month rollover in workspace timezone | Unit (period resolution) |
| Two concurrent evaluations → only one alert persisted | Integration |

### 16.6 Failure mode tests

| Case | Level |
| --- | --- |
| Analytics query throws → evaluation skipped, no partial state | Unit (mock) |
| Notification creation fails → alert remains, no crash | Unit (mock) |

---

## 17. Observability

- Structured log entry at `[alert-evaluation] start {workspaceId}` and `[alert-evaluation] complete {alertsCreated} {alertsResolved} {notificationsCreated}`.
- Log `[alert-evaluation] failed {error}` on exception (non-blocking to caller).
- No metrics platform introduced; log-based observability only, consistent with architecture §25.

---

## 18. Security Considerations

| Consideration | Mitigation |
| --- | --- |
| Cross-workspace alert read | `workspaceId` in every repository query |
| Browser-supplied `notificationId` used for mark-as-read | Server Action resolves `WorkspaceContext` server-side; repository query includes `workspaceId` |
| Alert fabrication via client input | `AlertService.evaluateAlerts` is the only write path; no browser can create alerts directly |
| Notification content exposure | Notification `body` contains client name and percentage; these are workspace-private. Already scoped by `workspaceId` + `userId`. |
| User impersonation via `userId` in notification query | `userId` is derived from `WorkspaceContext` (resolved from Better Auth session); never from request |

---

## 19. Performance Considerations

- `evaluateAlerts` calls `getContractUtilizations` which is already measured (EPIC-105 P105-06 baseline). At MVP scale (50 contracts), this yields ≤ 53 DB operations.
- `findAlertByDeduplicationKey` uses the existing `@@unique([workspaceId, deduplicationKey])` index — single-row lookup.
- `listNotificationsForUser` uses existing `@@index([workspaceId, userId, createdAt])` — efficient.
- `markNotificationRead` uses `updateMany + findFirst` pattern consistent with `resolveAlert`.
- No new indexes required if existing schema is unchanged.
- If PD-106-001 = Option 1 (new field), the `WorkspaceSettings` table is accessed with a primary-key lookup — no index needed.

---

## 20. Phase Breakdown

Phase sequence after product decisions:

```text
P106-00 COMPLETE
    ↓
P106-02 AlertService
    ↓
P106-03 TimeEntry mutation trigger
    ↓
P106-04 /alerts notification center
    ↓
P106-05 Integration + E2E
    ↓
P106-06 Documentation
    ↓
P106-07 Engineering Review
```

---

### P106-00 — Product Decision resolution ✅ COMPLETE

- **Objective:** Obtain Product Owner decisions on PD-106-001, PD-106-002, PD-106-003.
- **Scope:** Documentation only.
- **Acceptance criteria:** All three blocking decisions resolved. ✅
- **Tests:** None.
- **Outcome:** PD-106-001 DEFERRED, PD-106-002 IN-APP ONLY, PD-106-003 ON-WRITE. P106-01 removed. EPIC-106 READY FOR IMPLEMENTATION.

---

### ~~P106-01~~ — Schema migration (REMOVED — PD-106-001 DEFERRED)

P106-01 is removed from the MVP phase breakdown. `monthlyCapacityMinutes` is not added. No migration is required. If PD-106-001 is revisited in a future release, a new epic phase will be defined.

---

### P106-02 — Alert domain and evaluation service ✅ COMPLETE

- **Commit:** `6daf2cd` — `feat(alerts): implement alert evaluation service with deduplication (P106-02)`
- **Objective:** Implement `AlertService` with evaluation, deduplication, resolution logic, and notification creation.
- **Delivered:**
  - `src/application/alerts/alert-service.ts` — `AlertService` factory (357 lines).
  - `src/application/alerts/alert-evaluation-types.ts` — `AlertEvaluationResult` type.
  - `src/application/alerts/alert-dedup-key.ts` — deterministic key builder.
  - `tests/unit/application/alerts/alert-service.test.ts` — 569 lines.
  - `tests/unit/application/alerts/alert-dedup-key.test.ts` — 99 lines.
- **Acceptance criteria validated:**
  - AR-001: alert fires when `utilizationPercentage >= contractWarningPercent`; does not fire below. ✅
  - AR-002: alert fires when `utilizationPercentage >= 100` (or `consumedMinutes >= contractedMinutes`). ✅
  - Null utilization (null contractedMinutes): no alert fired. ✅
  - Active alert not duplicated on re-evaluation. ✅
  - Resolved alert re-creates new alert on re-trigger. ✅
  - `resolveAlert` called when condition drops. ✅
  - Membership guard enforced. ✅
  - AR-003, AR-004 are **not implemented** (PD-106-001 DEFERRED). ✅
- **Dependencies:** P106-00 COMPLETE.

---

### P106-03 — Alert evaluation trigger integration ✅ COMPLETE

- **Commit:** `012f6da` — `feat(alerts): wire AlertService trigger into TimeEntry mutations (P106-03)`
- **Objective:** Wire `AlertService.evaluateAlerts()` into TimeEntry Server Actions (PD-106-003 resolved: on-write).
- **Delivered:**
  - `src/features/time-entries/trigger-alert-evaluation.ts` — non-blocking trigger helper (56 lines).
  - `src/features/time-entries/create-time-entry-action.ts` — trigger wired after successful create.
  - `src/features/time-entries/update-time-entry-action.ts` — trigger wired after successful update.
  - `src/features/time-entries/delete-time-entry-action.ts` — trigger wired after successful delete.
  - `src/features/time-entries/authenticated-time-entry-context.ts` — context updated for alert injection.
  - `src/application/time-entries/delete-time-entry.ts` — minor adjustment.
  - `tests/integration/alerts/time-entry-alert-trigger.test.ts` — 349 lines.
  - `tests/unit/time-entries/trigger-alert-evaluation.test.ts` — 147 lines.
- **Acceptance criteria validated:**
  - Evaluation runs after create, update, and delete TimeEntry mutations. ✅
  - Evaluation failure does not fail the TimeEntry operation (non-blocking `void ... .catch`). ✅
  - Workspace isolation: evaluation uses the request's `WorkspaceContext` (not browser-supplied). ✅
- **Dependencies:** P106-02 COMPLETE.

---

### P106-04 — Notification center UI ✅ COMPLETE

- **Commit:** `95eaede` — `feat(alerts): implement /alerts notification center with mark-as-read (P106-04)`
- **Objective:** Replace the `/alerts` placeholder with a functional RSC notification center.
- **Delivered:**
  - `src/app/(app)/alerts/page.tsx` — RSC, replaces placeholder (38 lines).
  - `src/features/notifications/NotificationList.tsx` — notification list component (41 lines).
  - `src/features/notifications/NotificationCard.tsx` — individual notification card with mark-as-read (96 lines).
  - `src/features/notifications/load-notifications.ts` — server query helper (11 lines).
  - `src/features/notifications/mark-notification-read-action.ts` — Server Action with ownership check (58 lines).
  - `tests/integration/alerts/notification-center.test.ts` — 276 lines.
  - Note: actual module path is `src/features/notifications/` (not `src/features/alerts/` as planned).
- **Acceptance criteria validated:**
  - Notifications listed, newest first. ✅
  - Unread indicator visible. ✅
  - Mark-as-read Server Action works; `readAt` set; UI reflects state. ✅
  - Empty state when no notifications. ✅
  - Authorization: only own workspace + own userId notifications shown. ✅
  - No `use client` on page.tsx. ✅
  - Server-side authorization + ownership check in mark-as-read action. ✅
- **Finding registered:** Unbounded notification list — accepted for MVP / non-blocking (no pagination implemented per scope).
- **Dependencies:** P106-02, P106-03 COMPLETE.

---

### P106-05 — Integration and E2E tests ✅ COMPLETE

- **Commit:** `72d9f1d` — `test(alerts): E2E and integration validation suite (P106-05)`
- **Objective:** Full integration test suite for alert evaluation, workspace isolation, and E2E notification journeys.
- **Delivered:**
  - `tests/e2e/alerts.spec.ts` — Playwright notification journeys (323 lines).
  - `tests/integration/alerts/alert-service-integration.test.ts` — real DB evaluation suite (524 lines).
- **Acceptance criteria validated:**
  - Boundary cases covered (exact threshold, null capacity, deduplication, re-trigger). ✅
  - Workspace isolation verified. ✅
  - E2E: create entries → evaluate → notification visible → mark read. ✅
- **Gate evidence:**
  - Unit: 379/379 PASS
  - Integration: 219/219 PASS
  - P106-05 E2E: 6/6 PASS
  - Full E2E: 56 PASS / 1 FAIL (F-106-P05-001 — PRE-EXISTING / FLAKY — not a P106 regression)
  - Lint: PASS
  - Typecheck: PASS
  - Build: PASS
- **Finding F-106-P05-001:** `auth.spec.ts` — "should register, stay authenticated, and sign out" — 1 failure. Classified PRE-EXISTING / FLAKY. Reproduced at commit `95eaede` (pre-P106-05). Not a P106 regression. Not to be resolved in P106 scope.
- **Dependencies:** P106-04 COMPLETE.

---

### P106-06 — Documentation synchronization ✅ COMPLETE

- **Objective:** Update all documentation to reflect EPIC-106 implementation.
- **Delivered:**
  - `docs/epics/EPIC-106/epic-plan.md` — phase statuses, commits, acceptance criteria, findings, module structure.
  - `README.md` — EPIC-106 status added; alerts implemented.
  - `CHANGELOG.md` — EPIC-106 entries added.
  - `docs/testing-strategy.md` — suite totals updated to 379/219/57 (P106-06 E2E pending); EPIC-106 coverage described.
  - `docs/architecture.md` §5.8, §5.9, §14.2, §19, §20 — implemented markers added.
  - `MASTER_PLAN.md` — verified correct (pre-existing modifications already accurate); not modified.
  - `docs/domain-model.md` — verified correct; not modified.
  - `docs/storage.md` — verified correct (no schema change); not modified.
- **Working tree discrepancy noted:** `docs/epics/EPIC-106/epic-plan.md` was untracked (never committed after P106-00 planning). It is included in the P106-06 commit as the sole untracked EPIC-106 artifact.
- **Tests:** None (documentation only).
- **Dependencies:** P106-05 COMPLETE.

---

### P106-07 — Engineering Review ✅ COMPLETE

- **Commit:** `13a48a0` — `docs(alerts): EPIC-106 engineering review`
- **Objective:** Produce `docs/epics/EPIC-106/engineering-review.md`.
- **Delivered:** `docs/epics/EPIC-106/engineering-review.md` — verdict, per-suite gate evidence, findings, OBD relevance, production-readiness limitations.
- **Verdict:** PASS (initial — F-106-P07-001 blocking, subsequent correction in P106-08)
- **Dependencies:** P106-06 COMPLETE.

---

### P106-08 — Corrective fix: resolveIfActive semantic lookup ✅ COMPLETE

- **Commit:** `47f82ec` — `fix(alerts): resolve re-triggered alerts correctly`
- **Objective:** Fix F-106-P07-001 — `resolveIfActive` used deduplication key lookup instead of semantic lookup, preventing correct resolution of re-triggered alerts.
- **Delivered:** `resolveIfActive` now uses semantic lookup: `workspaceId + contractId + type + periodStart + resolvedAt IS NULL` instead of `deduplicationKey`.
- **Finding resolved:** F-106-P07-001 CLOSED.
- **Dependencies:** P106-07 COMPLETE.

---

### P106-09 — Engineering Review verification ✅ COMPLETE

- **Commit:** `b421e60` — `docs(alerts): close EPIC-106 engineering review`
- **Objective:** Verify P106-08 correction; confirm Engineering Review PASS.
- **Delivered:** `docs/epics/EPIC-106/engineering-review.md` updated — F-106-P07-001 CLOSED; final verdict PASS.
- **Gate evidence:**
  - F-106-P07-001: CLOSED (semantic lookup verified)
  - F-106-P04-001: ACCEPTED — MVP (unbounded list, non-blocking)
  - F-106-P05-001: PRE-EXISTING / FLAKY / ACCEPTED
  - Engineering Review: PASS — 0 blocking findings
- **Dependencies:** P106-08 COMPLETE.

---

### P106-10 — EPIC Closure ✅ COMPLETE

- **Commit:** `docs(alerts): close EPIC-106 and synchronize roadmap`
- **Objective:** Formally close EPIC-106; synchronize MASTER_PLAN, CHANGELOG, README, epic-plan.
- **Delivered:** documentation closure only — no code or test changes.
- **Dependencies:** P106-09 COMPLETE.

---

## 21. Acceptance Criteria

| ID | Criterion |
| --- | --- |
| AC-106-001 | `CONTRACT_WARNING` alert is created when `utilizationPercentage >= contractWarningPercent` |
| AC-106-002 | `CONTRACT_EXCEEDED` alert is created when `consumedMinutes >= contractedMinutes` |
| AC-106-003 | No alert is created for a contract with `contractedMinutes = null` (unlimited) |
| AC-106-004 | No duplicate alert is created while an active alert exists for the same condition and period |
| AC-106-005 | An active alert is resolved when the condition drops below threshold |
| AC-106-006 | A new alert is created when a previously resolved condition re-fires |
| AC-106-007 | `Notification` is created for the workspace member when an alert is created |
| AC-106-008 | `/alerts` lists the user's notifications, newest first |
| AC-106-009 | Mark-as-read sets `readAt` and updates the UI indicator |
| AC-106-010 | Notification from workspace A is not accessible to a member of workspace B |
| AC-106-011 | Alert evaluation uses `WorkspaceSettings.contractWarningPercent` (not a hardcoded constant) |
| AC-106-012 | Alert evaluation period uses `Workspace.timezone` (not server clock timezone) |
| AC-106-013 | Evaluation does not duplicate analytics calculations (delegates to `AnalyticsService`) |
| AC-106-014 | Evaluation failure does not fail the triggering TimeEntry write operation |
| AC-106-015 | All repository queries include `workspaceId` in the WHERE clause |
| AC-106-016 | Unit: 20+ passing; Integration: 20+ passing; E2E: 3+ passing |

---

## 22. Release Gates

| Gate | Requirement |
| --- | --- |
| Lint | 0 errors |
| Typecheck | 0 errors, 0 `any` |
| Unit tests | All pass |
| Integration tests | All pass |
| E2E tests | All pass (or documented environmental exception) |
| Build | `next build` clean |
| Working tree | Clean at engineering review commit |
| Workspace isolation | Integration-proven |
| Deduplication | Unit and integration proven |
| Null-capacity safety | Unit-proven |
| No analytics duplication | Code review verified |

---

## 23. Findings / Dependencies

### EPIC-106 findings

| ID | Description | Severity | Status |
| --- | --- | --- | --- |
| F-106-P07-001 | `resolveIfActive` used deduplication key instead of semantic lookup — re-triggered alerts not correctly resolved | BLOCKING | CLOSED — fixed in P106-08 (commit `47f82ec`); semantic lookup verified in P106-09 |
| F-106-P05-001 | `auth.spec.ts` — "should register, stay authenticated, and sign out" — 1 E2E failure | PRE-EXISTING / FLAKY | ACCEPTED — not a P106 regression; reproduced at commit `95eaede` (pre-P106-05) |
| F-106-P04-001 | Unbounded notification list (no pagination) | NON-BLOCKING | ACCEPTED — MVP; pagination deliberately out of scope |

### Inherited open findings (not owned by EPIC-106)

| ID | Description | Severity | Action |
| --- | --- | --- | --- |
| F-105-008 | Non-blocking comment nit in EPIC-105 | NON-BLOCKING | Carry forward; EPIC-106 does not own |
| F-105-013 | Latent year/now inconsistency | LOW | Carry forward; EPIC-106 does not own |
| F-104-006 | Clock-sensitive E2E failures (2 tests) | ENVIRONMENTAL | Carry forward; not owned by EPIC-106 |
| F-104-006 | Clock-sensitive integration failure (analytics-isolation.test.ts, 1 test) | ENVIRONMENTAL | Carry forward; not owned by EPIC-106 |
| P102-F-001 | Contract commercial-term mutability affects historical utilization denominators | OPEN | Carry forward; alert evaluation reads live `contractedMinutes` — same limitation as analytics |
| OBD-009 | Workspace roles / permissions | OPEN | Fan-out to all members deferred until OBD-009 resolved |
| OBD-012 | Rollover / expiry semantics | OPEN | Not in scope; alert uses same no-rollover pro-rata as EPIC-105 |

### Dependencies on resolved capabilities

| Capability | Epic | Status |
| --- | --- | --- |
| Alert/Notification schema | EPIC-002 | COMPLETE |
| Alert/Notification repositories | Pre-existing (already in `create-repositories.ts`) | COMPLETE |
| WorkspaceSettings with thresholds | Pre-existing | COMPLETE |
| AnalyticsService.getContractUtilizations | EPIC-104/105 | COMPLETE |
| getCurrentMonthPeriod(timezone) | EPIC-105 P105-03 | COMPLETE |
| OBD-006 threshold decision | Product Owner | RESOLVED (80%) |

---

## 24. Open Questions

| ID | Question | Impact |
| --- | --- | --- |
| OQ-106-001 | Should `CONTRACT_EXCEEDED` (AR-002) fire simultaneously with `CONTRACT_WARNING` (AR-001) when utilization ≥ 100%? | Both alerts would exist for the same contract at the same time. Default: yes, they are independent. |
| OQ-106-002 | Should the sidebar badge count unread notifications or active (unresolved) alerts? | Default: unread notifications (mirrors read/unread state). |
| OQ-106-003 | Should evaluation be triggered on the reports page load as well as dashboard? | Default: follow PD-106-003 decision. |
| OQ-106-004 | Should there be a "dismiss all" action in the notification center? | Default: not in MVP. Individual mark-as-read only. |
| OQ-106-005 | When a workspace has multiple members (future OBD-009 scenario): should all members receive notifications, or only the member whose action triggered evaluation? | Default: only the requesting member in MVP. |

---

## 25. Definition of Done

EPIC-106 is DONE when:

- [x] All blocking Product Decisions resolved: PD-106-001 DEFERRED, PD-106-002 IN-APP ONLY, PD-106-003 ON-WRITE.
- [x] `AlertService` implemented with AR-001 and AR-002 (AR-003/AR-004 deferred per PD-106-001). — commit `6daf2cd`
- [x] Alert deduplication proven by unit and integration tests. — commit `6daf2cd`, `72d9f1d`
- [x] Alert resolution proven by unit and integration tests. — commit `6daf2cd`, `72d9f1d`
- [x] Notification creation and mark-as-read proven by tests. — commit `95eaede`, `72d9f1d`
- [x] `/alerts` page functional RSC with notification list. — commit `95eaede`
- [x] Workspace isolation integration-proven. — commit `72d9f1d`
- [x] All gates pass (lint, typecheck, unit, integration, E2E, build). — 379/379 unit, 219/219 integration, 6/6 P106-05 E2E, build PASS
- [x] `docs/epics/EPIC-106/engineering-review.md` produced. — commit `13a48a0`; final verdict commit `b421e60`
- [x] `MASTER_PLAN.md` updated to reflect EPIC-106 COMPLETE. — P106-10
- [x] No analytics calculation duplicated. — `AlertService` delegates to `AnalyticsService`
- [x] No `use client` on RSC pages. — verified `/alerts/page.tsx`

---

## 26. Documentation Changes (planning phase)

The following stale references require updates independent of EPIC-106 implementation.

### MASTER_PLAN.md stale items (to be updated as part of this planning commit)

1. **§4 Current Project Status** — `NEXT: R1-E05 Engineering Review (P105-08)` → should read `NEXT: R1-E06 Alerts & Notifications (EPIC-106)`.
2. **Line 168** — `Reporting: IMPLEMENTED — see docs/epics/EPIC-105/engineering-review.md (pending P105-08)` → remove `(pending P105-08)` since Engineering Review is complete.
3. **`next:` YAML block** (lines 1994–1999) — update `epic: EPIC-105`, `phase: engineering-review` → `epic: EPIC-106`, `phase: planning`.
4. **Lines 192–193** — `Engineering status: COMPLETE (P105-08 Engineering Review pending)` → `Engineering status: COMPLETE`.

### docs/epics/EPIC-105/epic-plan.md stale items

1. **Status header line 27** — `P105-08: PENDING — Engineering Review` → `P105-08: COMPLETE — see docs/epics/EPIC-105/engineering-review.md`.
2. **Document Status block** (lines 1761–1769) — `ENGINEERING REVIEW: NOT CREATED` → `ENGINEERING REVIEW: COMPLETE — docs/epics/EPIC-105/engineering-review.md`.

These updates are documentation-only and do not affect implementation. They should be included in the planning commit for EPIC-106.

---

## 27. Approval Gate

| Check | Status |
| --- | --- |
| Scope consistent with `MASTER_PLAN.md` §16 | YES — all four alert types and in-app notification center covered |
| Non-goals explicit | YES — §4, email/Slack/background jobs explicitly excluded |
| Blocking Product Decisions resolved | YES — PD-106-001 DEFERRED, PD-106-002 IN-APP ONLY, PD-106-003 ON-WRITE |
| Existing capabilities identified and reused | YES — schema, repositories, analytics service all pre-existing |
| No analytics duplication | YES — `AlertService` delegates to `AnalyticsService` |
| Workspace isolation explicit | YES — §12, SI-106-001 |
| Alert/notification semantics distinct | YES — §7, §8, §9 |
| Capacity warning semantics defined | YES — §10; contract utilization in scope; monthly capacity deferred PD-106-001 |
| Deduplication semantics defined | YES — §8.1, §8.2, §8.3 |
| Testing strategy concrete | YES — §16, per-behaviour, per-level |
| Phase breakdown implementable | YES — P106-00 COMPLETE; P106-01 removed; P106-02 through P106-07 ready |
| OBD-006 incorporated | YES — 80% threshold from WorkspaceSettings, OBD-006 resolved |
| Inherited findings not re-opened | YES — carried forward with no action |
| No scope creep | YES — notification platform, email, background jobs excluded |

```text
PLANNING STATUS: COMPLETE — ALL PRODUCT DECISIONS RESOLVED
IMPLEMENTATION STATUS: READY — P106-02 may begin immediately
```

Implementation begins with P106-02 (AlertService). No migration required (P106-01 removed).

---

## Document Status

```text
EPIC-106 — Alerts & Notifications
STATUS: COMPLETE / CLOSED
PLANNING: COMPLETE
PRODUCT DECISIONS: RESOLVED
  PD-106-001: DEFERRED — CAPACITY_WARNING/CAPACITY_EXCEEDED out of MVP scope
  PD-106-002: IN-APP ONLY — /alerts notification center, no external channels
  PD-106-003: ON-WRITE — TimeEntry mutations (create, update, delete)
P106-00: COMPLETE
P106-01: REMOVED (capacity model deferred)
P106-02: COMPLETE — commit 6daf2cd
P106-03: COMPLETE — commit 012f6da
P106-04: COMPLETE — commit 95eaede
P106-05: COMPLETE — commit 72d9f1d
P106-06: COMPLETE — documentation sync
P106-07: COMPLETE — commit 13a48a0
P106-08: COMPLETE — commit 47f82ec
P106-09: COMPLETE — commit b421e60
P106-10: COMPLETE — EPIC CLOSURE
FINDINGS:
  F-106-P07-001: CLOSED (fixed P106-08)
  F-106-P04-001: ACCEPTED — MVP
  F-106-P05-001: PRE-EXISTING / FLAKY / ACCEPTED
BLOCKING FINDINGS: 0
OPEN DEPENDENCIES: OBD-009 (fan-out), OBD-012 (no rollover, carries from EPIC-105)
IMPLEMENTATION: COMPLETE
ENGINEERING REVIEW: PASS — docs/epics/EPIC-106/engineering-review.md
NEXT EPIC: MVP Integration Epic (§17 MASTER_PLAN.md)
```
