// scripts/neon-migration-recovery.ts
// Recovery script for failed Prisma migration 20261008021638_contract_commitment_model
//
// SCENARIO: Migration started but failed immediately (applied_steps_count = 0)
// SOLUTION: Mark as rolled-back, then let Prisma retry
//
// Usage:
//   DATABASE_URL="<neon-url>" tsx scripts/neon-migration-recovery.ts
//
// This script:
// 1. Verifies the target is Neon production
// 2. Confirms migration state (started but not finished, 0 steps applied)
// 3. Updates _prisma_migrations to mark the migration as rolled back
// 4. Allows subsequent `prisma migrate deploy` to retry

import { Client } from "pg";

interface MigrationRecord {
  migration_name: string;
  started_at: Date;
  finished_at: Date | null;
  rolled_back_at: Date | null;
  applied_steps_count: number;
}

async function recoverMigration(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const url = new URL(databaseUrl);
  const hostMasked = url.hostname.substring(0, 15) + "***" + url.hostname.slice(-20);
  const dbName = url.pathname.slice(1);

  console.log("=== NEON MIGRATION RECOVERY ===");
  console.log("Target host (masked):", hostMasked);
  console.log("Target database:", dbName);
  console.log("Migration:", "20261008021638_contract_commitment_model\n");

  // Verify expected target
  if (!url.hostname.includes("neon.tech") || dbName !== "freelanceos") {
    console.error("ERROR: DATABASE_URL does not match expected Neon production");
    console.error("Expected: *.neon.tech/freelanceos");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✓ Connected\n");

    // 1. Verify migration state
    console.log("Step 1: Verifying migration state...");
    const verifyQuery = `
      SELECT 
        migration_name,
        started_at,
        finished_at,
        rolled_back_at,
        applied_steps_count
      FROM "_prisma_migrations"
      WHERE migration_name = '20261008021638_contract_commitment_model'
    `;

    const verifyResult = await client.query<MigrationRecord>(verifyQuery);

    if (verifyResult.rows.length === 0) {
      console.error("ERROR: Migration record not found");
      process.exit(1);
    }

    const record = verifyResult.rows[0];
    console.log("  Migration name:", record.migration_name);
    console.log("  Started:", record.started_at);
    console.log("  Finished:", record.finished_at || "NULL");
    console.log("  Rolled back:", record.rolled_back_at || "NULL");
    console.log("  Applied steps:", record.applied_steps_count);

    // Verify expectations
    if (record.finished_at !== null) {
      console.error("\nERROR: Migration shows as finished. Cannot recover.");
      process.exit(1);
    }

    if (record.rolled_back_at !== null) {
      console.log("\n✓ Migration already marked as rolled back");
      console.log("You can now run: prisma migrate deploy");
      process.exit(0);
    }

    if (record.applied_steps_count !== 0) {
      console.error("\nERROR: Migration has applied_steps_count =", record.applied_steps_count);
      console.error("This recovery assumes 0 steps applied. Manual intervention required.");
      process.exit(1);
    }

    // 2. Mark migration as rolled back
    console.log("\nStep 2: Marking migration as rolled back...");
    const rollbackQuery = `
      UPDATE "_prisma_migrations"
      SET rolled_back_at = NOW()
      WHERE migration_name = '20261008021638_contract_commitment_model'
        AND finished_at IS NULL
        AND rolled_back_at IS NULL
        AND applied_steps_count = 0
    `;

    const rollbackResult = await client.query(rollbackQuery);

    if (rollbackResult.rowCount === 0) {
      console.error("ERROR: No rows updated. Migration state may have changed.");
      process.exit(1);
    }

    console.log("✓ Migration marked as rolled back");

    // 3. Verify final state
    console.log("\nStep 3: Verifying final state...");
    const finalResult = await client.query<MigrationRecord>(verifyQuery);
    const finalRecord = finalResult.rows[0];

    console.log("  Rolled back at:", finalRecord.rolled_back_at);

    console.log("\n=== RECOVERY COMPLETE ===");
    console.log("\nNext steps:");
    console.log("1. Run locally: npx prisma migrate deploy");
    console.log("2. If successful, trigger Vercel redeploy");
    console.log("3. Vercel build will run: prisma migrate deploy");
  } catch (error) {
    console.error("\n❌ ERROR during recovery:");
    if (error instanceof Error) {
      console.error(error.message);
      if ("code" in error) {
        console.error("Error code:", (error as any).code);
      }
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

recoverMigration().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
