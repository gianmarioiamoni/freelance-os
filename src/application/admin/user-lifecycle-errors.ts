// src/application/admin/user-lifecycle-errors.ts
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = "UserNotFoundError";
  }
}

export class AdminSelfProtectionError extends Error {
  constructor(operation: string) {
    super(`Admin cannot ${operation} itself`);
    this.name = "AdminSelfProtectionError";
  }
}

export class UserAlreadyDisabledError extends Error {
  constructor(userId: string) {
    super(`User already disabled: ${userId}`);
    this.name = "UserAlreadyDisabledError";
  }
}

export class UserNotDisabledError extends Error {
  constructor(userId: string) {
    super(`User not disabled: ${userId}`);
    this.name = "UserNotDisabledError";
  }
}

export class UserAlreadyDeletedError extends Error {
  constructor(userId: string) {
    super(`User already deleted: ${userId}`);
    this.name = "UserAlreadyDeletedError";
  }
}

export class UserDeletedError extends Error {
  constructor(userId: string) {
    super(`User is deleted: ${userId}`);
    this.name = "UserDeletedError";
  }
}
