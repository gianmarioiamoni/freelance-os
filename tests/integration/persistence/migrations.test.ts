// tests/integration/persistence/migrations.test.ts
import { describe, expect, it } from "vitest";

import { prisma } from "./helpers";

describe("migration-based test schema", () => {
  it("runs against the committed Prisma migration chain", async () => {
    const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
      ORDER BY started_at
    `;

    expect(applied.map((row) => row.migration_name)).toEqual([
      "20260910231120_establish_prisma_foundation",
      "20260910231638_implement_core_persistence_schema",
      "20260911011900_establish_persistence_invariants",
      "20260911224009_establish_better_auth_persistence",
    ]);
  });

  it("creates Better Auth persistence tables", async () => {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('user', 'session', 'account', 'verification')
      ORDER BY tablename
    `;

    expect(tables.map((row) => row.tablename)).toEqual([
      "account",
      "session",
      "user",
      "verification",
    ]);
  });

  it("keeps EPIC-002 composite workspace foreign keys", async () => {
    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname
      FROM pg_constraint
      WHERE conname IN (
        'Alert_workspaceId_clientId_fkey',
        'Alert_workspaceId_contractId_fkey',
        'Notification_workspaceId_alertId_fkey'
      )
      ORDER BY conname
    `;

    expect(constraints.map((row) => row.conname)).toEqual([
      "Alert_workspaceId_clientId_fkey",
      "Alert_workspaceId_contractId_fkey",
      "Notification_workspaceId_alertId_fkey",
    ]);
  });
});
