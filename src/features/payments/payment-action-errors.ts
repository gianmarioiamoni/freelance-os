// src/features/payments/payment-action-errors.ts
import { ContractNotFoundError } from "@/domain/contract-errors";
import {
  InvoiceNotEditableError,
  InvoiceNotFoundError,
} from "@/domain/invoice-errors";
import {
  InvalidPaymentInputError,
  PaymentNotFoundError,
} from "@/domain/payment-errors";
import {
  PAYMENT_CREATE_FAILED_ERROR,
  PAYMENT_DELETE_FAILED_ERROR,
  PAYMENT_FIELD_ERROR_MESSAGES,
  PAYMENT_INVOICE_NOT_EDITABLE_ERROR,
  PAYMENT_INVOICE_NOT_FOUND_ERROR,
  PAYMENT_NOT_FOUND_ERROR,
  PAYMENT_UPDATE_FAILED_ERROR,
  type PaymentFormActionState,
  type PaymentFormValues,
} from "@/features/payments/payment-form-state";

export type PaymentWriteKind = "create" | "update";

export function mapPaymentWriteError(
  error: unknown,
  values: PaymentFormValues,
  kind: PaymentWriteKind,
): NonNullable<PaymentFormActionState> {
  if (error instanceof InvalidPaymentInputError) {
    return {
      error: PAYMENT_FIELD_ERROR_MESSAGES[error.field],
      field: error.field,
      values,
    };
  }

  if (error instanceof ContractNotFoundError || error instanceof InvoiceNotFoundError) {
    return {
      error: PAYMENT_INVOICE_NOT_FOUND_ERROR,
      values,
    };
  }

  if (error instanceof PaymentNotFoundError) {
    return {
      error: PAYMENT_NOT_FOUND_ERROR,
      values,
    };
  }

  if (error instanceof InvoiceNotEditableError) {
    return {
      error: PAYMENT_INVOICE_NOT_EDITABLE_ERROR,
      values,
    };
  }

  return {
    error: kind === "create" ? PAYMENT_CREATE_FAILED_ERROR : PAYMENT_UPDATE_FAILED_ERROR,
    values,
  };
}

export function mapPaymentDeleteError(error: unknown): { error: string } {
  if (error instanceof PaymentNotFoundError) {
    return { error: PAYMENT_NOT_FOUND_ERROR };
  }

  if (error instanceof InvoiceNotFoundError || error instanceof ContractNotFoundError) {
    return { error: PAYMENT_INVOICE_NOT_FOUND_ERROR };
  }

  if (error instanceof InvoiceNotEditableError) {
    return { error: PAYMENT_INVOICE_NOT_EDITABLE_ERROR };
  }

  return { error: PAYMENT_DELETE_FAILED_ERROR };
}
