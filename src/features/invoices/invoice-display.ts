// src/features/invoices/invoice-display.ts
import {
  parseInvoiceDate,
  parseInvoiceTrackingFilter,
} from "@/application/invoices/invoice-input";
import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import { computeDueDate } from "@/domain/invoice";
import type { InvoiceAmountStatus } from "@/domain/invoice-derived";
import type {
  InvoiceTrackingFilter,
  InvoiceTrackingState,
} from "@/domain/persistence-types";
import {
  displayPaymentTerms,
  formatCalendarDate,
  formatRateWithCurrency,
} from "@/features/contracts/contract-display";

export const INVOICE_TRACKING_FILTERS = ["ACTIVE", "VOID", "ALL"] as const;

export function readInvoiceTrackingParam(
  value: string | undefined,
): InvoiceTrackingFilter {
  try {
    return parseInvoiceTrackingFilter(value);
  } catch {
    return "ACTIVE";
  }
}

export function invoiceTrackingHref(
  contractId: string,
  tracking: InvoiceTrackingFilter,
): string {
  if (tracking === "ACTIVE") {
    return `/contracts/${contractId}`;
  }

  return `/contracts/${contractId}?tracking=${tracking}`;
}

export function formatInvoiceAmount(amount: string, currency: string): string {
  return formatRateWithCurrency(amount, currency);
}

export function formatInvoiceOutstanding(
  amount: string,
  paidAmount: string,
  currency: string,
): string {
  return formatInvoiceAmount(remainingInvoiceAmount(amount, paidAmount), currency);
}

export function remainingInvoiceAmount(amount: string, paidAmount: string): string {
  const amountScaled = toScaledAmount(amount);
  const paidScaled = toScaledAmount(paidAmount);

  if (paidScaled >= amountScaled) {
    return "0";
  }

  return fromScaledAmount(amountScaled - paidScaled);
}

export function formatInvoiceTrackingState(state: InvoiceTrackingState): string {
  return state === "VOID" ? "Void" : "Active";
}

export function formatInvoiceAmountStatus(status: InvoiceAmountStatus): string {
  if (status === "PARTIAL") {
    return "Partial";
  }

  if (status === "PAID") {
    return "Paid";
  }

  if (status === "MISMATCH") {
    return "Mismatch";
  }

  return "Unpaid";
}

export function formatInvoiceOverdue(overdue: boolean): string | null {
  return overdue ? "Overdue" : null;
}

export function formatInvoicePaymentTerms(paymentTermsDays: number | null): string {
  return displayPaymentTerms(paymentTermsDays, null);
}

export function formatInvoiceDueDate(dueDate: Date | null): string {
  if (dueDate === null) {
    return "No due date";
  }

  return formatCalendarDate(dueDate);
}

export function invoiceListTitle(invoice: InvoiceDerivedView): string {
  if (invoice.reference) {
    return invoice.reference;
  }

  return formatInvoiceAmount(invoice.amount, invoice.currency);
}

export function previewDueDate(
  invoiceDate: string,
  paymentTermsDays: number | null,
): string | null {
  if (paymentTermsDays === null) {
    return null;
  }

  try {
    const dueDate = computeDueDate(parseInvoiceDate(invoiceDate), paymentTermsDays);
    return dueDate ? formatCalendarDate(dueDate) : null;
  } catch {
    return null;
  }
}

export function invoiceDetailPath(contractId: string, invoiceId: string): string {
  return `/contracts/${contractId}/invoices/${invoiceId}`;
}

export function invoiceCreatePath(contractId: string): string {
  return `/contracts/${contractId}/invoices/new`;
}

export function invoiceEditPath(contractId: string, invoiceId: string): string {
  return `/contracts/${contractId}/invoices/${invoiceId}/edit`;
}

export function formatTrackingFilterLabel(tracking: InvoiceTrackingFilter): string {
  if (tracking === "VOID") {
    return "Void";
  }

  if (tracking === "ALL") {
    return "All";
  }

  return "Active";
}

function toScaledAmount(value: string): bigint {
  const trimmed = value.trim();
  const unsigned = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  const [wholeRaw = "0", fractionRaw = ""] = unsigned.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
  const fraction = fractionRaw.padEnd(4, "0").slice(0, 4);
  return BigInt(`${whole}${fraction}`);
}

function fromScaledAmount(value: bigint): string {
  if (value === BigInt(0)) {
    return "0";
  }

  const factor = BigInt(10_000);
  const whole = value / factor;
  const fraction = (value % factor).toString().padStart(4, "0");
  return `${whole}.${fraction}`;
}

export function invoiceEmptyStateCopy(tracking: InvoiceTrackingFilter): {
  title: string;
  description: string;
} {
  if (tracking === "VOID") {
    return {
      title: "No void invoices",
      description: "Void invoices for this contract will appear here.",
    };
  }

  if (tracking === "ALL") {
    return {
      title: "No invoices",
      description: "Invoices recorded on this contract will appear here.",
    };
  }

  return {
    title: "No active invoices",
    description: "Record an invoice against this contract to start tracking it.",
  };
}
