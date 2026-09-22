// src/domain/payment-errors.ts
export type PaymentInputField =
  | "id"
  | "workspaceId"
  | "invoiceId"
  | "paymentDate"
  | "amount"
  | "currency"
  | "notes";

export class InvalidPaymentInputError extends Error {
  readonly field: PaymentInputField;

  constructor(field: PaymentInputField) {
    super("Invalid payment input");
    this.name = "InvalidPaymentInputError";
    this.field = field;
  }
}

export class PaymentNotFoundError extends Error {
  constructor() {
    super("Payment not found");
    this.name = "PaymentNotFoundError";
  }
}
