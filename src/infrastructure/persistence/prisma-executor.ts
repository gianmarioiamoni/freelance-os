// src/infrastructure/persistence/prisma-executor.ts
import type { Prisma, PrismaClient } from "@prisma/client";

export type PrismaExecutor = PrismaClient | Prisma.TransactionClient;
