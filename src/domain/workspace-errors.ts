// src/domain/workspace-errors.ts
export class UnauthorizedWorkspaceAccessError extends Error {
  constructor() {
    super("Unauthorized workspace access");
    this.name = "UnauthorizedWorkspaceAccessError";
  }
}
