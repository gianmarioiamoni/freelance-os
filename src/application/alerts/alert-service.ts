// src/application/alerts/alert-service.ts
import type { AnalyticsPeriod, ContractUtilization } from "@/domain/analytics-types";
import { UniqueConstraintViolationError } from "@/domain/persistence-errors";
import type { AlertRecord, NotificationRecord } from "@/domain/persistence-types";
import type {
  AlertRepository,
  NotificationRepository,
  WorkspaceMemberRepository,
  WorkspaceSettingsRepository,
} from "@/domain/repositories";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { getCurrentMonthPeriod } from "@/lib/analytics-periods";
import {
  buildContractAlertDedupKey,
  buildRetriggerDedupKey,
} from "@/application/alerts/alert-dedup-key";
import type {
  AlertConditionOutcome,
  AlertEvaluationResult,
  ContractAlertEvaluationResult,
} from "@/application/alerts/alert-evaluation-types";

const DEFAULT_CONTRACT_WARNING_PERCENT = 80;

/**
 * AlertService — application service for alert evaluation, deduplication,
 * resolution, re-trigger, and notification creation.
 *
 * Responsibilities (P106-02):
 * - Workspace membership guard (matches AnalyticsService pattern).
 * - Delegate contract utilization calculation to AnalyticsService (no duplication).
 * - Evaluate AR-001 (CONTRACT_WARNING) and AR-002 (CONTRACT_EXCEEDED) per contract.
 * - Manage alert lifecycle: create / deduplicate / resolve / re-trigger.
 * - Create in-app notifications for workspace member on alert creation.
 *
 * Out of scope for this service:
 * - AR-003, AR-004 (CAPACITY_WARNING / CAPACITY_EXCEEDED) — DEFERRED PD-106-001.
 * - Email, Slack, push delivery — PD-106-002 resolved: in-app only.
 * - TimeEntry trigger wiring — P106-03.
 * - UI — P106-04.
 */
