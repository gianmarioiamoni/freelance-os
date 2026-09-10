// src/infrastructure/persistence/map-prisma-error.ts
import { Prisma } from "@prisma/client";

import {
  ConstraintViolationError,
  ForeignKeyViolationError,
  InvalidPersistenceStateError,
  PersistenceError,
  UniqueConstraintViolationError,
} from "@/domain/persistence-errors";

const POSTGRES_UNIQUE_VIOLATION = "23505";
const POSTGRES_FOREIGN_KEY_VIOLATION = "23503";
const POSTGRES_CHECK_VIOLATION = "23514";
const POSTGRES_EXCLUSION_VIOLATION = "23P01";

function postgresCodeFromUnknown(error: Prisma.PrismaClientUnknownRequestError): string | null {
  const patterns = [
    /Code:\s*`([0-9A-Z]+)`/,
    /code:\s*"([0-9A-Z]+)"/i,
    /SqlState\(E?([0-9A-Z]+)\)/,
    /\b(23505|23503|23514|23P01)\b/,
  ];

  for (const pattern of patterns) {
    const match = error.message.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function mapPrismaError(error: unknown): never {
  if (error instanceof PersistenceError) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        throw new UniqueConstraintViolationError();
      case "P2003":
      case "P2014":
        throw new ForeignKeyViolationError();
      case "P2025":
        throw new InvalidPersistenceStateError("Required related record was not found");
      default:
        throw new InvalidPersistenceStateError(error.message);
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    const postgresCode = postgresCodeFromUnknown(error);

    if (postgresCode === POSTGRES_UNIQUE_VIOLATION) {
      throw new UniqueConstraintViolationError();
    }

    if (postgresCode === POSTGRES_FOREIGN_KEY_VIOLATION) {
      throw new ForeignKeyViolationError();
    }

    if (
      postgresCode === POSTGRES_CHECK_VIOLATION ||
      postgresCode === POSTGRES_EXCLUSION_VIOLATION
    ) {
      throw new ConstraintViolationError();
    }
  }

  throw new InvalidPersistenceStateError(
    error instanceof Error ? error.message : "Unknown persistence error",
  );
}

export async function withPersistenceErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    mapPrismaError(error);
  }
}
