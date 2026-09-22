// src/domain/invoice.ts
import { InvalidInvoiceInputError } from "@/domain/invoice-errors";
import type { InvoiceTrackingState } from "@/domain/persistence-types";

export const INVOICE_REFERENCE_MAX_LENGTH = 4000;

const AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
const ISO_4217_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

export function invoiceTrackingState(voidedAt: Date | null): InvoiceTrackingState {
  return voidedAt === null ? "ACTIVE" : "VOID";
}

export function isActiveInvoice(voidedAt: Date | null): boolean {
  return voidedAt === null;
}

export function parseInvoiceAmount(value: string | undefined): string {
  const amount = (value ?? "").trim();

  if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
    throw new InvalidInvoiceInputError("amount");
  }

  return amount;
}

export function parseInvoiceCurrency(value: string | undefined): string {
  const currency = (value ?? "").trim().toUpperCase();

  if (!ISO_4217_CURRENCIES.has(currency)) {
    throw new InvalidInvoiceInputError("currency");
  }

  return currency;
}

export function normalizeInvoiceReference(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > INVOICE_REFERENCE_MAX_LENGTH) {
    throw new InvalidInvoiceInputError("reference");
  }

  return trimmed;
}

export function parseInvoicePaymentTermsDays(
  value: number | string | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  const raw = typeof value === "number" ? String(value) : value.trim();

  if (raw.length === 0) {
    return null;
  }

  if (!/^\d+$/.test(raw)) {
    throw new InvalidInvoiceInputError("paymentTermsDays");
  }

  const days = Number(raw);

  if (!Number.isSafeInteger(days)) {
    throw new InvalidInvoiceInputError("paymentTermsDays");
  }

  return days;
}

export function assertDueDateTermsConsistency(
  paymentTermsDays: number | null,
  dueDate: Date | null,
): void {
  const hasTerms = paymentTermsDays !== null;
  const hasDueDate = dueDate !== null;

  if (hasTerms !== hasDueDate) {
    throw new InvalidInvoiceInputError(hasTerms ? "dueDate" : "paymentTermsDays");
  }
}
