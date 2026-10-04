// scripts/reset-database-data.ts
import { PrismaClient } from "@prisma/client";

interface ResetOptions {
  confirm: boolean;
  dryRun: boolean;
  allowRemote: boolean;
}

function parseArgs(): ResetOptions {
  const args = process.argv.slice(2);
  return {
    confirm: args.includes("--confirm"),
    dryRun: args.includes("--dry-run"),
    allowRemote: args.includes("--allow-remote"),
  };
}

function extractDatabaseIdentity(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const database = parsed.pathname.substring(1);
    return `${hostname}/${database}`;
  } catch {
    return "UNKNOWN";
  }
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  );
}

function isRemoteDatabase(url: string): boolean {
  try {
    const parsed = new URL(url);
    return !isLocalHost(parsed.hostname);
  } catch {
    return true;
  }
}

async function validateDatabaseStructure(
  prisma: PrismaClient
): Promise<void> {
  const tables = [
    "Workspace",
    "WorkspaceMember",
    "WorkspaceSettings",
    "Client",
    "Contract",
    "TimeEntry",
    "Invoice",
    "Payment",
    "Alert",
    "Notification",
    "AdminAction",
    "user",
    "session",
    "account",
    "verification",
  ];

  for (const table of tables) {
    const result: Array<{ exists: boolean }> = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = '${table}'
      ) as exists
    `);

    if (!result[0]?.exists) {
      throw new Error(
        `Table "${table}" does not exist. Schema may be incomplete or damaged.`
      );
    }
  }
}

async function getTableRowCounts(
  prisma: PrismaClient
): Promise<Record<string, number>> {
  const tables = [
    "Workspace",
    "WorkspaceMember",
    "WorkspaceSettings",
    "Client",
    "Contract",
    "TimeEntry",
    "Invoice",
    "Payment",
    "Alert",
    "Notification",
    "AdminAction",
    "user",
    "session",
    "account",
    "verification",
  ];

  const counts: Record<string, number> = {};

  for (const table of tables) {
    const result: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "${table}"`
    );
    counts[table] = Number(result[0]?.count ?? 0);
  }

  return counts;
}

async function resetDatabaseData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({});
    await tx.alert.deleteMany({});
    await tx.payment.deleteMany({});
    await tx.invoice.deleteMany({});
    await tx.timeEntry.deleteMany({});
    await tx.contract.deleteMany({});
    await tx.client.deleteMany({});
    await tx.workspaceSettings.deleteMany({});
    await tx.workspaceMember.deleteMany({});
    await tx.workspace.deleteMany({});
    await tx.adminAction.deleteMany({});

    await tx.$executeRaw`DELETE FROM "session"`;
    await tx.$executeRaw`DELETE FROM "account"`;
    await tx.$executeRaw`DELETE FROM "verification"`;
    await tx.$executeRaw`DELETE FROM "user"`;
  });
}

