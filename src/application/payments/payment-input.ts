// src/application/payments/payment-input.ts
import { parseInvoiceCurrency } from "@/domain/invoice";
import { InvalidInvoiceInputError } from "@/domain/invoice-errors";
import { InvalidPaymentInputError } from "@/domain/payment-errors";

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
const PAYMENT_NOTES_MAX_LENGTH = 4000;
const FORBIDDEN_UPDATE_FIELDS = ["id", "workspaceId", "invoiceId", "currency"] as const;

export type PaymentCreateInput = {
  invoiceId: string;
  paymentDate: string;
  amount: string;
  currency?: string | null;
  notes?: string | null;
};

export type PaymentUpdateInput = {
  paymentDate?: string;
  amount?: string;
  notes?: string | null;
};

export type ValidatedPaymentCreateInput = {
  invoiceId: string;
  paymentDate: Date;
  amount: string;
  currency: string | undefined;
  notes: string | null;
};

export type ValidatedPaymentUpdateInput = {
  paymentDate?: Date;
  amount?: string;
  notes?: string | null;
};

export function parsePaymentDate(value: string | undefined): Date {
  const trimmed = (value ?? "").trim();
  const match = CALENDAR_DATE_PATTERN.exec(trimmed);

  if (!match) {
    throw new InvalidPaymentInputError("paymentDate");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new InvalidPaymentInputError("paymentDate");
  }

  return parsed;
}

function parseRequiredInvoiceId(value: string | undefined): string {
  const trimmed = (value ?? "").trim();

  if (trimmed.length === 0) {
    throw new InvalidPaymentInputError("invoiceId");
  }

  return trimmed;
}

function parsePaymentAmount(value: string | undefined): string {
  const amount = (value ?? "").trim();

  if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
    throw new InvalidPaymentInputError("amount");
  }

  return amount;
}

function parseOptionalPaymentCurrency(
  value: string | null | undefined,
): string | undefined {
  if (value == null || value.trim().length === 0) {
    return undefined;
  }

  try {
    return parseInvoiceCurrency(value);
  } catch (error) {
    if (error instanceof InvalidInvoiceInputError) {
      throw new InvalidPaymentInputError("currency");
    }

    throw error;
  }
}

function normalizePaymentNotes(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > PAYMENT_NOTES_MAX_LENGTH) {
    throw new InvalidPaymentInputError("notes");
  }

  return trimmed;
}

export function parsePaymentCreateInput(
  input: PaymentCreateInput,
): ValidatedPaymentCreateInput {
  return {
    invoiceId: parseRequiredInvoiceId(input.invoiceId),
    paymentDate: parsePaymentDate(input.paymentDate),
    amount: parsePaymentAmount(input.amount),
    currency: parseOptionalPaymentCurrency(input.currency),
    notes: normalizePaymentNotes(input.notes),
  };
}

export function parsePaymentUpdateInput(
  input: PaymentUpdateInput & Record<string, unknown>,
): ValidatedPaymentUpdateInput {
  for (const field of FORBIDDEN_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      throw new InvalidPaymentInputError(field);
    }
  }

  return {
    ...(input.paymentDate !== undefined && {
      paymentDate: parsePaymentDate(input.paymentDate),
    }),
    ...(input.amount !== undefined && { amount: parsePaymentAmount(input.amount) }),
    ...(Object.prototype.hasOwnProperty.call(input, "notes") && {
      notes: normalizePaymentNotes(input.notes),
    }),
  };
}
