// src/application/invoices/get-invoice.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import type { InvoiceRecord } from "@/domain/persistence-types";
import type { InvoiceRepository } from "@/domain/repositories";

export async function getInvoice(
  context: WorkspaceContext,
  invoiceId: string,
  invoices: InvoiceRepository,
): Promise<InvoiceRecord> {
  const invoice = await invoices.getInvoice(context.workspaceId, invoiceId);

  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  return invoice;
}