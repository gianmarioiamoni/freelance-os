// tests/unit/infrastructure/map-prisma-error.test.ts
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  ConstraintViolationError,
  ForeignKeyViolationError,
  RecordNotFoundError,
  UniqueConstraintViolationError,
} from "@/domain/persistence-errors";
import { mapPrismaError } from "@/infrastructure/persistence/map-prisma-error";

describe("mapPrismaError", () => {
  it("maps unique constraint failures", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.19.3",
    });

    expect(() => mapPrismaError(error)).toThrow(UniqueConstraintViolationError);
  });

  it("maps foreign key failures", () => {
    const error = new Prisma.PrismaClientKnownRequestError("FK failed", {
      code: "P2003",
      clientVersion: "6.19.3",
    });

    expect(() => mapPrismaError(error)).toThrow(ForeignKeyViolationError);
  });

  it("maps PostgreSQL check violations", () => {
    const error = new Prisma.PrismaClientUnknownRequestError(
      'Raw query failed. Code: `23514`. Message: `check constraint`',
      { clientVersion: "6.19.3" },
    );

    expect(() => mapPrismaError(error)).toThrow(ConstraintViolationError);
  });

  it("maps PostgreSQL exclusion violations", () => {
    const error = new Prisma.PrismaClientUnknownRequestError(
      'Raw query failed. Code: `23P01`. Message: `exclusion constraint`',
      { clientVersion: "6.19.3" },
    );

    expect(() => mapPrismaError(error)).toThrow(ConstraintViolationError);
  });

  it("rethrows persistence errors", () => {
    const error = new RecordNotFoundError("Client", "missing");
    expect(() => mapPrismaError(error)).toThrow(error);
  });
});
