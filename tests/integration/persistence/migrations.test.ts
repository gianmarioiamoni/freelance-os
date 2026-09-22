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
      "20260912180000_index_workspace_member_user_id",
      "20260922010000_add_time_entry_commercial_snapshot",
      "20260922210000_add_invoice_tracking",
    ]);
  });

  it("persists non-null TimeEntry commercial snapshot columns", async () => {
    const columns = await prisma.$queryRaw<Array<{ column_name: string; is_nullable: string }>>`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'TimeEntry'
        AND column_name IN ('snapshotBillingModel', 'snapshotRate', 'snapshotCurrency')
      ORDER BY column_name
    `;

    expect(columns).toEqual([
      { column_name: "snapshotBillingModel", is_nullable: "NO" },
      { column_name: "snapshotCurrency", is_nullable: "NO" },
      { column_name: "snapshotRate", is_nullable: "NO" },
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

  it("creates Invoice tracking table with snapshot and VOID columns", async () => {
    const columns = await prisma.$queryRaw<Array<{ column_name: string; is_nullable: string }>>`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Invoice'
        AND column_name IN (
          'workspaceId',
          'contractId',
          'invoiceDate',
          'amount',
          'currency',
          'reference',
          'paymentTermsDays',
          'dueDate',
          'voidedAt'
        )
      ORDER BY column_name
    `;

    expect(columns).toEqual([
      { column_name: "amount", is_nullable: "NO" },
      { column_name: "contractId", is_nullable: "NO" },
      { column_name: "currency", is_nullable: "NO" },
      { column_name: "dueDate", is_nullable: "YES" },
      { column_name: "invoiceDate", is_nullable: "NO" },
      { column_name: "paymentTermsDays", is_nullable: "YES" },
      { column_name: "reference", is_nullable: "YES" },
      { column_name: "voidedAt", is_nullable: "YES" },
      { column_name: "workspaceId", is_nullable: "NO" },
    ]);
  });

  it("keeps Invoice workspace-scoped Contract restrict and amount/dueDate checks", async () => {
    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname
      FROM pg_constraint
      WHERE conname IN (
        'Invoice_workspaceId_contractId_fkey',
        'Invoice_amount_positive',
        'Invoice_dueDate_terms_consistency'
      )
      ORDER BY conname
    `;

    expect(constraints.map((row) => row.conname)).toEqual([
      "Invoice_amount_positive",
      "Invoice_dueDate_terms_consistency",
      "Invoice_workspaceId_contractId_fkey",
    ]);
  });

  it("indexes WorkspaceMember lookups by userId", async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'WorkspaceMember'
      ORDER BY indexname
    `;

    expect(indexes.map((row) => row.indexname)).toEqual([
      "WorkspaceMember_pkey",
      "WorkspaceMember_userId_idx",
    ]);
  });
});
