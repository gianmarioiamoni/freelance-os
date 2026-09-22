// src/domain/invoice-errors.ts
export type InvoiceInputField =
  | "invoiceDate"
  | "amount"
  | "currency"
  | "reference"
  | "paymentTermsDays"
  | "dueDate";

export class InvalidInvoiceInputError extends Error {
  readonly field: InvoiceInputField;

  constructor(field: InvoiceInputField) {
    super("Invalid invoice input");
    this.name = "InvalidInvoiceInputError";
    this.field = field;
  }
}
