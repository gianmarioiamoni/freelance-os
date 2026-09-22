// src/application/invoices/get-invoice.ts
import {
  toInvoiceDerivedView,
  type InvoiceDerivedView,
} from "@/application/invoices/invoice-derived-view";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import type { InvoiceRepository } from "@/domain/repositories";

export async function getInvoice(
  context: WorkspaceContext,
  invoiceId: string,
  invoices: InvoiceRepository,
  now?: Date,
): Promise<InvoiceDerivedView> {
  const invoice = await invoices.getInvoice(context.workspaceId, invoiceId);

  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  return toInvoiceDerivedView(invoice, context, now);
}
