// src/application/alerts/payment-alert-lifecycle.ts
import type { AlertConditionOutcome } from "@/application/alerts/alert-evaluation-types";
import {
  buildPaymentAlertDedupKey,
  buildPaymentRetriggerDedupKey,
} from "@/application/alerts/alert-dedup-key";
import type {
  PaymentAlertRepositories,
  PaymentAlertType,
} from "@/application/alerts/payment-alert-types";
import { UniqueConstraintViolationError } from "@/domain/persistence-errors";
import type {
  AlertRecord,
  AlertSeverity,
  InvoiceRecord,
} from "@/domain/persistence-types";
import type { AlertRepository } from "@/domain/repositories";

const PAYMENT_ALERT_SEVERITY: Record<PaymentAlertType, AlertSeverity> = {
  PAYMENT_PARTIAL: "INFO",
  PAYMENT_OVERDUE: "WARNING",
  PAYMENT_MISMATCH: "ERROR",
};

export async function evaluatePaymentRule(
  context: { workspaceId: string; userId: string },
  invoice: InvoiceRecord,
  type: PaymentAlertType,
  conditionMet: boolean,
  repositories: PaymentAlertRepositories,
): Promise<AlertConditionOutcome> {
  if (!conditionMet) {
    return resolveIfActivePaymentAlert(context.workspaceId, invoice.id, type, repositories.alerts);
  }

  const active = await repositories.alerts.findActiveAlertByInvoiceAndType(
    context.workspaceId,
    invoice.id,
    type,
  );

  if (active !== null) {
    return { action: "deduplicated" };
  }

  const baseKey = buildPaymentAlertDedupKey(type, context.workspaceId, invoice.id);
  const existing = await repositories.alerts.findAlertByDeduplicationKey(
    context.workspaceId,
    baseKey,
  );

  const dedupKey =
    existing !== null && existing.resolvedAt !== null
      ? buildPaymentRetriggerDedupKey(type, context.workspaceId, invoice.id, new Date())
      : baseKey;

  return createPaymentAlertAndNotify(context, invoice, type, dedupKey, repositories);
}

export async function resolveIfActivePaymentAlert(
  workspaceId: string,
  invoiceId: string,
  type: PaymentAlertType,
  alerts: AlertRepository,
): Promise<AlertConditionOutcome> {
  const existing = await alerts.findActiveAlertByInvoiceAndType(
    workspaceId,
    invoiceId,
    type,
  );

  if (existing === null) {
    return { action: "none" };
  }

  const resolved = await alerts.resolveAlert(workspaceId, existing.id, new Date());
  return { action: "resolved", alert: resolved };
}

async function createPaymentAlertAndNotify(
  context: { workspaceId: string; userId: string },
  invoice: InvoiceRecord,
  type: PaymentAlertType,
  dedupKey: string,
  repositories: PaymentAlertRepositories,
): Promise<AlertConditionOutcome> {
  let alert: AlertRecord;

  try {
    alert = await repositories.alerts.createAlert(context.workspaceId, {
      type,
      severity: PAYMENT_ALERT_SEVERITY[type],
      clientId: null,
      contractId: invoice.contractId,
      invoiceId: invoice.id,
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

  const { title, body } = paymentNotificationContent(type);
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

function paymentNotificationContent(
  type: PaymentAlertType,
): { title: string; body: string } {
  if (type === "PAYMENT_OVERDUE") {
    return { title: "Payment overdue", body: "Invoice payment is overdue." };
  }

  if (type === "PAYMENT_MISMATCH") {
    return {
      title: "Payment mismatch",
      body: "Paid amount exceeds the invoice amount.",
    };
  }

  return { title: "Partial payment", body: "Invoice is partially paid." };
}
