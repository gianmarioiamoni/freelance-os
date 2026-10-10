// scripts/execute-neon-recovery.ts
// Execute migration recovery on Neon production
//
// CRITICAL: This script deletes application data
// Target: Neon PostgreSQL freelanceos database
//
// Usage:
//   DATABASE_URL="<neon-url>" tsx scripts/execute-neon-recovery.ts
//
// This script performs:
// 1. Verification of target database (exact hostname match)
// 2. Count records to be deleted
// 3. Interactive confirmation required
// 4. Deletion of Contract-dependent data in transactional order
// 5. Prints next Prisma command (does NOT execute it)

import { Client } from "pg";
import * as readline from "readline";

const EXPECTED_HOSTNAME = "ep-empty-forest-b1xxzkrr-pooler.c-5.eu-central-1.aws.neon.tech";
const EXPECTED_DATABASE = "freelanceos";
const EXPECTED_COUNTS = {
  notification: 3,
  alert: 3,
  payment: 0,
  invoice: 1,
  timeEntry: 10,
  contract: 3,
};
const TOTAL_EXPECTED = 20;

function promptConfirmation(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function executeRecovery(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);

  console.log("=== NEON PRODUCTION RECOVERY ===");
  console.log("Target hostname:", url.hostname);
  console.log("Target database:", dbName);
  console.log();

  // Verify exact expected target
  if (url.hostname !== EXPECTED_HOSTNAME || dbName !== EXPECTED_DATABASE) {
    console.error("❌ ERROR: DATABASE_URL does not match expected Neon production");
    console.error(`Expected hostname: ${EXPECTED_HOSTNAME}`);
    console.error(`Got hostname: ${url.hostname}`);
    console.error(`Expected database: ${EXPECTED_DATABASE}`);
    console.error(`Got database: ${dbName}`);
    process.exit(1);
  }

  console.log("✓ Target verified\n");
  console.log("⚠️  WARNING: This operation will DELETE application data");
  console.log();

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✓ Connected\n");

    // Step 1: Verify migration state
    console.log("--- Step 1: Verifying migration state ---");
    const migrationQuery = `
      SELECT started_at, finished_at, rolled_back_at, applied_steps_count
      FROM "_prisma_migrations"
      WHERE migration_name = '20261008021638_contract_commitment_model'
    `;
    const migrationResult = await client.query(migrationQuery);

    if (migrationResult.rows.length === 0) {
      console.error("❌ ERROR: Migration record not found");
      process.exit(1);
    }

    const migration = migrationResult.rows[0];
    console.log("Migration started:", migration.started_at);
    console.log("Migration finished:", migration.finished_at || "NULL");
    console.log("Migration rolled back:", migration.rolled_back_at || "NULL");
    console.log("Applied steps:", migration.applied_steps_count);

    if (migration.finished_at !== null) {
      console.error("\n❌ ERROR: Migration already finished. Cannot recover.");
      process.exit(1);
    }

    if (migration.rolled_back_at !== null) {
      console.log("\n✓ Migration already marked as rolled back");
      console.log("\nNext step:");
      console.log("  pnpm exec prisma migrate deploy");
      process.exit(0);
    }

    console.log("✓ Migration eligible for recovery\n");

    // Step 2: Count records to be deleted
    console.log("--- Step 2: Counting records to be deleted ---");
    const counts = {
      notification: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Notification" WHERE "alertId" IN (SELECT id FROM "Alert" WHERE "contractId" IS NOT NULL)'
      ),
      alert: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Alert" WHERE "contractId" IS NOT NULL'
      ),
      payment: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Payment" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "contractId" IS NOT NULL)'
      ),
      invoice: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Invoice" WHERE "contractId" IS NOT NULL'
      ),
      timeEntry: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "TimeEntry" WHERE "contractId" IS NOT NULL'
      ),
      contract: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Contract"'
      ),
    };

    const actualCounts = {
      notification: parseInt(counts.notification.rows[0].count, 10),
      alert: parseInt(counts.alert.rows[0].count, 10),
      payment: parseInt(counts.payment.rows[0].count, 10),
      invoice: parseInt(counts.invoice.rows[0].count, 10),
      timeEntry: parseInt(counts.timeEntry.rows[0].count, 10),
      contract: parseInt(counts.contract.rows[0].count, 10),
    };

    const totalActual =
      actualCounts.notification +
      actualCounts.alert +
      actualCounts.payment +
      actualCounts.invoice +
      actualCounts.timeEntry +
      actualCounts.contract;

    console.log(`Notification: ${actualCounts.notification}`);
    console.log(`Alert: ${actualCounts.alert}`);
    console.log(`Payment: ${actualCounts.payment}`);
    console.log(`Invoice: ${actualCounts.invoice}`);
    console.log(`TimeEntry: ${actualCounts.timeEntry}`);
    console.log(`Contract: ${actualCounts.contract}`);
    console.log(`TOTAL: ${totalActual}`);

    // Verify counts match expected
    if (
      actualCounts.notification !== EXPECTED_COUNTS.notification ||
      actualCounts.alert !== EXPECTED_COUNTS.alert ||
      actualCounts.payment !== EXPECTED_COUNTS.payment ||
      actualCounts.invoice !== EXPECTED_COUNTS.invoice ||
      actualCounts.timeEntry !== EXPECTED_COUNTS.timeEntry ||
      actualCounts.contract !== EXPECTED_COUNTS.contract ||
      totalActual !== TOTAL_EXPECTED
    ) {
      console.error("\n❌ ERROR: Record counts do not match expected values");
      console.error("\nExpected:");
      console.error(`  Notification: ${EXPECTED_COUNTS.notification}`);
      console.error(`  Alert: ${EXPECTED_COUNTS.alert}`);
      console.error(`  Payment: ${EXPECTED_COUNTS.payment}`);
      console.error(`  Invoice: ${EXPECTED_COUNTS.invoice}`);
      console.error(`  TimeEntry: ${EXPECTED_COUNTS.timeEntry}`);
      console.error(`  Contract: ${EXPECTED_COUNTS.contract}`);
      console.error(`  TOTAL: ${TOTAL_EXPECTED}`);
      console.error("\nAborting recovery. Database state may have changed.");
      process.exit(1);
    }

    console.log("✓ Counts verified\n");

    // Step 3: Interactive confirmation
    console.log("--- Step 3: Confirmation required ---");
    console.log("⚠️  This operation will PERMANENTLY DELETE 20 records:");
    console.log("   - 3 Notification");
    console.log("   - 3 Alert");
    console.log("   - 0 Payment");
    console.log("   - 1 Invoice");
    console.log("   - 10 TimeEntry");
    console.log("   - 3 Contract");
    console.log();
    console.log("This action is IRREVERSIBLE after transaction commit.");
    console.log("Ensure you have a backup before proceeding.");
    console.log();

    const confirmation = await promptConfirmation(
      'Type "DELETE 20 RECORDS" (without quotes) to proceed: '
    );

    if (confirmation !== "DELETE 20 RECORDS") {
      console.log("\n❌ Confirmation failed. Aborting recovery.");
      console.log(`Expected: "DELETE 20 RECORDS"`);
      console.log(`Got: "${confirmation}"`);
      process.exit(1);
    }

    console.log("✓ Confirmation received\n");

    // Step 4: Delete data in transaction
    console.log("--- Step 4: Deleting Contract-dependent data ---");
    await client.query("BEGIN");
    console.log("Transaction started");

    try {
      // Delete in dependency order: leaf nodes first
      const deleteNotification = await client.query(
        'DELETE FROM "Notification" WHERE "alertId" IN (SELECT id FROM "Alert" WHERE "contractId" IS NOT NULL)'
      );
      console.log(`✓ Deleted ${deleteNotification.rowCount} Notification records`);

      const deleteAlert = await client.query(
        'DELETE FROM "Alert" WHERE "contractId" IS NOT NULL'
      );
      console.log(`✓ Deleted ${deleteAlert.rowCount} Alert records`);

      const deletePayment = await client.query(
        'DELETE FROM "Payment" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "contractId" IS NOT NULL)'
      );
      console.log(`✓ Deleted ${deletePayment.rowCount} Payment records`);

      const deleteInvoice = await client.query(
        'DELETE FROM "Invoice" WHERE "contractId" IS NOT NULL'
      );
      console.log(`✓ Deleted ${deleteInvoice.rowCount} Invoice records`);

      const deleteTimeEntry = await client.query(
        'DELETE FROM "TimeEntry" WHERE "contractId" IS NOT NULL'
      );
      console.log(`✓ Deleted ${deleteTimeEntry.rowCount} TimeEntry records`);

      const deleteContract = await client.query('DELETE FROM "Contract"');
      console.log(`✓ Deleted ${deleteContract.rowCount} Contract records`);

      await client.query("COMMIT");
      console.log("\n✓ Transaction committed successfully");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("\n❌ Transaction rolled back due to error");
      throw error;
    }

    // Step 5: Verify final state
    console.log("\n--- Step 5: Verifying final state ---");

    const finalCounts = {
      contract: await client.query<{ count: string }>('SELECT COUNT(*) as count FROM "Contract"'),
      timeEntry: await client.query<{ count: string }>('SELECT COUNT(*) as count FROM "TimeEntry"'),
      invoice: await client.query<{ count: string }>('SELECT COUNT(*) as count FROM "Invoice"'),
      alert: await client.query<{ count: string }>('SELECT COUNT(*) as count FROM "Alert"'),
      notification: await client.query<{ count: string }>('SELECT COUNT(*) as count FROM "Notification"'),
    };

    console.log(`Remaining Contract: ${finalCounts.contract.rows[0].count}`);
    console.log(`Remaining TimeEntry: ${finalCounts.timeEntry.rows[0].count}`);
    console.log(`Remaining Invoice: ${finalCounts.invoice.rows[0].count}`);
    console.log(`Remaining Alert: ${finalCounts.alert.rows[0].count}`);
    console.log(`Remaining Notification: ${finalCounts.notification.rows[0].count}`);

    console.log("\n=== RECOVERY PHASE 1 COMPLETE ===");
    console.log("\n⚠️  Next steps (execute manually):");
    console.log();
    console.log("1. Mark migration as rolled back:");
    console.log("   pnpm exec prisma migrate resolve --rolled-back 20261008021638_contract_commitment_model");
    console.log();
    console.log("2. Deploy migration:");
    console.log("   pnpm exec prisma migrate deploy");
    console.log();
    console.log("3. Verify schema:");
    console.log('   psql -c "\\d \\"Contract\\""');
    console.log();
    console.log("4. Trigger Vercel redeploy");
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

executeRecovery().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
