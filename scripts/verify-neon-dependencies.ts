// scripts/verify-neon-dependencies.ts
// Verify all foreign key dependencies before data deletion
//
// Usage:
//   DATABASE_URL="<neon-url>" tsx scripts/verify-neon-dependencies.ts

import { Client } from "pg";

interface ForeignKey {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface TableCount {
  table_name: string;
  count: number;
}

async function verifyDependencies(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const url = new URL(databaseUrl);
  const hostMasked = url.hostname.substring(0, 15) + "***" + url.hostname.slice(-20);
  const dbName = url.pathname.slice(1);

  console.log("=== NEON DEPENDENCY VERIFICATION ===");
  console.log("Target host (masked):", hostMasked);
  console.log("Target database:", dbName);
  console.log();

  if (!url.hostname.includes("neon.tech") || dbName !== "freelanceos") {
    console.error("ERROR: DATABASE_URL does not match expected target");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✓ Connected\n");

    // 1. Get all foreign keys
    console.log("--- FOREIGN KEY CONSTRAINTS ---\n");
    const fkQuery = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `;

    const fkResult = await client.query<ForeignKey>(fkQuery);

    // Group by table
    const fkByTable = new Map<string, ForeignKey[]>();
    for (const fk of fkResult.rows) {
      if (!fkByTable.has(fk.table_name)) {
        fkByTable.set(fk.table_name, []);
      }
      fkByTable.get(fk.table_name)!.push(fk);
    }

    // Print relevant tables
    const relevantTables = [
      "Contract",
      "Invoice",
      "Payment",
      "TimeEntry",
      "Alert",
      "Notification",
    ];

    for (const table of relevantTables) {
      const fks = fkByTable.get(table) || [];
      if (fks.length > 0) {
        console.log(`${table}:`);
        for (const fk of fks) {
          console.log(
            `  ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`
          );
        }
        console.log();
      }
    }

    // 2. Count records in each table
    console.log("--- RECORD COUNTS ---\n");
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
      "User",
      "Session",
    ];

    for (const table of tables) {
      const countQuery = `SELECT COUNT(*) as count FROM "${table}"`;
      const countResult = await client.query<{ count: string }>(countQuery);
      console.log(`${table}: ${countResult.rows[0].count}`);
    }

    // 3. Check for records referencing Contract
    console.log("\n--- CONTRACT REFERENCES ---\n");

    const contractIds = await client.query<{ id: string }>(
      'SELECT id FROM "Contract"'
    );

    if (contractIds.rows.length > 0) {
      console.log(`Found ${contractIds.rows.length} Contract records\n`);

      // TimeEntry
      const timeEntryCount = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "TimeEntry" WHERE "contractId" IN (SELECT id FROM "Contract")'
      );
      console.log(`TimeEntry referencing Contracts: ${timeEntryCount.rows[0].count}`);

      // Invoice
      const invoiceCount = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Invoice" WHERE "contractId" IN (SELECT id FROM "Contract")'
      );
      console.log(`Invoice referencing Contracts: ${invoiceCount.rows[0].count}`);

      // Alert
      const alertCount = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Alert" WHERE "contractId" IN (SELECT id FROM "Contract")'
      );
      console.log(`Alert referencing Contracts: ${alertCount.rows[0].count}`);

      // Check Invoice → Payment
      const paymentCount = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Payment" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "contractId" IN (SELECT id FROM "Contract"))'
      );
      console.log(`Payment referencing Contract Invoices: ${paymentCount.rows[0].count}`);

      // Check Alert → Notification
      const notificationCount = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM "Notification" WHERE "alertId" IN (SELECT id FROM "Alert" WHERE "contractId" IN (SELECT id FROM "Contract"))'
      );
      console.log(
        `Notification referencing Contract Alerts: ${notificationCount.rows[0].count}`
      );
    } else {
      console.log("No Contract records found");
    }

    // 4. Check Neon backup availability
    console.log("\n--- BACKUP INFORMATION ---\n");
    console.log("Neon provides automatic backups:");
    console.log("- Point-in-time restore available (up to 7 days on Free tier, 30 days on paid)");
    console.log("- Restore via Neon Console: Project → Backups");
    console.log("- Manual pg_dump recommended before destructive operations");

    console.log("\n=== VERIFICATION COMPLETE ===");
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

verifyDependencies().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
