// scripts/final-neon-audit.ts
// Complete audit before production recovery
//
// Usage:
//   DATABASE_URL="<neon-url>" tsx scripts/final-neon-audit.ts

import { Client } from "pg";

async function auditNeon(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL not set");
    process.exit(1);
  }

  const url = new URL(databaseUrl);
  const hostMasked = url.hostname.substring(0, 15) + "***" + url.hostname.slice(-20);
  const dbName = url.pathname.slice(1);

  console.log("=== FINAL NEON AUDIT ===");
  console.log("Target host:", hostMasked);
  console.log("Target database:", dbName);
  console.log();

  if (!url.hostname.includes("neon.tech") || dbName !== "freelanceos") {
    console.error("ERROR: Target mismatch");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✓ Connected\n");

    // 1. Full migration log
    console.log("--- 1. MIGRATION FULL LOG ---\n");
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
    const migrationResult = await client.query(migrationQuery);

    if (migrationResult.rows.length === 0) {
      console.log("Migration record: NOT FOUND");
    } else {
      const m = migrationResult.rows[0];
      console.log("Migration name:", m.migration_name);
      console.log("Checksum:", m.checksum);
      console.log("Started at:", m.started_at);
      console.log("Finished at:", m.finished_at || "NULL");
      console.log("Rolled back at:", m.rolled_back_at || "NULL");
      console.log("Applied steps:", m.applied_steps_count);
      console.log("\nFull logs:");
      console.log(m.logs || "NULL");
    }

    // 2. Exact record counts
    console.log("\n--- 2. EXACT RECORD COUNTS ---\n");

    const tables = [
      "Workspace",
      "WorkspaceMember",
      "Client",
      "Contract",
      "TimeEntry",
      "Invoice",
      "Payment",
      "Alert",
      "Notification",
    ];

    const counts: Record<string, number> = {};

    for (const table of tables) {
      const result = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM "${table}"`
      );
      counts[table] = parseInt(result.rows[0].count, 10);
      console.log(`${table}: ${counts[table]}`);
    }

    // 3. Contract-dependent counts
    console.log("\n--- 3. CONTRACT-DEPENDENT RECORDS ---\n");

    const contractDeps = {
      notification_via_alert: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Notification" WHERE "alertId" IN (SELECT id FROM "Alert" WHERE "contractId" IS NOT NULL)'
      ),
      alert_contract: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Alert" WHERE "contractId" IS NOT NULL'
      ),
      payment_via_invoice: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Payment" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "contractId" IS NOT NULL)'
      ),
      invoice_contract: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Invoice" WHERE "contractId" IS NOT NULL'
      ),
      timeEntry_contract: await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "TimeEntry" WHERE "contractId" IS NOT NULL'
      ),
    };

    console.log(
      `Notification (via Alert.contractId): ${contractDeps.notification_via_alert.rows[0].count}`
    );
    console.log(`Alert (contractId set): ${contractDeps.alert_contract.rows[0].count}`);
    console.log(
      `Payment (via Invoice.contractId): ${contractDeps.payment_via_invoice.rows[0].count}`
    );
    console.log(`Invoice (contractId set): ${contractDeps.invoice_contract.rows[0].count}`);
    console.log(`TimeEntry (contractId set): ${contractDeps.timeEntry_contract.rows[0].count}`);
    console.log(`Contract: ${counts.Contract}`);

    const totalDeps =
      parseInt(contractDeps.notification_via_alert.rows[0].count, 10) +
      parseInt(contractDeps.alert_contract.rows[0].count, 10) +
      parseInt(contractDeps.payment_via_invoice.rows[0].count, 10) +
      parseInt(contractDeps.invoice_contract.rows[0].count, 10) +
      parseInt(contractDeps.timeEntry_contract.rows[0].count, 10) +
      counts.Contract;

    console.log(`\nTotal records to delete: ${totalDeps}`);

    // 4. All foreign keys
    console.log("\n--- 4. ALL FOREIGN KEYS (INBOUND/OUTBOUND) ---\n");

    const fkQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND (
          tc.table_name IN ('Contract', 'Invoice', 'Payment', 'TimeEntry', 'Alert', 'Notification')
          OR ccu.table_name IN ('Contract', 'Invoice', 'Payment', 'TimeEntry', 'Alert', 'Notification')
        )
      ORDER BY tc.table_name, tc.constraint_name
    `;

    const fkResult = await client.query(fkQuery);

    const fkByTable = new Map<string, any[]>();
    for (const fk of fkResult.rows) {
      if (!fkByTable.has(fk.table_name)) {
        fkByTable.set(fk.table_name, []);
      }
      fkByTable.get(fk.table_name)!.push(fk);
    }

    for (const [table, fks] of fkByTable.entries()) {
      console.log(`\n${table}:`);
      for (const fk of fks) {
        console.log(
          `  ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`
        );
      }
    }

    // 5. Triggers and constraints
    console.log("\n--- 5. TRIGGERS AND CONSTRAINTS ---\n");

    const triggersQuery = `
      SELECT 
        event_object_table,
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table IN ('Contract', 'Invoice', 'Payment', 'TimeEntry', 'Alert', 'Notification')
      ORDER BY event_object_table, trigger_name
    `;

    const triggersResult = await client.query(triggersQuery);

    if (triggersResult.rows.length === 0) {
      console.log("No triggers found on target tables");
    } else {
      for (const trigger of triggersResult.rows) {
        console.log(`${trigger.event_object_table}.${trigger.trigger_name}`);
        console.log(`  Event: ${trigger.event_manipulation}`);
        console.log(`  Action: ${trigger.action_statement}`);
      }
    }

    // Check constraints
    const checkQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('Contract', 'Invoice', 'Payment', 'TimeEntry', 'Alert', 'Notification')
      ORDER BY tc.table_name, tc.constraint_name
    `;

    const checkResult = await client.query(checkQuery);

    if (checkResult.rows.length > 0) {
      console.log("\nCHECK constraints:");
      for (const check of checkResult.rows) {
        console.log(`${check.table_name}.${check.constraint_name}`);
        console.log(`  ${check.check_clause}`);
      }
    }

    // 6. Neon backup status
    console.log("\n--- 6. NEON BACKUP VERIFICATION ---\n");
    console.log("Neon PITR availability:");
    console.log("- Automatic point-in-time restore");
    console.log("- Retention depends on plan tier");
    console.log("- Restore via Neon Console → Project → Backups");
    console.log("\nTo verify current backup window:");
    console.log("1. Open Neon Console");
    console.log("2. Navigate to Project → Backups");
    console.log("3. Check earliest restore point timestamp");
    console.log("\n⚠️  Manual backup recommended before destructive operations:");
    console.log("   pg_dump -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump");

    console.log("\n=== AUDIT COMPLETE ===");
  } catch (error) {
    console.error("\n❌ ERROR:");
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

auditNeon().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
