// src/domain/invoice-derived.ts
import { invoiceTrackingState } from "@/domain/invoice";
import type { InvoiceRecord, InvoiceTrackingState } from "@/domain/persistence-types";

export type InvoiceAmountStatus = "UNPAID" | "PARTIAL" | "PAID" | "MISMATCH";

/** 1-based month, same shape as `getTodayInTimezone`. */
export type InvoiceCalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type InvoiceDerivedFields = {
  trackingState: InvoiceTrackingState;
  paidAmount: string;
  amountStatus: InvoiceAmountStatus;
  overdue: boolean;
};

const ZERO_AMOUNT = "0";

export function deriveAmountStatus(
  amount: string,
  paidAmount: string,
): InvoiceAmountStatus {
  const paidVersusZero = compareDecimalAmounts(paidAmount, ZERO_AMOUNT);
  const paidVersusAmount = compareDecimalAmounts(paidAmount, amount);

  if (paidVersusZero === 0) {
    return "UNPAID";
  }

  if (paidVersusAmount === 0) {
    return "PAID";
  }

  if (paidVersusAmount > 0) {
    return "MISMATCH";
  }

  return "PARTIAL";
}

export function isOverdue(
  dueDate: Date | null,
  today: InvoiceCalendarDate,
  paidAmount: string,
  amount: string,
): boolean {
  if (dueDate === null) {
    return false;
  }

  if (!isCalendarDateBefore(calendarDateFromStoredDate(dueDate), today)) {
    return false;
  }

  return compareDecimalAmounts(paidAmount, amount) < 0;
}

export function deriveInvoiceFields(
  invoice: Pick<InvoiceRecord, "amount" | "dueDate" | "voidedAt">,
  today: InvoiceCalendarDate,
  paidAmount = ZERO_AMOUNT,
): InvoiceDerivedFields {
  return {
    trackingState: invoiceTrackingState(invoice.voidedAt),
    paidAmount,
    amountStatus: deriveAmountStatus(invoice.amount, paidAmount),
    overdue: isOverdue(invoice.dueDate, today, paidAmount, invoice.amount),
  };
}

function calendarDateFromStoredDate(date: Date): InvoiceCalendarDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function isCalendarDateBefore(
  left: InvoiceCalendarDate,
  right: InvoiceCalendarDate,
): boolean {
  if (left.year !== right.year) {
    return left.year < right.year;
  }

  if (left.month !== right.month) {
    return left.month < right.month;
  }

  return left.day < right.day;
}

function compareDecimalAmounts(left: string, right: string): number {
  const leftParts = splitDecimal(left);
  const rightParts = splitDecimal(right);

  if (isZeroDecimal(leftParts) && isZeroDecimal(rightParts)) {
    return 0;
  }

  if (leftParts.negative !== rightParts.negative) {
    return leftParts.negative ? -1 : 1;
  }

  const scale = Math.max(leftParts.fraction.length, rightParts.fraction.length);
  const leftScaled = toScaledInteger(leftParts, scale);
  const rightScaled = toScaledInteger(rightParts, scale);

  if (leftScaled === rightScaled) {
    return 0;
  }

  const comparison = leftScaled < rightScaled ? -1 : 1;
  return leftParts.negative ? -comparison : comparison;
}

function splitDecimal(value: string): {
  negative: boolean;
  whole: string;
  fraction: string;
} {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const unsigned =
    negative || trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  const [wholeRaw = "0", fractionRaw = ""] = unsigned.split(".");

  return {
    negative,
    whole: stripLeadingZeros(wholeRaw),
    fraction: fractionRaw,
  };
}

function stripLeadingZeros(value: string): string {
  const stripped = value.replace(/^0+(?=\d)/, "");
  return stripped.length === 0 ? "0" : stripped;
}

function isZeroDecimal(parts: { whole: string; fraction: string }): boolean {
  return parts.whole === "0" && /^0*$/.test(parts.fraction);
}

function toScaledInteger(
  parts: { whole: string; fraction: string },
  scale: number,
): bigint {
  return BigInt(`${parts.whole}${parts.fraction.padEnd(scale, "0")}`);
}
