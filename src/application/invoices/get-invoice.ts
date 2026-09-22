// src/application/invoices/get-invoice.ts
import {
  toInvoiceDerivedView,
  type InvoiceDerivedView,
} from "@/application/invoices/invoice-derived-view";
import { sumPaidAmount } from "@/application/payments/paid-amount";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import type { InvoiceRepository, PaymentRepository } from "@/domain/repositories";

export async function getInvoice(
  context: WorkspaceContext,
  invoiceId: string,
  invoices: InvoiceRepository,
  payments: PaymentRepository,
  now?: Date,
): Promise<InvoiceDerivedView> {
  const invoice = await invoices.getInvoice(context.workspaceId, invoiceId);

  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  const paymentRows = await payments.listPaymentsForInvoice(
    context.workspaceId,
    invoice.id,
  );

  return toInvoiceDerivedView(
    invoice,
    context,
    now,
    sumPaidAmount(paymentRows.map((payment) => payment.amount)),
  );
}
