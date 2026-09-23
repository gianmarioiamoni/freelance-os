// src/application/alerts/evaluate-allocation-alerts.ts
import type { AlertConditionOutcome } from "@/application/alerts/alert-evaluation-types";
import {
  evaluateAllocationRule,
  resolveIfActiveAllocationAlert,
} from "@/application/alerts/allocation-alert-lifecycle";
import type {
  AllocationAlertEvaluationResult,
  AllocationAlertRepositories,
} from "@/application/alerts/allocation-alert-types";
import type { AnalyticsService } from "@/application/analytics/analytics-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

export {
  ALLOCATION_ALERT_TYPES,
  type AllocationAlertEvaluationResult,
  type AllocationAlertRepositories,
  type AllocationAlertType,
} from "@/application/alerts/allocation-alert-types";

/**
 * Evaluates ALLOCATION_WARNING / ALLOCATION_EXCEEDED for one Contract.
 * Uses authoritative P-E04-02 allocation status. Does not scan other contracts.
 */
export async function evaluateContractAllocationAlerts(
  context: WorkspaceContext,
  contractId: string,
  repositories: AllocationAlertRepositories,
  analyticsService: AnalyticsService,
): Promise<AllocationAlertEvaluationResult> {
  const membership = await repositories.members.getMember(
    context.workspaceId,
    context.userId,
  );

  if (!membership) {
    throw new UnauthorizedWorkspaceAccessError();
  }

  const view = await analyticsService.getContractAllocation(context, contractId);

  if (view.allocationStatus === null) {
    return resolveAllAllocationAlerts(context.workspaceId, contractId, repositories);
  }

  const warning = await evaluateAllocationRule(
    context,
    contractId,
    "ALLOCATION_WARNING",
    view.allocationStatus === "WARNING",
    repositories,
  );
  const exceeded = await evaluateAllocationRule(
    context,
    contractId,
    "ALLOCATION_EXCEEDED",
    view.allocationStatus === "EXCEEDED",
    repositories,
  );

  return summarizeAllocationOutcomes(contractId, warning, exceeded);
}

async function resolveAllAllocationAlerts(
  workspaceId: string,
  contractId: string,
  repositories: AllocationAlertRepositories,
): Promise<AllocationAlertEvaluationResult> {
  const warning = await resolveIfActiveAllocationAlert(
    workspaceId,
    contractId,
    "ALLOCATION_WARNING",
    repositories.alerts,
  );
  const exceeded = await resolveIfActiveAllocationAlert(
    workspaceId,
    contractId,
    "ALLOCATION_EXCEEDED",
    repositories.alerts,
  );

  return summarizeAllocationOutcomes(contractId, warning, exceeded);
}

function summarizeAllocationOutcomes(
  contractId: string,
  warning: AlertConditionOutcome,
  exceeded: AlertConditionOutcome,
): AllocationAlertEvaluationResult {
  const outcomes = [warning, exceeded];

  return {
    contractId,
    alertsCreated: outcomes.filter((outcome) => outcome.action === "created").length,
    alertsResolved: outcomes.filter((outcome) => outcome.action === "resolved").length,
    notificationsCreated: outcomes.filter((outcome) => outcome.action === "created")
      .length,
    warning,
    exceeded,
  };
}
