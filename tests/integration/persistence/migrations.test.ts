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
    ]);
  });
});
