// src/domain/time-entry-errors.ts

export type TimeEntryInputField =
  | "clientId"
  | "contractId"
  | "workDate"
  | "durationMinutes"
  | "description"
  | "billable";

export class TimeEntryNotFoundError extends Error {
  constructor() {
    super("Time entry not found");
    this.name = "TimeEntryNotFoundError";
  }
}

export class InvalidDurationError extends Error {
  constructor() {
    super("Duration must be between 1 and 1440 minutes");
    this.name = "InvalidDurationError";
  }
}

export class ContractNotValidForDateError extends Error {
  constructor() {
    super("Contract is not valid for the work date");
    this.name = "ContractNotValidForDateError";
  }
}

export class WorkspaceAccessDeniedError extends Error {
  constructor() {
    super("Access to workspace denied");
    this.name = "WorkspaceAccessDeniedError";
  }
}

export class ForeignResourceAccessError extends Error {
  constructor() {
    super("Resource does not belong to your workspace");
    this.name = "ForeignResourceAccessError";
  }
}

export class InvalidTimeEntryInputError extends Error {
  readonly field: TimeEntryInputField;

  constructor(field: TimeEntryInputField) {
    super("Invalid time entry input");
    this.name = "InvalidTimeEntryInputError";
    this.field = field;
  }
}