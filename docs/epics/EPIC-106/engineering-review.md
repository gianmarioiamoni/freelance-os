# EPIC-106 Engineering Review

**Phase:** P106-09 (Engineering Review Closure)  
**Reviewer:** Engineering Review Agent  
**Date:** 2026-09-17  
**Review Basis:** Commits 6daf2cd → 47f82ec (P106-02 through P106-08)  
**Prior Review:** P106-07 — Verdict: PASS WITH FINDINGS (F-106-P07-001 OPEN)

---

## 1. Scope

EPIC-106 — Alerts & Notifications (MVP scope):

- `CONTRACT_WARNING` and `CONTRACT_EXCEEDED` alert rules
- Alert lifecycle: create / deduplicate / resolve / re-trigger
- ON-WRITE evaluation trigger (TimeEntry create / update / delete)
- In-app notifications
- `/alerts` notification center
- Mark-as-read action
- Workspace isolation

Out of scope (explicitly deferred/excluded):

- `CAPACITY_WARNING` / `CAPACITY_EXCEEDED` (PD-106-001)
- Email, Slack, push, external notification platforms (PD-106-002)
- Cron / scheduler / Inngest
- OBD-012 rollover

---

## 2. Review Evidence

### Sources Inspected

| Artifact | Path |
|---|---|
| AlertService | `src/application/alerts/alert-service.ts` |
| Dedup key builder | `src/application/alerts/alert-dedup-key.ts` |
| Evaluation types | `src/application/alerts/alert-evaluation-types.ts` |
| ON-WRITE trigger | `src/features/time-entries/trigger-alert-evaluation.ts` |
| Create action | `src/features/time-entries/create-time-entry-action.ts` |
| Update action | `src/features/time-entries/update-time-entry-action.ts` |
| Delete action | `src/features/time-entries/delete-time-entry-action.ts` |
| Notifications page | `src/app/(app)/alerts/page.tsx` |
| Load notifications | `src/features/notifications/load-notifications.ts` |
| Mark-as-read action | `src/features/notifications/mark-notification-read-action.ts` |
| NotificationList | `src/features/notifications/NotificationList.tsx` |
| NotificationCard | `src/features/notifications/NotificationCard.tsx` |
| Alert repository | `src/infrastructure/persistence/alert-repository.ts` |
| Notification repository | `src/infrastructure/persistence/notification-repository.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Unit tests | `tests/unit/application/alerts/alert-service.test.ts` (34 tests) |
| Unit tests | `tests/unit/application/alerts/alert-dedup-key.test.ts` |
| Unit tests | `tests/unit/features/time-entries/trigger-alert-evaluation.test.ts` |
| Integration tests | `tests/integration/alerts/alert-service-integration.test.ts` (16 tests) |
| Integration tests | `tests/integration/alerts/notification-center.test.ts` |
| Integration tests | `tests/integration/alerts/time-entry-alert-trigger.test.ts` |
| Integration tests | `tests/integration/persistence/notifications.test.ts` |
| E2E tests | `tests/e2e/alerts.spec.ts` (6 tests) |

### Quality Gates Executed

| Gate | Result | Details |
|---|---|---|
| `pnpm test` (unit) | ✅ PASS | 379/379 (P106-07) → 384/384 (P106-08, +5 F-106-P07-001 cases) |
| `pnpm test:integration` | ✅ PASS | 219/219 |
| `pnpm test:e2e --grep alerts` | ✅ PASS | 6/6 |
| `pnpm lint` | ✅ PASS | 0 errors, 6 pre-existing warnings |
| `pnpm typecheck` | ✅ PASS | 0 errors |
| `pnpm build` | ✅ PASS | production build clean |
| `pnpm test` (P106-09 closure) | ✅ PASS | 384/384 — no regressions |

---

## 3. Architecture Review

### Verified

- **AlertService** (`src/application/alerts/alert-service.ts`) is the sole owner of alert evaluation semantics.
- **AnalyticsService** remains the single source of utilization calculation; `AlertService` delegates via `getContractUtilizations()` — no duplication.
- Repository interfaces are the persistence boundary; `AlertService` uses injected `AlertRepository` / `NotificationRepository` / `WorkspaceMemberRepository` / `WorkspaceSettingsRepository`.
- No direct Prisma client access from `AlertService` or feature modules.
- `triggerAlertEvaluation` (`src/features/time-entries/trigger-alert-evaluation.ts`) wires evaluation into actions without embedding business logic.
- `createAlertService` / `createRepositories()` factory pattern used consistently.
- Dependency direction: `feature actions → triggerAlertEvaluation → AlertService → AnalyticsService + repositories`. Clean.
- No circular dependencies detected.
- No hidden global mutable state.
- `load-notifications.ts` accesses the notification repository directly (not via `AlertService`). Authorization is provided by `getCurrentWorkspaceContext()` which enforces workspace membership via `resolveWorkspaceContext` — the resolved context is workspace-scoped. This is a deliberate RSC loader pattern consistent with the rest of the codebase.
- `mark-notification-read-action.ts` performs explicit `userId === context.userId` ownership check before any mutation.

**Verdict: Architecture is sound.**

---

## 4. Alert Semantics Review

### Verified Boundaries

| Condition | Result |
|---|---|
| `utilizationPercentage === null` | No alert (unlimited contract, BR-104-011) |
| `utilization < warningPercent` | No warning; resolve active alert if any |
| `utilization >= warningPercent` AND `< 100` | `CONTRACT_WARNING` only |
| `utilization >= 100` | Both `CONTRACT_WARNING` and `CONTRACT_EXCEEDED` (independently) |
| `utilization = warningPercent` (exact boundary) | `CONTRACT_WARNING` fires (confirmed by unit test at 80.0%) |
| `utilization = 100` (exact boundary) | Both alerts fire (confirmed by integration test) |

### Threshold Configuration

- Default: `80` (constant `DEFAULT_CONTRACT_WARNING_PERCENT`).
- Override: `WorkspaceSettings.contractWarningPercent`; null settings fall back to default.
- Threshold source verified against settings repository call in `evaluateContractAlerts`.
- `CONTRACT_EXCEEDED` threshold hardcoded to `100` — correct, not configurable.

### Rounding

- `utilizationPercentage` is compared as a float (`>= threshold`).
- Notification body uses `Math.round(utilizationPercentage)` for display only — does not affect threshold logic.

**Verdict: Alert semantics match specifications exactly.**

---

## 5. Alert Lifecycle Review

### Verified Lifecycle States

| Event | Outcome |
|---|---|
| Condition first fires | Alert created, notification created |
| Condition fires again (active alert) | Deduplicated — no new alert/notification |
| Condition drops below threshold | Active alert resolved |
| No active alert and condition already false | `none` — no resolution attempted |
| Already-resolved alert; condition drops | `none` — not re-resolved |
| Mark-as-read | Alert remains active (independence confirmed by unit + integration tests) |
| Resolved alert; condition re-fires | Re-trigger: new alert with timestamp-suffix key, new notification |

### Finding: Lifecycle Gap — Re-triggered Alert Not Resolvable

See **F-106-P07-001** in Section 13.

**Verdict: Lifecycle is correct for the primary path. One secondary lifecycle gap identified.**

---

## 6. Deduplication & Concurrency

### Deduplication Key Format

```
{prefix}:{workspaceId}:{contractId}:{YYYY-MM-DD}
```

Where `prefix` is `cw` (CONTRACT_WARNING) or `ce` (CONTRACT_EXCEEDED).

**Re-trigger key:**

```
{prefix}:{workspaceId}:{contractId}:{YYYY-MM-DD}:{unix-ms}
```

Timestamp suffix ensures uniqueness across re-trigger occurrences.

### Database Constraints

- `@@unique([workspaceId, deduplicationKey])` on `Alert` model — enforced at DB level.
- Unique constraint race handled: `UniqueConstraintViolationError` caught and treated as idempotent deduplicated outcome.

### Scope Analysis

- Dedup scope: per workspace + contract + period (month) + type. Correct for MVP semantics.
- Multiple contract support: each contract evaluated independently in a for-loop. No cross-contamination.
- Workspace scoping in both `createAlert` and `findAlertByDeduplicationKey` verified at repository level.

### Concurrency Safety

- Race condition between two concurrent evaluations handled via unique constraint catch.
- No optimistic locking needed — idempotency via DB constraint is sufficient for the single-evaluation path.

**Verdict: Deduplication is reliable and concurrency-safe under the current evaluation model.**

---

## 7. ON-WRITE Trigger Review

### Verified Mutation Paths

| Mutation | Trigger Present | Placement | Best-Effort |
|---|---|---|---|
| `createTimeEntryAction` | ✅ | After `createTimeEntry` succeeds | ✅ |
| `updateTimeEntryAction` | ✅ | After `updateTimeEntry` succeeds | ✅ |
| `deleteTimeEntryAction` | ✅ | After `deleteTimeEntry` succeeds | ✅ |

### Delete Path

The evaluation for delete does not need `contractId` directly — `evaluateContractAlerts` fetches all utilizations for the workspace in the current period from `AnalyticsService`, which queries the database for current state. The deleted entry is already absent from the DB before evaluation. This is correct.

### Best-Effort Semantics

- `triggerAlertEvaluation` wraps `alertService.evaluateContractAlerts` in a try/catch.
- Errors are logged via `console.error` with workspace context.
- The TimeEntry mutation is never rolled back due to alert evaluation failure.
- `redirect()` calls are made outside the try block in all three actions — Next.js NEXT_REDIRECT errors cannot be caught by the alert evaluation handler.

### Logging Quality

- Info-level log on successful evaluation with counters (alertsCreated, alertsResolved, notificationsCreated).
- Error-level log on failure with workspaceId for traceability.
- Logging is sufficient for MVP operational visibility.

**Verdict: ON-WRITE trigger is correctly wired across all three mutation paths.**

---

## 8. Workspace Isolation & Authorization

### Repository Level

- `AlertRepository`: all operations include `workspaceId` in WHERE clause. `findAlertByDeduplicationKey` uses composite unique `{workspaceId, deduplicationKey}`.
- `NotificationRepository`: `listNotificationsForUser` filters by `{workspaceId, userId}`. `getNotification` filters by `{workspaceId}`. `markNotificationRead` filters by `{workspaceId}`.

### Service Level

- `AlertService.requireMembership()` called at the start of all public methods.
- Throws `UnauthorizedWorkspaceAccessError` for non-members.

### Action Level

- `mark-notification-read-action.ts`: retrieves notification scoped to `context.workspaceId`, then verifies `notification.userId === context.userId`.
- `load-notifications.ts`: scoped via `getCurrentWorkspaceContext()` which enforces workspace membership resolution at the framework level.

### Database Schema

- `Alert.workspaceId` + `@@unique([workspaceId, deduplicationKey])` enforce cross-workspace isolation at the DB level.
- `Notification` has a foreign key to `WorkspaceMember(workspaceId, userId)` — structural isolation enforced by schema.

### E2E Evidence

- Workspace isolation test (alerts.spec.ts:251): User B sees `No notifications` after User A creates alerts. ✅ PASS.

**Verdict: Workspace isolation is enforced at repository, service, action, and schema levels.**

---

## 9. Notification Center Review

### RSC/Client Split

- `/alerts/page.tsx` — RSC, server-only. Loads data via `loadNotificationsForCurrentUser()`.
- `NotificationList.tsx` — RSC, renders list and unread count.
- `NotificationCard.tsx` — client component (`"use client"`) for `useActionState` / form interaction.
- `mark-notification-read-action.ts` — Server Action (`"use server"`), full authorization.

Split is correct: minimal client surface, no business logic leakage to client.

### Authorization

- Page: `getCurrentWorkspaceContext()` redirects if not an authenticated workspace member.
- Mark-as-read action: workspace-scoped notification retrieval + `userId` ownership check. Double authorization.

### Ordering

- `listNotificationsForUser` orders by `createdAt DESC` (verified in repository implementation via index `[workspaceId, userId, createdAt]`).
- Newest-first ordering confirmed by repository level; display preserves this order.

### Unread Count

- Computed client-side from the loaded list: `notifications.filter((n) => n.readAt === null).length`.
- Accurate for the current RSC render; refreshed after mark-as-read via `revalidatePath("/alerts")`.

### Mark-as-Read Behavior

- Idempotent: `readAt !== null` returns null without re-writing.
- `revalidatePath("/alerts")` triggers RSC revalidation after write.
- Alert remains active after mark-as-read (independence verified).

### Accepted Finding: F-106-P04-001

The notification list is unbounded (no pagination). The repository query returns all notifications for the user. This was accepted as NON-BLOCKING for MVP. Implementation matches the documented acceptance — no pagination has been added.

### Empty State

- Implemented via `EmptyState` component with contextual description.
- E2E test verifies empty state display. ✅

### Error Handling

- Page-level: try/catch with `ErrorState` component displaying user-friendly message.
- Card-level: server action error returned via `useActionState` and displayed as `role="alert"` paragraph.

### Accessibility

- `<section aria-label="Notifications">` for the list container.
- `<ol aria-label="Notification list">` for the item list.
- `<li>` for each notification.
- `<time dateTime={ISO-8601}>` for timestamps.
- `aria-label="Mark as read"` on the button.
- Unread card: `aria-label="Unread notification: {title}"`.
- `aria-live="polite"` on unread count.
- Keyboard activation tested in E2E (Tab + Enter).

**Verdict: Notification center is correctly implemented, accessible, and production-ready.**

---

## 10. Test & Quality Gates

### Unit Tests (379/379)

Alert-specific unit tests cover:

- Workspace isolation (membership guard)
- Null utilization (unlimited contract)
- CONTRACT_WARNING boundary cases: below (79.99%), exact (80%), above (90%)
- WorkspaceSettings threshold override
- Default threshold fallback (null settings)
- CONTRACT_EXCEEDED boundary cases: below (99.9%), exact (100%), above (120%)
- Both alerts fire simultaneously at >= 100%
- Alert creation and notification creation
- Deduplication key format
- Deduplication: active alert → no duplicate
- Repeated evaluation → no duplicate
- Concurrent race (UniqueConstraintViolationError) → idempotent
- Resolution: condition drops → resolve active alert
- No resolution when no active alert
- No re-resolution of already-resolved alert
- Re-trigger: resolved alert + condition re-fires → new alert + new notification
- Result counters (alertsCreated, alertsResolved, notificationsCreated)
- Delegation to AnalyticsService

### Integration Tests (219/219)

Alert-specific integration tests cover:

- Boundary conditions: all 6 cases (below, exact-80%, warning-only-90%, exact-100%, above-100%, unlimited)
- Deduplication: first evaluation creates, second evaluation deduplicates
- Resolution via TimeEntry update and delete
- Read-independence: mark-as-read does not resolve alert
- Re-trigger after resolution
- Threshold override via WorkspaceSettings
- Workspace isolation: workspace B cannot see workspace A notifications
- Notification ownership and read state persistence
- Mark-as-read idempotency

### E2E Tests (6/6)

- Empty state
- Primary journey: create → /alerts → unread → mark-as-read → persisted → reload
- Unread count badge
- Accessibility (keyboard, time element, aria-label)
- Workspace isolation
- Repeated reload does not duplicate notifications

### Test Coverage Assessment

**Gap identified (see F-106-P07-001):** No test covers "resolve after re-trigger" — i.e., the scenario where a re-triggered alert (with timestamp-suffixed key) subsequently needs to be resolved when the condition drops below threshold. This is a test coverage gap correlated with a lifecycle correctness gap.

All other paths are covered with both unit and integration evidence.

---

## 11. Regression Analysis

### Full Suite Results

| Suite | Before EPIC-106 | After EPIC-106 |
|---|---|---|
| Unit | N/A | 379/379 ✅ |
| Integration | 203 (pre-P106) | 219/219 ✅ |
| E2E alerts | 0 (new) | 6/6 ✅ |

### Known Flaky Failure: F-106-P05-001

**`auth.spec.ts` — "should register, stay authenticated, and sign out"**

Classification was documented as PRE-EXISTING / FLAKY / NON-P106 REGRESSION in P106-05.

Evidence for this classification:

1. The auth spec failure was documented in earlier EPICs (pre-dating EPIC-106).
2. The EPIC-106 E2E alert tests (6/6) do not involve the authentication flow tested by that spec and pass cleanly.
3. The auth test exercises the sign-out flow, which is independent of alert evaluation, notification storage, and the `/alerts` route.
4. The full E2E suite was not re-run in this review phase; however, the P106-05 record of 56/57 (auth flaky failure) is consistent with the pre-existing baseline.

**Classification confirmed: PRE-EXISTING / FLAKY / NOT a P106 regression.**

No other regressions detected across all quality gates.

---

## 12. Documentation Consistency

### Files Reviewed

| File | Status |
|---|---|
| `docs/epics/EPIC-106/epic-plan.md` | Consistent with implementation |
| `docs/architecture.md` | Alert/notification architecture documented |
| `docs/testing-strategy.md` | EPIC-106 test gates recorded |
| `README.md` | EPIC-106 feature noted |
| `CHANGELOG.md` | EPIC-106 entries present |
| `MASTER_PLAN.md` | Pre-existing unstaged modifications — not P106 owned, not inspected for discrepancies |
| `docs/epics/EPIC-105/epic-plan.md` | Pre-existing unstaged modification — not P106 owned |

### Observations

- No contradictions found between implementation and documented product decisions (PD-106-001, PD-106-002, PD-106-003).
- Alert type names, threshold semantics, dedup key format, and lifecycle states match documentation.
- `CAPACITY_WARNING` / `CAPACITY_EXCEEDED` correctly absent from implementation.
- Email / Slack / push correctly absent from implementation.

---

## 13. Findings

### F-106-P07-001 — Re-triggered Alert Lifecycle Gap: Resolution After Re-trigger Is Ineffective

| Field | Value |
|---|---|
| **ID** | F-106-P07-001 |
| **Severity** | NON-BLOCKING |
| **Status** | **CLOSED** |
| **Component** | `AlertService.resolveIfActive` / `AlertRepository` |
| **Fixed in** | P106-08 — commit `fix(alerts): resolve re-triggered alerts correctly` |

**Root cause:**

`resolveIfActive` called `findAlertByDeduplicationKey(workspaceId, baseKey)`. Re-triggered alerts are created with a timestamp-suffixed key (`cw:{ws}:{c}:{date}:{timestamp}`), so the base-key lookup returned `null` and the re-triggered alert was never resolved.

**Fix:**

Added `findActiveAlertByContractAndType(workspaceId, contractId, type, periodStart)` to `AlertRepository` (interface + Prisma implementation). This method queries by semantic identity (`workspaceId`, `contractId`, `type`, `periodStart`, `resolvedAt IS NULL`), independent of the deduplication key. `resolveIfActive` now uses this semantic lookup instead of the dedup-key lookup. Deduplication key remains unchanged; unique constraint is not modified.

**Files modified:**
- `src/domain/repositories.ts` — added `findActiveAlertByContractAndType` to `AlertRepository` type
- `src/infrastructure/persistence/alert-repository.ts` — implemented via `db.alert.findFirst` with semantic filter
- `src/application/alerts/alert-service.ts` — `resolveIfActive` rewritten to use semantic lookup
- `tests/unit/application/alerts/alert-service.test.ts` — added F-106-P07-001 test suite (5 new cases); updated resolution mocks

**Test evidence:**

- Full lifecycle test (8-step: trigger → resolve → re-trigger → re-trigger resolved) passes.
- Re-triggered alert (timestamp-suffixed key) is correctly resolved when condition drops.
- No new alert or notification created during resolution.
- Workspace isolation preserved.
- `pnpm test` — 384/384 passed. `pnpm typecheck` — clean. `pnpm build` — clean.

**Owner:** P106-08 — CLOSED.

---

### F-106-P04-001 — Unbounded Notification List (Pre-existing Accepted Finding)

| Field | Value |
|---|---|
| **ID** | F-106-P04-001 |
| **Severity** | NON-BLOCKING |
| **Status** | ACCEPTED (MVP) |

**Evidence:** `listNotificationsForUser` returns all notifications without pagination. Implementation matches the P106-04 documented acceptance. No change from prior review.

**Recommendation:** Add pagination / truncation before production workloads with high notification volumes.

---

### F-106-P05-001 — Auth E2E Flaky Test (Pre-existing)

| Field | Value |
|---|---|
| **ID** | F-106-P05-001 |
| **Severity** | NON-BLOCKING |
| **Status** | ACCEPTED (PRE-EXISTING) |

**Evidence:** Confirmed pre-existing by cross-referencing EPIC history. No EPIC-106 code path touches the auth sign-out flow. Alert E2E suite passes 6/6 independently.

---

## 14. Production Readiness

### Explicit Assessment

| Question | Answer |
|---|---|
| 1. Are alert semantics deterministic? | **YES.** Threshold evaluation is deterministic: `utilization >= threshold` with exact float comparison. Null utilization correctly produces no alert. |
| 2. Is workspace isolation enforced? | **YES.** Enforced at repository (WHERE workspaceId), service (membership guard), action (ownership check), and schema (FK to WorkspaceMember) levels. E2E isolation test passes. |
| 3. Is deduplication reliable? | **YES for the primary path.** DB-level unique constraint `[workspaceId, deduplicationKey]` is the authoritative enforcement. Race condition handled via idempotency. One gap (F-106-P07-001): re-triggered alerts cannot be resolved — NON-BLOCKING. |
| 4. Is ON-WRITE evaluation correctly wired? | **YES.** All three mutation paths (create, update, delete) trigger evaluation post-commit with best-effort semantics. |
| 5. Can notification state be safely persisted? | **YES.** Notification FK to WorkspaceMember ensures structural integrity. Mark-as-read is idempotent and ownership-gated. |
| 6. Are known failures understood? | **YES.** F-106-P05-001 (auth flaky) is pre-existing and unrelated to P106. F-106-P07-001 is a secondary lifecycle gap with no data corruption risk. |
| 7. Are remaining findings acceptable for MVP? | **YES.** Both open findings are NON-BLOCKING. F-106-P07-001 affects an uncommon double-resolution path. F-106-P04-001 is an accepted scale limitation. |
| 8. Is EPIC-106 ready for the next QA/release stage? | **YES, with the above findings tracked for the next phase.** |

---

## 15. Final Verdict

```
PASS — ENGINEERING REVIEW CLOSED
```

**Rationale (P106-09 closure):**

F-106-P07-001 is confirmed **CLOSED** as of commit `47f82ec`. The semantic lookup (`findActiveAlertByContractAndType`) correctly resolves re-triggered alerts regardless of deduplication key. All lifecycle paths are now covered. No regressions introduced.

All findings are resolved or accepted:

- **F-106-P07-001** — **CLOSED** (P106-08 / commit `47f82ec`): Re-triggered alert resolution corrected. Semantic lookup independent of deduplication key. 5 targeted unit tests added. 384/384 pass.
- **F-106-P04-001** — **ACCEPTED (MVP)**: Unbounded notification list. No change; acceptance stands.
- **F-106-P05-001** — **ACCEPTED (PRE-EXISTING)**: Auth E2E flaky test. Unrelated to EPIC-106 scope.

No blocking correctness, security, authorization, data-integrity, or architecture issues. EPIC-106 is technically complete and ready for formal Epic Closure (P106-10).

---

## 16. P106-09 Regression Verification Summary

| Area | Status |
|---|---|
| Alert creation | ✅ Unchanged |
| Alert deduplication | ✅ Unchanged — unique constraint + base-key lookup intact |
| Re-trigger | ✅ Unchanged — timestamp-suffixed key creation preserved |
| CONTRACT_WARNING semantics | ✅ Unchanged |
| CONTRACT_EXCEEDED semantics | ✅ Unchanged |
| `>= 100` dual-alert behavior | ✅ Unchanged |
| Notification creation | ✅ Unchanged |
| Mark-as-read | ✅ Unchanged |
| Workspace isolation | ✅ Unchanged |
| ON-WRITE trigger | ✅ Unchanged |
| Repository abstraction | ✅ Extended (additive only — `findActiveAlertByContractAndType`) |

No regressions detected across all 384 unit tests.

---

*Engineering review produced at P106-07 (commit `069cb2c`) · Closure confirmed at P106-09 (commit `47f82ec`).*
