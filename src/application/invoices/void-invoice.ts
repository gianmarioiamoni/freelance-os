// src/application/invoices/void-invoice.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { isActiveInvoice } from "@/domain/invoice";
import {
  InvoiceAlreadyVoidedError,
  InvoiceNotFoundError,
} from "@/domain/invoice-errors";
import { RecordNotFoundError } from "@/domain/persistence-errors";
import { resolvePaymentAlertsForVoidInvoice } from "@/application/alerts/evaluate-payment-alerts";
import type { InvoiceRecord } from "@/domain/persistence-types";
import type { AlertRepository, InvoiceRepository } from "@/domain/repositories";

export async function voidInvoice(
  context: WorkspaceContext,
  invoiceId: string,
  invoices: InvoiceRepository,
  alerts?: AlertRepository,
): Promise<InvoiceRecord> {
  const existing = await invoices.getInvoice(context.workspaceId, invoiceId);

  if (!existing) {
    throw new InvoiceNotFoundError();
  }

  if (!isActiveInvoice(existing.voidedAt)) {
    throw new InvoiceAlreadyVoidedError();
  }

  try {
    const voided = await invoices.voidInvoice(context.workspaceId, invoiceId);

    if (alerts) {
      await resolvePaymentAlertsForVoidInvoice(
        context.workspaceId,
        invoiceId,
        alerts,
      );
    }

    return voided;
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      throw new InvoiceNotFoundError();
    }

    throw error;
  }
}