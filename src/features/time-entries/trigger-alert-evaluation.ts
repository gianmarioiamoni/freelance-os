// src/features/time-entries/trigger-alert-evaluation.ts
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createAlertService } from "@/application/alerts/alert-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  AlertRepository,
  AnalyticsRepository,
  NotificationRepository,
  WorkspaceMemberRepository,
  WorkspaceSettingsRepository,
} from "@/domain/repositories";

type AlertRepositories = {
  alerts: AlertRepository;
  notifications: NotificationRepository;
  members: WorkspaceMemberRepository;
  settings: WorkspaceSettingsRepository;
  analytics: AnalyticsRepository;
};

/**
 * Evaluates contract alerts after a TimeEntry mutation (P106-03).
 *
 * Best-effort: if alert evaluation fails, the error is logged but not re-thrown.
 * The TimeEntry mutation has already committed; a secondary alerting failure must
 * not corrupt or roll back the primary operation.
 *
 * Workspace membership guard remains inside AlertService — not bypassed here.
 */
export async function triggerAlertEvaluation(
  context: WorkspaceContext,
  repositories: AlertRepositories,
): Promise<void> {
  const analyticsService = new AnalyticsService(
    repositories.analytics,
    repositories.members,
  );

  const alertService = createAlertService(
    repositories.alerts,
    repositories.notifications,
    repositories.members,
    repositories.settings,
    analyticsService,
  );

  try {
    await alertService.evaluateContractAlerts(context);
  } catch (err) {
    console.error(
      `[alert-trigger] alert evaluation failed after TimeEntry mutation workspaceId=${context.workspaceId}`,
      err,
    );
    // Best-effort: do not re-throw. TimeEntry mutation already succeeded.
  }
}
