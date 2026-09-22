// src/application/invoices/invoice-derived-view.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  deriveInvoiceFields,
  type InvoiceDerivedFields,
} from "@/domain/invoice-derived";
import type { InvoiceRecord } from "@/domain/persistence-types";
import { getTodayInTimezone } from "@/lib/analytics-periods";

export type InvoiceDerivedView = InvoiceRecord & InvoiceDerivedFields;

const E02_PAID_AMOUNT = "0";

export function toInvoiceDerivedView(
  invoice: InvoiceRecord,
  context: WorkspaceContext,
  now?: Date,
  paidAmount = E02_PAID_AMOUNT,
): InvoiceDerivedView {
  const today = getTodayInTimezone(context.timezone, now);

  return {
    ...invoice,
    ...deriveInvoiceFields(invoice, today, paidAmount),
  };
}
