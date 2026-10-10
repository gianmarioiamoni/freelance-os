// scripts/diagnose-neon-migration.ts
// READ-ONLY diagnostic script for Neon production migration P3009
// 
// Usage:
//   DATABASE_URL="<neon-production-url>" tsx scripts/diagnose-neon-migration.ts
//
// NEVER commits. NEVER writes to database. NEVER prints credentials.

import { Client } from "pg";

interface MigrationRecord {
  migration_name: string;
  checksum: string;
  started_at: Date;
  finished_at: Date | null;
  rolled_back_at: Date | null;
  applied_steps_count: number;
  logs: string | null;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  udt_name: string;
}

interface ConstraintInfo {
  constraint_name: string;
  table_name: string;
  constraint_type: string;
}

async function diagnoseMigration(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable not set");
    console.error("Usage: DATABASE_URL=<neon-url> tsx scripts/diagnose-neon-migration.ts");
    process.exit(1);
  }

  // Parse URL to verify target without exposing password
  const url = new URL(databaseUrl);
  const hostMasked = url.hostname.substring(0, 15) + "***" + url.hostname.slice(-20);
  const dbName = url.pathname.slice(1);

  console.log("=== NEON PRODUCTION MIGRATION DIAGNOSTICS ===");
  console.log("Target host (masked):", hostMasked);
  console.log("Target database:", dbName);
  console.log("Mode: READ-ONLY\n");

  // Verify expected target
  if (!url.hostname.includes("neon.tech") || dbName !== "freelanceos") {
    console.error("ERROR: DATABASE_URL does not match expected Neon production target");
    console.error("Expected: *.neon.tech/freelanceos");
    console.error(`Got: ${hostMasked}/${dbName}`);
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to Neon...");
    await client.connect();
    console.log("✓ Connected\n");

    // 1. Migration record status
    console.log("--- 1. MIGRATION RECORD ---");
    const migrationQuery = `
      SELECT 
        migration_name,
        checksum,
        started_at,
        finished_at,
        rolled_back_at,
        applied_steps_count,
        logs
      FROM "_prisma_migrations"
      WHERE migration_name = '20261008021638_contract_commitment_model'
    `;

    const migrationResult = await client.query<MigrationRecord>(migrationQuery);
    if (migrationResult.rows.length === 0) {
      console.log("⚠️  Migration record NOT FOUND in _prisma_migrations");
    } else {
      const record = migrationResult.rows[0];
      console.log("Migration name:", record.migration_name);
      console.log("Started at:", record.started_at);
      console.log("Finished at:", record.finished_at || "NULL (not finished)");
      console.log("Rolled back at:", record.rolled_back_at || "NULL");
      console.log("Applied steps:", record.applied_steps_count);
      console.log("Logs:", record.logs ? record.logs.substring(0, 200) + "..." : "NULL");
    }

    // 2. Enum CommitmentMode
    console.log("\n--- 2. ENUM CommitmentMode ---");
    const enumQuery = `
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'CommitmentMode'
      ) as exists
    `;
    const enumResult = await client.query<{ exists: boolean }>(enumQuery);
    console.log("CommitmentMode enum exists:", enumResult.rows[0].exists ? "YES" : "NO");

    if (enumResult.rows[0].exists) {
      const enumValuesQuery = `
        SELECT e.enumlabel 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'CommitmentMode'
        ORDER BY e.enumsortorder
      `;
      const enumValues = await client.query<{ enumlabel: string }>(enumValuesQuery);
      console.log("Enum values:", enumValues.rows.map((r) => r.enumlabel).join(", "));
    }

    // 3. Contract table columns
    console.log("\n--- 3. CONTRACT TABLE COLUMNS ---");
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'Contract'
        AND column_name IN (
          'monthlyContractedMinutes',
          'commitmentMode',
          'commitmentPercentage'
        )
      ORDER BY column_name
    `;
    const columnsResult = await client.query<ColumnInfo>(columnsQuery);

    if (columnsResult.rows.length === 0) {
      console.log("⚠️  NONE of the target columns found");
    } else {
      columnsResult.rows.forEach((col) => {
        console.log(`\nColumn: ${col.column_name}`);
        console.log(`  Type: ${col.data_type} (udt: ${col.udt_name})`);
        console.log(`  Nullable: ${col.is_nullable}`);
        console.log(`  Default: ${col.column_default || "NULL"}`);
      });
    }

    // 4. Contract record count
    console.log("\n--- 4. CONTRACT RECORDS ---");
    const countQuery = `SELECT COUNT(*) as count FROM "Contract"`;
    const countResult = await client.query<{ count: string }>(countQuery);
    console.log("Total Contract records:", countResult.rows[0].count);

    // 5. Foreign key constraints (Alert, Notification)
    console.log("\n--- 5. FOREIGN KEY CONSTRAINTS ---");
    const fkQuery = `
      SELECT 
        conname as constraint_name,
        conrelid::regclass as table_name,
        'FOREIGN KEY' as constraint_type
      FROM pg_constraint
      WHERE contype = 'f'
        AND conrelid::regclass::text IN ('Alert', 'Notification')
        AND conname LIKE '%clientId%' 
           OR conname LIKE '%contractId%'
           OR conname LIKE '%invoiceId%'
           OR conname LIKE '%alertId%'
      ORDER BY table_name, constraint_name
    `;
    const fkResult = await client.query<ConstraintInfo>(fkQuery);

    if (fkResult.rows.length === 0) {
      console.log("⚠️  NO matching foreign keys found (might have been dropped)");
    } else {
      fkResult.rows.forEach((fk) => {
        console.log(`${fk.table_name}.${fk.constraint_name}`);
      });
    }

    console.log("\n=== DIAGNOSIS COMPLETE ===");
  } catch (error) {
    console.error("\n❌ ERROR during diagnosis:");
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

diagnoseMigration().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
