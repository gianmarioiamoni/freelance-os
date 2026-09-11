// tests/integration/setup.ts
import { afterAll, beforeEach } from "vitest";

import { requireTestDatabaseUrl } from "./test-database-url";

process.env.DATABASE_URL = requireTestDatabaseUrl();
process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ?? "test-better-auth-secret-32-characters-min";
process.env.BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

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
      "Workspace",
      "session",
      "account",
      "verification",
      "user"
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await prisma.$disconnect();
});
