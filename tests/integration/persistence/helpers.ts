// tests/integration/persistence/helpers.ts
import { createRepositories, runInTransaction } from "@/infrastructure/persistence/create-repositories";
import { prisma } from "@/infrastructure/prisma/client";

export { prisma, runInTransaction };

export const repositories = createRepositories();

export function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
