// src/application/invoices/invoice-input.ts
import {
  normalizeInvoiceReference,
  parseInvoiceAmount,
  parseInvoiceCurrency,
} from "@/domain/invoice";
import { InvalidInvoiceInputError } from "@/domain/invoice-errors";
import type { InvoiceTrackingFilter } from "@/domain/persistence-types";

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TRACKING_FILTERS = new Set<InvoiceTrackingFilter>(["ACTIVE", "VOID", "ALL"]);
const FORBIDDEN_UPDATE_FIELDS = [
  "contractId",
  "currency",
  "paymentTermsDays",
  "dueDate",
  "voidedAt",
] as const;

export type InvoiceCreateInput = {
  contractId: string;
  invoiceDate: string;
  amount: string;
  currency?: string | null;
  reference?: string | null;
};

export type InvoiceUpdateInput = {
  invoiceDate?: string;
  amount?: string;
  reference?: string | null;
};

export type ValidatedInvoiceCreateInput = {
  contractId: string;
  invoiceDate: Date;
  amount: string;
  currency: string | undefined;
  reference: string | null;
};

export type ValidatedInvoiceUpdateInput = {
  invoiceDate?: Date;
  amount?: string;
  reference?: string | null;
};

export function parseInvoiceDate(value: string | undefined): Date {
  const trimmed = (value ?? "").trim();
  const match = CALENDAR_DATE_PATTERN.exec(trimmed);

  if (!match) {
    throw new InvalidInvoiceInputError("invoiceDate");
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
    throw new InvalidInvoiceInputError("invoiceDate");
  }

  return parsed;
}

function parseRequiredContractId(value: string | undefined): string {
  const trimmed = (value ?? "").trim();

  if (trimmed.length === 0) {
    throw new InvalidInvoiceInputError("contractId");
  }

  return trimmed;
}

export function parseInvoiceCreateInput(
  input: InvoiceCreateInput,
): ValidatedInvoiceCreateInput {
  const currencyRaw = input.currency;

  return {
    contractId: parseRequiredContractId(input.contractId),
    invoiceDate: parseInvoiceDate(input.invoiceDate),
    amount: parseInvoiceAmount(input.amount),
    currency:
      currencyRaw == null || currencyRaw.trim().length === 0
        ? undefined
        : parseInvoiceCurrency(currencyRaw),
    reference: normalizeInvoiceReference(input.reference),
  };
}

export function parseInvoiceUpdateInput(
  input: InvoiceUpdateInput & Record<string, unknown>,
): ValidatedInvoiceUpdateInput {
  for (const field of FORBIDDEN_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      throw new InvalidInvoiceInputError(field);
    }
  }

  return {
    ...(input.invoiceDate !== undefined && {
      invoiceDate: parseInvoiceDate(input.invoiceDate),
    }),
    ...(input.amount !== undefined && { amount: parseInvoiceAmount(input.amount) }),
    ...(Object.prototype.hasOwnProperty.call(input, "reference") && {
      reference: normalizeInvoiceReference(input.reference),
    }),
  };
}

export function parseInvoiceTrackingFilter(
  value: InvoiceTrackingFilter | string | undefined,
): InvoiceTrackingFilter {
  if (value == null || value === "") {
    return "ACTIVE";
  }

  if (!TRACKING_FILTERS.has(value as InvoiceTrackingFilter)) {
    throw new InvalidInvoiceInputError("tracking");
  }

  return value as InvoiceTrackingFilter;
}