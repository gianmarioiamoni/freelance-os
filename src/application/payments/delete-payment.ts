// src/application/payments/delete-payment.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { isActiveInvoice } from "@/domain/invoice";
import {
  InvoiceNotEditableError,
  InvoiceNotFoundError,
} from "@/domain/invoice-errors";
import { PaymentNotFoundError } from "@/domain/payment-errors";
import { RecordNotFoundError } from "@/domain/persistence-errors";
import { triggerPaymentAlertEvaluation } from "@/application/alerts/trigger-payment-alert-evaluation";
import type { RunInTransaction } from "@/domain/repositories";

export async function deletePayment(
  context: WorkspaceContext,
  invoiceId: string,
  paymentId: string,
  runInTransaction: RunInTransaction,
): Promise<void> {
  await runInTransaction(async (repositories) => {
    const invoice = await repositories.invoices.lockInvoice(
      context.workspaceId,
      invoiceId,
    );

    if (!invoice) {
      throw new InvoiceNotFoundError();
    }

    if (!isActiveInvoice(invoice.voidedAt)) {
      throw new InvoiceNotEditableError();
    }

    const existing = await repositories.payments.getPayment(
      context.workspaceId,
      paymentId,
    );

    if (!existing || existing.invoiceId !== invoice.id) {
      throw new PaymentNotFoundError();
    }

    try {
      await repositories.payments.deletePayment(context.workspaceId, paymentId);
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        throw new PaymentNotFoundError();
      }

      throw error;
    }
  });

  await triggerPaymentAlertEvaluation(context, invoiceId, runInTransaction);
}
