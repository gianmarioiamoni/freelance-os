// src/application/payments/list-payments-for-invoice.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import type { PaymentRecord } from "@/domain/persistence-types";
import type { InvoiceRepository, PaymentRepository } from "@/domain/repositories";

export async function listPaymentsForInvoice(
  context: WorkspaceContext,
  invoiceId: string,
  invoices: InvoiceRepository,
  payments: PaymentRepository,
): Promise<PaymentRecord[]> {
  const invoice = await invoices.getInvoice(context.workspaceId, invoiceId);

  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  return payments.listPaymentsForInvoice(context.workspaceId, invoice.id);
}
