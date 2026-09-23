// src/application/alerts/allocation-alert-lifecycle.ts
import type { AlertConditionOutcome } from "@/application/alerts/alert-evaluation-types";
import {
  buildAllocationAlertDedupKey,
  buildAllocationRetriggerDedupKey,
} from "@/application/alerts/alert-dedup-key";
import type {
  AllocationAlertRepositories,
  AllocationAlertType,
} from "@/application/alerts/allocation-alert-types";
import { UniqueConstraintViolationError } from "@/domain/persistence-errors";
import type { AlertRecord, AlertSeverity } from "@/domain/persistence-types";
import type { AlertRepository } from "@/domain/repositories";

const ALLOCATION_ALERT_SEVERITY: Record<AllocationAlertType, AlertSeverity> = {
  ALLOCATION_WARNING: "WARNING",
  ALLOCATION_EXCEEDED: "ERROR",
};

export async function evaluateAllocationRule(
  context: { workspaceId: string; userId: string },
  contractId: string,
  type: AllocationAlertType,
  conditionMet: boolean,
  repositories: AllocationAlertRepositories,
): Promise<AlertConditionOutcome> {
  if (!conditionMet) {
    return resolveIfActiveAllocationAlert(
      context.workspaceId,
      contractId,
      type,
      repositories.alerts,
    );
  }

  const active = await repositories.alerts.findActiveAlertByContractAndType(
    context.workspaceId,
    contractId,
    type,
    null,
  );

  if (active !== null) {
    return { action: "deduplicated" };
  }

  const baseKey = buildAllocationAlertDedupKey(type, context.workspaceId, contractId);
  const existing = await repositories.alerts.findAlertByDeduplicationKey(
    context.workspaceId,
    baseKey,
  );

  const dedupKey =
    existing !== null && existing.resolvedAt !== null
      ? buildAllocationRetriggerDedupKey(type, context.workspaceId, contractId, new Date())
      : baseKey;

  return createAllocationAlertAndNotify(context, contractId, type, dedupKey, repositories);
}

export async function resolveIfActiveAllocationAlert(
  workspaceId: string,
  contractId: string,
  type: AllocationAlertType,
  alerts: AlertRepository,
): Promise<AlertConditionOutcome> {
  const existing = await alerts.findActiveAlertByContractAndType(
    workspaceId,
    contractId,
    type,
    null,
  );

  if (existing === null) {
    return { action: "none" };
  }

  const resolved = await alerts.resolveAlert(workspaceId, existing.id, new Date());
  return { action: "resolved", alert: resolved };
}

async function createAllocationAlertAndNotify(
  context: { workspaceId: string; userId: string },
  contractId: string,
  type: AllocationAlertType,
  dedupKey: string,
  repositories: AllocationAlertRepositories,
): Promise<AlertConditionOutcome> {
  let alert: AlertRecord;

  try {
    alert = await repositories.alerts.createAlert(context.workspaceId, {
      type,
      severity: ALLOCATION_ALERT_SEVERITY[type],
      clientId: null,
      contractId,
      invoiceId: null,
      periodStart: null,
      periodEnd: null,
      deduplicationKey: dedupKey,
    });
  } catch (error) {
    if (error instanceof UniqueConstraintViolationError) {
      return { action: "deduplicated" };
    }

    throw error;
  }

  const { title, body } = allocationNotificationContent(type);
  const notification = await repositories.notifications.createNotification(
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

function allocationNotificationContent(
  type: AllocationAlertType,
): { title: string; body: string } {
  if (type === "ALLOCATION_EXCEEDED") {
    return {
      title: "Contract allocation exceeded",
      body: "Tracked time has exceeded the contract allocation.",
    };
  }

  return {
    title: "Contract allocation warning",
    body: "Tracked time has reached 80% of the contract allocation.",
  };
}
