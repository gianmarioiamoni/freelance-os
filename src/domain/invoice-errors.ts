// src/domain/invoice-errors.ts
export type InvoiceInputField =
  | "contractId"
  | "invoiceDate"
  | "amount"
  | "currency"
  | "reference"
  | "paymentTermsDays"
  | "dueDate"
  | "voidedAt"
  | "tracking";

export class InvalidInvoiceInputError extends Error {
  readonly field: InvoiceInputField;

  constructor(field: InvoiceInputField) {
    super("Invalid invoice input");
    this.name = "InvalidInvoiceInputError";
    this.field = field;
  }
}

export class InvoiceNotFoundError extends Error {
  constructor() {
    super("Invoice not found");
    this.name = "InvoiceNotFoundError";
  }
}

export class InvoiceNotEditableError extends Error {
  constructor() {
    super("VOID invoice cannot be edited");
    this.name = "InvoiceNotEditableError";
  }
}

export class InvoiceAlreadyVoidedError extends Error {
  constructor() {
    super("Invoice is already VOID");
    this.name = "InvoiceAlreadyVoidedError";
  }
}
