// src/domain/persistence-errors.ts

export type PersistenceErrorCode =
  | "RECORD_NOT_FOUND"
  | "UNIQUE_CONSTRAINT_VIOLATION"
  | "FOREIGN_KEY_VIOLATION"
  | "CONSTRAINT_VIOLATION"
  | "INVALID_PERSISTENCE_STATE";

export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;

  constructor(code: PersistenceErrorCode, message: string) {
    super(message);
    this.name = "PersistenceError";
    this.code = code;
  }
}

export class RecordNotFoundError extends PersistenceError {
  constructor(entity: string, id: string) {
    super("RECORD_NOT_FOUND", `${entity} not found: ${id}`);
    this.name = "RecordNotFoundError";
  }
}

export class UniqueConstraintViolationError extends PersistenceError {
  constructor(message = "Unique constraint violated") {
    super("UNIQUE_CONSTRAINT_VIOLATION", message);
    this.name = "UniqueConstraintViolationError";
  }
}

export class ForeignKeyViolationError extends PersistenceError {
  constructor(message = "Foreign key constraint violated") {
    super("FOREIGN_KEY_VIOLATION", message);
    this.name = "ForeignKeyViolationError";
  }
}

export class ConstraintViolationError extends PersistenceError {
  constructor(message = "Database constraint violated") {
    super("CONSTRAINT_VIOLATION", message);
    this.name = "ConstraintViolationError";
  }
}

export class InvalidPersistenceStateError extends PersistenceError {
  constructor(message = "Invalid persistence state") {
    super("INVALID_PERSISTENCE_STATE", message);
    this.name = "InvalidPersistenceStateError";
  }
}
