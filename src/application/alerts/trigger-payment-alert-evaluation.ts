// src/application/alerts/trigger-payment-alert-evaluation.ts
import { evaluateInvoicePaymentAlerts } from "@/application/alerts/evaluate-payment-alerts";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { RunInTransaction } from "@/domain/repositories";

/**
 * Best-effort payment-alert evaluation after an authorized write (T3).
 * Evaluation failure must not roll back the already-committed mutation.
 */
export async function triggerPaymentAlertEvaluation(
  context: WorkspaceContext,
  invoiceId: string,
  runInTransaction: RunInTransaction,
  now?: Date,
): Promise<void> {
  try {
    await runInTransaction(async (repositories) => {
      await evaluateInvoicePaymentAlerts(context, invoiceId, repositories, now);
    });
  } catch (error) {
    console.error(
      `[alert-trigger] payment alert evaluation failed workspaceId=${context.workspaceId} invoiceId=${invoiceId}`,
      error,
    );
  }
}