async function waitForUserConfirmation(
  message: string,
  timeoutSeconds: number
): Promise<void> {
  console.log("");
  console.log(`${message}`);
  console.log(
    `Proceeding in ${timeoutSeconds} seconds... Press Ctrl+C to abort.`
  );
  console.log("");

  await new Promise((resolve) => setTimeout(resolve, timeoutSeconds * 1000));
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (!options.confirm && !options.dryRun) {
    console.error("ERROR: This script requires explicit confirmation.");
    console.error("");
    console.error("Usage:");
    console.error("  Dry run (local):   pnpm db:reset-data -- --dry-run");
    console.error("  Execute (local):   pnpm db:reset-data -- --confirm");
    console.error("");
    console.error("  Dry run (remote):  pnpm db:reset-data -- --dry-run --allow-remote");
    console.error("  Execute (remote):  pnpm db:reset-data -- --confirm --allow-remote");
    console.error("");
    console.error("WARNING: This operation is IRREVERSIBLE.");
    console.error("         All application data will be permanently deleted.");
    console.error("         Schema and migrations are preserved.");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const dbIdentity = extractDatabaseIdentity(databaseUrl);
  const isRemote = isRemoteDatabase(databaseUrl);

  console.log("=================================================");
  console.log("FreelanceOS Database Data Reset Utility");
  console.log("=================================================");
  console.log("");
  console.log(`Target Database: ${dbIdentity}`);
  console.log(`Location:        ${isRemote ? "REMOTE" : "LOCAL"}`);
  console.log("");

  if (isRemote && !options.allowRemote) {
    console.error("ERROR: Remote database detected.");
    console.error("       This script requires --allow-remote flag for remote databases.");
    console.error("");
    console.error("To proceed with remote database:");
    console.error(
      `  pnpm db:reset-data -- ${options.dryRun ? "--dry-run" : "--confirm"} --allow-remote`
    );
    console.error("");
    console.error("DANGER: Ensure you have a database backup before proceeding.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await validateDatabaseStructure(prisma);

    const beforeCounts = await getTableRowCounts(prisma);
    const totalRows = Object.values(beforeCounts).reduce((a, b) => a + b, 0);

    if (options.dryRun) {
      console.log("DRY RUN MODE - No data will be deleted");
      console.log("");
      console.log("Current row counts:");
      for (const [table, count] of Object.entries(beforeCounts)) {
        console.log(`  ${table.padEnd(20)} ${count}`);
      }
      console.log(`  ${"TOTAL".padEnd(20)} ${totalRows}`);
      console.log("");
      console.log("To execute the reset:");
      if (isRemote) {
        console.log("  pnpm db:reset-data -- --confirm --allow-remote");
      } else {
        console.log("  pnpm db:reset-data -- --confirm");
      }
      process.exit(0);
    }

    console.log("⚠️  DANGER ZONE ⚠️");
    console.log("");
    console.log("You are about to DELETE ALL APPLICATION DATA from:");
    console.log(`  ${dbIdentity}`);
    console.log("");
    console.log("Current row counts:");
    for (const [table, count] of Object.entries(beforeCounts)) {
      console.log(`  ${table.padEnd(20)} ${count}`);
    }
    console.log(`  ${"TOTAL".padEnd(20)} ${totalRows}`);
    console.log("");
    console.log("What will be DELETED:");
    console.log("  ✗ All users and authentication sessions");
    console.log("  ✗ All workspaces and members");
    console.log("  ✗ All clients and contracts");
    console.log("  ✗ All time entries");
    console.log("  ✗ All invoices and payments");
    console.log("  ✗ All alerts and notifications");
    console.log("");
    console.log("What will be PRESERVED:");
    console.log("  ✓ Database schema (tables, columns, constraints)");
    console.log("  ✓ Prisma migrations");
    console.log("  ✓ Database indexes and enums");
    console.log("");

    if (isRemote) {
      console.log("🚨 REMOTE DATABASE WARNING 🚨");
      console.log("");
      console.log("This is a REMOTE/PRODUCTION database.");
      console.log("Ensure you have:");
      console.log("  1. A recent database backup");
      console.log("  2. Informed all stakeholders");
      console.log("  3. Scheduled appropriate downtime");
      console.log("");

      await waitForUserConfirmation(
        "⏳ FIRST CONFIRMATION REQUIRED",
        5
      );

      console.log("🔴 FINAL CONFIRMATION");
      console.log("");
      console.log("This is your last chance to abort (Ctrl+C).");

      await waitForUserConfirmation(
        "⏳ Executing reset in",
        5
      );
    } else {
      await waitForUserConfirmation(
        "⏳ Proceeding with local database reset",
        3
      );
    }

    console.log("🔄 Executing reset...");
    await resetDatabaseData(prisma);

    const afterCounts = await getTableRowCounts(prisma);

    console.log("");
    console.log("✅ Reset complete.");
    console.log("");
    console.log("Post-reset row counts:");
    let hasNonZero = false;
    for (const [table, count] of Object.entries(afterCounts)) {
      const indicator = count === 0 ? "✓" : "✗";
      console.log(`  ${indicator} ${table.padEnd(20)} ${count}`);
      if (count !== 0) {
        hasNonZero = true;
      }
    }

    if (hasNonZero) {
      console.log("");
      console.warn("⚠️  WARNING: Some tables still contain data.");
      console.warn("    This may indicate foreign key issues or transaction failure.");
    }

    await validateDatabaseStructure(prisma);

    console.log("");
    console.log("✓ Database structure validation: PASSED");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Start the application");
    console.log("  2. Create a new user through the sign-up UI");
    console.log("  3. Enter real data manually");

    if (isRemote) {
      console.log("");
      console.log("🌐 Remote database reset completed successfully.");
    }
  } catch (error) {
    console.error("");
    console.error("❌ ERROR during reset:");
    console.error(error);
    console.error("");
    console.error("The database may be in an inconsistent state.");
    console.error("If you have a backup, restore it immediately.");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
