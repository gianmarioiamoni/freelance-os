// src/application/alerts/evaluate-payment-alerts.ts
import type { AlertConditionOutcome } from "@/application/alerts/alert-evaluation-types";
import {
  evaluatePaymentRule,
  resolveIfActivePaymentAlert,
} from "@/application/alerts/payment-alert-lifecycle";
import {
  PAYMENT_ALERT_TYPES,
  type PaymentAlertEvaluationResult,
  type PaymentAlertRepositories,
} from "@/application/alerts/payment-alert-types";
import { toInvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import { sumPaidAmount } from "@/application/payments/paid-amount";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import type { AlertRepository } from "@/domain/repositories";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

export {
  PAYMENT_ALERT_TYPES,
  type PaymentAlertEvaluationResult,
  type PaymentAlertRepositories,
  type PaymentAlertType,
} from "@/application/alerts/payment-alert-types";

export async function evaluateInvoicePaymentAlerts(
  context: WorkspaceContext,
  invoiceId: string,
  repositories: PaymentAlertRepositories,
  now?: Date,
): Promise<PaymentAlertEvaluationResult> {
  const membership = await repositories.members.getMember(
    context.workspaceId,
    context.userId,
  );

  if (!membership) {
    throw new UnauthorizedWorkspaceAccessError();
  }

  const invoice = await repositories.invoices.getInvoice(
    context.workspaceId,
    invoiceId,
  );

  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  if (invoice.voidedAt !== null) {
    return resolveAllPaymentAlerts(context.workspaceId, invoice.id, repositories.alerts);
  }

  const paymentRows = await repositories.payments.listPaymentsForInvoice(
    context.workspaceId,
    invoice.id,
  );
  const derived = toInvoiceDerivedView(
    invoice,
    context,
    now,
    sumPaidAmount(paymentRows.map((payment) => payment.amount)),
  );

  const partial = await evaluatePaymentRule(
    context,
    invoice,
    "PAYMENT_PARTIAL",
    derived.amountStatus === "PARTIAL",
    repositories,
  );
  const overdue = await evaluatePaymentRule(
    context,
    invoice,
    "PAYMENT_OVERDUE",
    derived.overdue,
    repositories,
  );
  const mismatch = await evaluatePaymentRule(
    context,
    invoice,
    "PAYMENT_MISMATCH",
    derived.amountStatus === "MISMATCH",
    repositories,
  );

  return summarizePaymentOutcomes(invoice.id, partial, overdue, mismatch);
}

export async function resolvePaymentAlertsForVoidInvoice(
  workspaceId: string,
  invoiceId: string,
  alerts: AlertRepository,
): Promise<number> {
  let resolved = 0;

  for (const type of PAYMENT_ALERT_TYPES) {
    const existing = await alerts.findActiveAlertByInvoiceAndType(
      workspaceId,
      invoiceId,
      type,
    );

    if (existing === null) {
      continue;
    }

    await alerts.resolveAlert(workspaceId, existing.id, new Date());
    resolved += 1;
  }

  return resolved;
}

async function resolveAllPaymentAlerts(
  workspaceId: string,
  invoiceId: string,
  alerts: AlertRepository,
): Promise<PaymentAlertEvaluationResult> {
  const outcomes: AlertConditionOutcome[] = [];

  for (const type of PAYMENT_ALERT_TYPES) {
    outcomes.push(
      await resolveIfActivePaymentAlert(workspaceId, invoiceId, type, alerts),
    );
  }

  return summarizePaymentOutcomes(invoiceId, outcomes[0], outcomes[1], outcomes[2]);
}

function summarizePaymentOutcomes(
  invoiceId: string,
  partial: AlertConditionOutcome,
  overdue: AlertConditionOutcome,
  mismatch: AlertConditionOutcome,
): PaymentAlertEvaluationResult {
  const outcomes = [partial, overdue, mismatch];

  return {
    invoiceId,
    alertsCreated: outcomes.filter((outcome) => outcome.action === "created").length,
    alertsResolved: outcomes.filter((outcome) => outcome.action === "resolved").length,
    notificationsCreated: outcomes.filter((outcome) => outcome.action === "created")
      .length,
    partial,
    overdue,
    mismatch,
  };
}
