// src/application/invoices/void-invoice.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { isActiveInvoice } from "@/domain/invoice";
import {
  InvoiceAlreadyVoidedError,
  InvoiceNotFoundError,
} from "@/domain/invoice-errors";
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type { InvoiceRecord } from "@/domain/persistence-types";
import type { InvoiceRepository } from "@/domain/repositories";

export async function voidInvoice(
  context: WorkspaceContext,
  invoiceId: string,
  invoices: InvoiceRepository,
): Promise<InvoiceRecord> {
  const existing = await invoices.getInvoice(context.workspaceId, invoiceId);

  if (!existing) {
    throw new InvoiceNotFoundError();
  }

  if (!isActiveInvoice(existing.voidedAt)) {
    throw new InvoiceAlreadyVoidedError();
  }

  try {
    return await invoices.voidInvoice(context.workspaceId, invoiceId);
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      throw new InvoiceNotFoundError();
    }

    throw error;
  }
}