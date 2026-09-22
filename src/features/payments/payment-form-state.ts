// src/features/payments/payment-form-state.ts
import type {
  PaymentCreateInput,
  PaymentUpdateInput,
} from "@/application/payments/payment-input";
import { PAYMENT_NOTES_MAX_LENGTH } from "@/application/payments/payment-input";
import type { PaymentInputField } from "@/domain/payment-errors";
import type { PaymentRecord } from "@/domain/persistence-types";
import { formatCalendarDate } from "@/features/contracts/contract-display";

export type PaymentFormValues = {
  paymentDate: string;
  amount: string;
  notes: string;
};

export type PaymentFormActionState = {
  error: string;
  field?: PaymentInputField;
  values: PaymentFormValues;
} | null;

export type PaymentFormAction = (
  previousState: PaymentFormActionState,
  formData: FormData,
) => Promise<PaymentFormActionState>;

export const EMPTY_PAYMENT_FORM_VALUES: PaymentFormValues = {
  paymentDate: "",
  amount: "",
  notes: "",
};

export const PAYMENT_FIELD_ERROR_MESSAGES: Record<PaymentInputField, string> = {
  id: "This payment could not be found.",
  workspaceId: "This payment could not be found.",
  invoiceId: "This invoice could not be found.",
  paymentDate: "Enter a valid payment date.",
  amount: "Enter an amount greater than 0 with at most 4 decimal places.",
  currency: "Payment currency must match the invoice currency.",
  notes: `Enter notes with at most ${PAYMENT_NOTES_MAX_LENGTH} characters.`,
};

export const PAYMENT_NOT_FOUND_ERROR = "This payment could not be found.";
export const PAYMENT_INVOICE_NOT_FOUND_ERROR = "This invoice could not be found.";
export const PAYMENT_INVOICE_NOT_EDITABLE_ERROR =
  "A void invoice cannot record, edit, or delete payments.";
export const PAYMENT_CREATE_FAILED_ERROR = "Unable to create the payment.";
export const PAYMENT_UPDATE_FAILED_ERROR = "Unable to update the payment.";
export const PAYMENT_DELETE_FAILED_ERROR = "Unable to delete the payment.";
export const PAYMENT_DELETE_CONFIRM_ERROR =
  "Confirm that you want to delete this payment.";

export { PAYMENT_NOTES_MAX_LENGTH };

export function readPaymentFormValues(formData: FormData): PaymentFormValues {
  return {
    paymentDate: String(formData.get("paymentDate") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export function toPaymentCreateInput(
  invoiceId: string,
  values: PaymentFormValues,
): PaymentCreateInput {
  return {
    invoiceId,
    paymentDate: values.paymentDate,
    amount: values.amount,
    notes: values.notes,
  };
}

export function toPaymentUpdateInput(values: PaymentFormValues): PaymentUpdateInput {
  return {
    paymentDate: values.paymentDate,
    amount: values.amount,
    notes: values.notes,
  };
}

export function toPaymentFormValues(payment: PaymentRecord): PaymentFormValues {
  return {
    paymentDate: formatCalendarDate(payment.paymentDate),
    amount: trimPaymentAmountInput(payment.amount),
    notes: payment.notes ?? "",
  };
}

export function createEmptyPaymentFormValues(paymentDate = ""): PaymentFormValues {
  return {
    ...EMPTY_PAYMENT_FORM_VALUES,
    paymentDate,
  };
}

function trimPaymentAmountInput(value: string): string {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/\.?0+$/, "");
}
