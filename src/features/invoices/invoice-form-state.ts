// src/features/invoices/invoice-form-state.ts
import type { InvoiceCreateInput, InvoiceUpdateInput } from "@/application/invoices/invoice-input";
import { INVOICE_REFERENCE_MAX_LENGTH } from "@/domain/invoice";
import type { InvoiceInputField } from "@/domain/invoice-errors";
import type { InvoiceRecord } from "@/domain/persistence-types";
import { formatCalendarDate } from "@/features/contracts/contract-display";

export type InvoiceFormValues = {
  invoiceDate: string;
  amount: string;
  reference: string;
};

export type InvoiceFormActionState = {
  error: string;
  field?: InvoiceInputField;
  values: InvoiceFormValues;
} | null;

export type InvoiceFormAction = (
  previousState: InvoiceFormActionState,
  formData: FormData,
) => Promise<InvoiceFormActionState>;

export const EMPTY_INVOICE_FORM_VALUES: InvoiceFormValues = {
  invoiceDate: "",
  amount: "",
  reference: "",
};

export const INVOICE_FIELD_ERROR_MESSAGES: Record<InvoiceInputField, string> = {
  contractId: "This contract could not be found.",
  invoiceDate: "Enter a valid invoice date.",
  amount: "Enter an amount greater than 0 with at most 4 decimal places.",
  currency: "Invoice currency must match the contract currency.",
  reference: `Enter a reference with at most ${INVOICE_REFERENCE_MAX_LENGTH} characters.`,
  paymentTermsDays: "Payment terms on this invoice cannot be changed.",
  dueDate: "Due date is derived and cannot be set directly.",
  voidedAt: "Invoice tracking state cannot be changed from this form.",
  tracking: "Select a valid invoice status filter.",
};

export const INVOICE_NOT_FOUND_ERROR = "This invoice could not be found.";
export const INVOICE_CONTRACT_NOT_FOUND_ERROR = "This contract could not be found.";
export const INVOICE_NOT_EDITABLE_ERROR = "A void invoice cannot be edited.";
export const INVOICE_ALREADY_VOIDED_ERROR = "This invoice is already void.";
export const INVOICE_CREATE_FAILED_ERROR = "Unable to create the invoice.";
export const INVOICE_UPDATE_FAILED_ERROR = "Unable to update the invoice.";
export const INVOICE_VOID_FAILED_ERROR = "Unable to void the invoice.";

export function readInvoiceFormValues(formData: FormData): InvoiceFormValues {
  return {
    invoiceDate: String(formData.get("invoiceDate") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    reference: String(formData.get("reference") ?? ""),
  };
}

export function toInvoiceCreateInput(
  contractId: string,
  values: InvoiceFormValues,
): InvoiceCreateInput {
  return {
    contractId,
    invoiceDate: values.invoiceDate,
    amount: values.amount,
    reference: values.reference,
  };
}

export function toInvoiceUpdateInput(values: InvoiceFormValues): InvoiceUpdateInput {
  return {
    invoiceDate: values.invoiceDate,
    amount: values.amount,
    reference: values.reference,
  };
}

export function toInvoiceFormValues(invoice: InvoiceRecord): InvoiceFormValues {
  return {
    invoiceDate: formatCalendarDate(invoice.invoiceDate),
    amount: trimInvoiceAmountInput(invoice.amount),
    reference: invoice.reference ?? "",
  };
}

export function createEmptyInvoiceFormValues(invoiceDate = ""): InvoiceFormValues {
  return {
    ...EMPTY_INVOICE_FORM_VALUES,
    invoiceDate,
  };
}

function trimInvoiceAmountInput(value: string): string {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/\.?0+$/, "");
}