export class AlertService {
  constructor(
    private readonly alerts: AlertRepository,
    private readonly notifications: NotificationRepository,
    private readonly members: WorkspaceMemberRepository,
    private readonly settings: WorkspaceSettingsRepository,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Membership guard
  // ---------------------------------------------------------------------------

  private async requireMembership(context: WorkspaceContext): Promise<void> {
    const membership = await this.members.getMember(
      context.workspaceId,
      context.userId,
    );
    if (!membership) {
      throw new UnauthorizedWorkspaceAccessError();
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Evaluates CONTRACT_WARNING and CONTRACT_EXCEEDED alert rules for all contracts
   * in the current reporting period.
   *
   * Delegates utilization calculation to AnalyticsService (no duplication).
   * Applies workspace membership guard before any read or write.
   */
  async evaluateContractAlerts(
    context: WorkspaceContext,
  ): Promise<AlertEvaluationResult> {
    await this.requireMembership(context);

    const period = getCurrentMonthPeriod(context.timezone);
    const [utilizations, workspaceSettings] = await Promise.all([
      this.analyticsService.getContractUtilizations(context, period),
      this.settings.getSettings(context.workspaceId),
    ]);

    const warningPercent =
      workspaceSettings?.contractWarningPercent ??
      DEFAULT_CONTRACT_WARNING_PERCENT;

    let alertsCreated = 0;
    let alertsResolved = 0;
    let notificationsCreated = 0;
    const contractResults: ContractAlertEvaluationResult[] = [];

    for (const utilization of utilizations) {
      const warningOutcome = await this.evaluateContractRule(
        context,
        utilization,
        period,
        "CONTRACT_WARNING",
        warningPercent,
      );
      const exceededOutcome = await this.evaluateContractRule(
        context,
        utilization,
        period,
        "CONTRACT_EXCEEDED",
        100,
      );

      if (warningOutcome.action === "created") alertsCreated++;
      if (warningOutcome.action === "resolved") alertsResolved++;
      if (warningOutcome.action === "created") notificationsCreated++;

      if (exceededOutcome.action === "created") alertsCreated++;
      if (exceededOutcome.action === "resolved") alertsResolved++;
      if (exceededOutcome.action === "created") notificationsCreated++;

      contractResults.push({
        contractId: utilization.contractId,
        warning: warningOutcome,
        exceeded: exceededOutcome,
      });
    }

    console.info(
      `[alert-evaluation] complete workspaceId=${context.workspaceId} alertsCreated=${alertsCreated} alertsResolved=${alertsResolved} notificationsCreated=${notificationsCreated}`,
    );

    return { alertsCreated, alertsResolved, notificationsCreated, contractResults };
  }

  /**
   * Lists all notifications for the current user in the workspace, newest first.
   */
  async getNotificationsForUser(
    context: WorkspaceContext,
  ): Promise<NotificationRecord[]> {
    await this.requireMembership(context);
    return this.notifications.listNotificationsForUser(
      context.workspaceId,
      context.userId,
    );
  }

  /**
   * Returns the count of unread notifications for the current user.
   */
  async getUnreadCount(context: WorkspaceContext): Promise<number> {
    await this.requireMembership(context);
    const all = await this.notifications.listNotificationsForUser(
      context.workspaceId,
      context.userId,
    );
    return all.filter((n) => n.readAt === null).length;
  }

  /**
   * Marks a notification as read. Scoped to the current user's workspace.
   */
  async markNotificationRead(
    context: WorkspaceContext,
    notificationId: string,
  ): Promise<NotificationRecord> {
    await this.requireMembership(context);
    return this.notifications.markNotificationRead(
      context.workspaceId,
      notificationId,
      new Date(),
    );
  }

  // ---------------------------------------------------------------------------
  // Private: single-rule evaluation
  // ---------------------------------------------------------------------------

  /**
   * Evaluates a single alert rule for a contract utilization.
   *
   * Threshold semantics:
   *   utilization === null           → no alert (null contractedMinutes, BR-104-011)
   *   utilization < threshold        → no alert; resolve active alert if exists
   *   utilization >= threshold       → alert fires; deduplication applied
   *
   * CONTRACT_EXCEEDED threshold is always 100 (hard boundary).
   * CONTRACT_WARNING threshold is WorkspaceSettings.contractWarningPercent (default 80).
   *
   * Both alerts are evaluated independently per OQ-106-001 default:
   * when utilization >= 100, both WARNING and EXCEEDED may fire simultaneously.
   */
  private async evaluateContractRule(
    context: WorkspaceContext,
    utilization: ContractUtilization,
    period: AnalyticsPeriod,
    type: "CONTRACT_WARNING" | "CONTRACT_EXCEEDED",
    threshold: number,
  ): Promise<AlertConditionOutcome> {
    // BR-104-011: null utilization means unlimited contract — no alert
    if (utilization.utilizationPercentage === null) {
      return { action: "none" };
    }

    const conditionMet = utilization.utilizationPercentage >= threshold;
    const baseKey = buildContractAlertDedupKey(
      type,
      context.workspaceId,
      utilization.contractId,
      period.startDate,
    );

    if (!conditionMet) {
      return this.resolveIfActive(context, utilization.contractId, type, period.startDate);
    }

    // Condition met — find existing alert by base key
    const existing = await this.alerts.findAlertByDeduplicationKey(
      context.workspaceId,
      baseKey,
    );

    if (existing !== null && existing.resolvedAt === null) {
      // Active alert exists — deduplicate
      return { action: "deduplicated" };
    }

    // Either no alert or resolved alert — create new
    const dedupKey =
      existing !== null && existing.resolvedAt !== null
        ? buildRetriggerDedupKey(
            type,
            context.workspaceId,
            utilization.contractId,
            period.startDate,
            new Date(),
          )
        : baseKey;

    return this.createAlertAndNotify(context, utilization, period, type, dedupKey);
  }

  /**
   * Resolves the semantically-active alert for the given contract/type/period,
   * regardless of which deduplication key was used at creation time (base or
   * timestamp-suffixed re-trigger key).
   *
   * F-106-P07-001 fix: resolution is independent of the deduplication key so
   * that re-triggered alerts (timestamp-suffixed key) are correctly resolved
   * when the condition subsequently drops below threshold.
   */
  private async resolveIfActive(
    context: WorkspaceContext,
    contractId: string,
    type: "CONTRACT_WARNING" | "CONTRACT_EXCEEDED",
    periodStart: Date,
  ): Promise<AlertConditionOutcome> {
    const existing = await this.alerts.findActiveAlertByContractAndType(
      context.workspaceId,
      contractId,
      type,
      periodStart,
    );

    if (existing === null) {
      return { action: "none" };
    }

    const resolved = await this.alerts.resolveAlert(
      context.workspaceId,
      existing.id,
      new Date(),
    );

    return { action: "resolved", alert: resolved };
  }

  /**
   * Creates an alert and its corresponding in-app notification.
   * Race condition: if a concurrent evaluation already inserted the same key,
   * UniqueConstraintViolationError is thrown by the repository — treated as
   * idempotent success (deduplicated at the DB level).
   */
  private async createAlertAndNotify(
    context: WorkspaceContext,
    utilization: ContractUtilization,
    period: AnalyticsPeriod,
    type: "CONTRACT_WARNING" | "CONTRACT_EXCEEDED",
    dedupKey: string,
  ): Promise<AlertConditionOutcome> {
    let alert: AlertRecord;

    try {
      alert = await this.alerts.createAlert(context.workspaceId, {
        type,
        severity: type === "CONTRACT_EXCEEDED" ? "ERROR" : "WARNING",
        clientId: null, // contractId carries sufficient context; clientId is denormalized
        contractId: utilization.contractId,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        deduplicationKey: dedupKey,
      });
    } catch (err) {
      if (err instanceof UniqueConstraintViolationError) {
        // Concurrent evaluation already created this alert — idempotent success
        return { action: "deduplicated" };
      }
      throw err;
    }

    const { title, body } = buildNotificationContent(type, utilization);

    const notification = await this.notifications.createNotification(
      context.workspaceId,
      {
        userId: context.userId,
        alertId: alert.id,
        type: "ALERT",
        title,
        body,
      },
    );

    return { action: "created", alert, notification };
  }
}

// ---------------------------------------------------------------------------
// Notification content builders
// ---------------------------------------------------------------------------

function buildNotificationContent(
  type: "CONTRACT_WARNING" | "CONTRACT_EXCEEDED",
  utilization: ContractUtilization,
): { title: string; body: string } {
  const percentage =
    utilization.utilizationPercentage !== null
      ? Math.round(utilization.utilizationPercentage)
      : 0;

  if (type === "CONTRACT_EXCEEDED") {
    return {
      title: "Contract limit reached",
      body: `${utilization.clientName} contract has reached ${percentage}% of contracted capacity. Contracted hours have been fully consumed.`,
    };
  }

  return {
    title: "Contract approaching limit",
    body: `${utilization.clientName} contract is at ${percentage}% of contracted capacity.`,
  };
}

/**
 * Factory function following the established application service pattern.
 */
export function createAlertService(
  alerts: AlertRepository,
  notifications: NotificationRepository,
  members: WorkspaceMemberRepository,
  settings: WorkspaceSettingsRepository,
  analyticsService: AnalyticsService,
): AlertService {
  return new AlertService(alerts, notifications, members, settings, analyticsService);
}
