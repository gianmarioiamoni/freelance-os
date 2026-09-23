// src/application/alerts/trigger-allocation-alert-evaluation.ts
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { evaluateContractAllocationAlerts } from "@/application/alerts/evaluate-allocation-alerts";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { RunInTransaction } from "@/domain/repositories";

/**
 * Best-effort allocation-alert evaluation after a Contract write.
 * Evaluation failure must not roll back the already-committed mutation.
 */
export async function triggerAllocationAlertEvaluation(
  context: WorkspaceContext,
  contractId: string,
  runInTransaction: RunInTransaction,
): Promise<void> {
  try {
    await runInTransaction(async (repositories) => {
      const analyticsService = new AnalyticsService(
        repositories.analytics,
        repositories.members,
      );
      await evaluateContractAllocationAlerts(
        context,
        contractId,
        {
          alerts: repositories.alerts,
          notifications: repositories.notifications,
          members: repositories.members,
        },
        analyticsService,
      );
    });
  } catch (error) {
    console.error(
      `[alert-trigger] allocation alert evaluation failed workspaceId=${context.workspaceId} contractId=${contractId}`,
      error,
    );
  }
}
