// src/infrastructure/prisma/client.ts
import "server-only";

import { PrismaClient } from "@prisma/client";

function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
