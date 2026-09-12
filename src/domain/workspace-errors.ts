// src/domain/workspace-errors.ts
export class UnauthorizedWorkspaceAccessError extends Error {
  constructor() {
    super("Unauthorized workspace access");
    this.name = "UnauthorizedWorkspaceAccessError";
  }
}

export type WorkspaceCreationInputField = "name" | "timezone" | "currency";

export class InvalidWorkspaceCreationInputError extends Error {
  readonly field: WorkspaceCreationInputField;

  constructor(field: WorkspaceCreationInputField) {
    super("Invalid workspace creation input");
    this.name = "InvalidWorkspaceCreationInputError";
    this.field = field;
  }
}

export class FirstWorkspaceAlreadyExistsError extends Error {
  constructor() {
    super("First workspace already exists");
    this.name = "FirstWorkspaceAlreadyExistsError";
  }
}
