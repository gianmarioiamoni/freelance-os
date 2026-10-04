// tests/unit/application/admin/mock-prisma-transaction.ts
import { prisma } from "@/infrastructure/prisma/client";
import { vi } from "vitest";

export function mockPrismaTransactionAsPassthrough(): void {
  vi.spyOn(prisma, "$transaction").mockImplementation(async (arg) => {
    if (typeof arg !== "function") {
      throw new Error("Expected interactive transaction");
    }

    return arg(prisma);
  });
}
