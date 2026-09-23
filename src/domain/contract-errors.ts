// src/domain/contract-errors.ts
export type ContractInputField =
  | "clientId"
  | "validFrom"
  | "validTo"
  | "billingModel"
  | "rate"
  | "currency"
  | "monthlyContractedHours"
  | "allocatedMinutes"
  | "paymentTermsDays"
  | "paymentTermsNote";

export class InvalidContractInputError extends Error {
  readonly field: ContractInputField;

  constructor(field: ContractInputField) {
    super("Invalid contract input");
    this.name = "InvalidContractInputError";
    this.field = field;
  }
}

export class InvalidContractPeriodError extends Error {
  constructor() {
    super("Invalid contract period");
    this.name = "InvalidContractPeriodError";
  }
}

export class OverlappingContractError extends Error {
  constructor() {
    super("Contract period overlaps another contract for this client");
    this.name = "OverlappingContractError";
  }
}

export class ContractNotFoundError extends Error {
  constructor() {
    super("Contract not found");
    this.name = "ContractNotFoundError";
  }
}

export class ClientArchivedError extends Error {
  constructor() {
    super("Client is archived");
    this.name = "ClientArchivedError";
  }
}

export class ContractCurrencyImmutableError extends Error {
  constructor() {
    super("Contract currency cannot change after an invoice exists");
    this.name = "ContractCurrencyImmutableError";
  }
}
