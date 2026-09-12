// src/domain/client-errors.ts
export type ClientInputField =
  | "companyName"
  | "vatNumber"
  | "taxCode"
  | "address"
  | "contactName"
  | "email"
  | "phone"
  | "notes";

export class InvalidClientInputError extends Error {
  readonly field: ClientInputField;

  constructor(field: ClientInputField) {
    super("Invalid client input");
    this.name = "InvalidClientInputError";
    this.field = field;
  }
}

export class ClientNotFoundError extends Error {
  constructor() {
    super("Client not found");
    this.name = "ClientNotFoundError";
  }
}
