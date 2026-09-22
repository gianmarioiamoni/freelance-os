// src/application/payments/get-payment.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import { PaymentNotFoundError } from "@/domain/payment-errors";
import type { PaymentRecord } from "@/domain/persistence-types";
import type { InvoiceRepository, PaymentRepository } from "@/domain/repositories";

export async function getPayment(
  context: WorkspaceContext,
  invoiceId: string,
  paymentId: string,
  invoices: InvoiceRepository,
  payments: PaymentRepository,
): Promise<PaymentRecord> {
  const invoice = await invoices.getInvoice(context.workspaceId, invoiceId);

  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  const payment = await payments.getPayment(context.workspaceId, paymentId);

  if (!payment || payment.invoiceId !== invoice.id) {
    throw new PaymentNotFoundError();
  }

  return payment;
}
