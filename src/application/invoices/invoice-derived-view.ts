// src/application/invoices/invoice-derived-view.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  deriveInvoiceFields,
  type InvoiceDerivedFields,
} from "@/domain/invoice-derived";
import type { InvoiceRecord } from "@/domain/persistence-types";
import { getTodayInTimezone } from "@/lib/analytics-periods";

export type InvoiceDerivedView = InvoiceRecord & InvoiceDerivedFields;

export function toInvoiceDerivedView(
  invoice: InvoiceRecord,
  context: WorkspaceContext,
  now?: Date,
  paidAmount = "0",
): InvoiceDerivedView {
  const today = getTodayInTimezone(context.timezone, now);

  return {
    ...invoice,
    ...deriveInvoiceFields(invoice, today, paidAmount),
  };
}
