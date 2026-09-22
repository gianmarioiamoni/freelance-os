// src/features/invoices/invoice-action-errors.ts
import { ContractNotFoundError } from "@/domain/contract-errors";
import {
  InvoiceAlreadyVoidedError,
  InvoiceNotEditableError,
  InvoiceNotFoundError,
  InvalidInvoiceInputError,
} from "@/domain/invoice-errors";
import {
  INVOICE_ALREADY_VOIDED_ERROR,
  INVOICE_CONTRACT_NOT_FOUND_ERROR,
  INVOICE_CREATE_FAILED_ERROR,
  INVOICE_FIELD_ERROR_MESSAGES,
  INVOICE_NOT_EDITABLE_ERROR,
  INVOICE_NOT_FOUND_ERROR,
  INVOICE_UPDATE_FAILED_ERROR,
  INVOICE_VOID_FAILED_ERROR,
  type InvoiceFormActionState,
  type InvoiceFormValues,
} from "@/features/invoices/invoice-form-state";

export type InvoiceWriteKind = "create" | "update";

export function mapInvoiceWriteError(
  error: unknown,
  values: InvoiceFormValues,
  kind: InvoiceWriteKind,
): InvoiceFormActionState {
  if (error instanceof InvalidInvoiceInputError) {
    return {
      error: INVOICE_FIELD_ERROR_MESSAGES[error.field],
      field: error.field,
      values,
    };
  }

  if (error instanceof ContractNotFoundError) {
    return {
      error: INVOICE_CONTRACT_NOT_FOUND_ERROR,
      values,
    };
  }

  if (error instanceof InvoiceNotFoundError) {
    return {
      error: INVOICE_NOT_FOUND_ERROR,
      values,
    };
  }

  if (error instanceof InvoiceNotEditableError) {
    return {
      error: INVOICE_NOT_EDITABLE_ERROR,
      values,
    };
  }

  return {
    error: kind === "create" ? INVOICE_CREATE_FAILED_ERROR : INVOICE_UPDATE_FAILED_ERROR,
    values,
  };
}

export function mapInvoiceVoidError(error: unknown): { error: string } {
  if (error instanceof InvoiceNotFoundError || error instanceof ContractNotFoundError) {
    return { error: INVOICE_NOT_FOUND_ERROR };
  }

  if (error instanceof InvoiceAlreadyVoidedError) {
    return { error: INVOICE_ALREADY_VOIDED_ERROR };
  }

  return { error: INVOICE_VOID_FAILED_ERROR };
}
