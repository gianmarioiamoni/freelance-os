// tests/integration/setup.ts
import { afterAll, beforeEach } from "vitest";

import { requireTestDatabaseUrl } from "./test-database-url";

process.env.DATABASE_URL = requireTestDatabaseUrl();
process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;

const { prisma } = await import("@/infrastructure/prisma/client");

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Notification",
      "Alert",
      "TimeEntry",
      "Contract",
      "Client",
      "WorkspaceSettings",
      "WorkspaceMember",
      "Workspace"
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await prisma.$disconnect();
});
