// src/application/admin/admin-errors.ts

export class UnauthorizedAdminAccessError extends Error {
  constructor() {
    super("Unauthorized admin access");
    this.name = "UnauthorizedAdminAccessError";
  }
}

export class InvalidAdminConfigurationError extends Error {
  constructor() {
    super("Invalid admin configuration");
    this.name = "InvalidAdminConfigurationError";
  }
}
