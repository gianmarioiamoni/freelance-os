// scripts/reset-local-database.ts
import { PrismaClient } from "@prisma/client";

interface ResetOptions {
  confirm: boolean;
  dryRun: boolean;
}

function parseArgs(): ResetOptions {
  const args = process.argv.slice(2);
  return {
    confirm: args.includes("--confirm"),
    dryRun: args.includes("--dry-run"),
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

function isKnownLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  );
}

function isProductionEnvironment(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (isKnownLocalHost(hostname)) {
      return false;
    }

    const productionIndicators = [
      "prod",
      "production",
      "vercel",
      "railway",
      "heroku",
      "aws.com",
      "azure.com",
      "supabase.co",
    ];

    return productionIndicators.some((indicator) =>
      hostname.includes(indicator)
    );
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
      throw new Error(`Table "${table}" does not exist. Schema may be damaged.`);
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

    await tx.$executeRaw`DELETE FROM "session"`;
    await tx.$executeRaw`DELETE FROM "account"`;
    await tx.$executeRaw`DELETE FROM "verification"`;
    await tx.$executeRaw`DELETE FROM "user"`;
  });
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (!options.confirm && !options.dryRun) {
    console.error("ERROR: This script requires explicit confirmation.");
    console.error("");
    console.error("Usage:");
    console.error("  Dry run:  pnpm db:reset-local -- --dry-run");
    console.error("  Execute:  pnpm db:reset-local -- --confirm");
    console.error("");
    console.error("WARNING: This operation is IRREVERSIBLE.");
    console.error("         All application data will be permanently deleted.");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const dbIdentity = extractDatabaseIdentity(databaseUrl);

  console.log("=================================================");
  console.log("FreelanceOS Local Database Reset Utility");
  console.log("=================================================");
  console.log("");
  console.log(`Target Database: ${dbIdentity}`);
  console.log("");

  if (isProductionEnvironment(databaseUrl)) {
    console.error("ERROR: Production environment detected.");
    console.error("       This script can only run against local databases.");
    console.error("");
    console.error("If this is actually a local database, ensure:");
    console.error("  - hostname is localhost, 127.0.0.1, or ::1");
    console.error("  - hostname does not contain production keywords");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await validateDatabaseStructure(prisma);

    const beforeCounts = await getTableRowCounts(prisma);

    if (options.dryRun) {
      console.log("DRY RUN MODE - No data will be deleted");
      console.log("");
      console.log("Current row counts:");
      for (const [table, count] of Object.entries(beforeCounts)) {
        console.log(`  ${table.padEnd(20)} ${count}`);
      }
      console.log("");
      console.log("To execute the reset:");
      console.log("  pnpm db:reset-local -- --confirm");
      process.exit(0);
    }

    console.log("WARNING: You are about to delete ALL application data.");
    console.log("");
    console.log("Current row counts:");
    for (const [table, count] of Object.entries(beforeCounts)) {
      console.log(`  ${table.padEnd(20)} ${count}`);
    }
    console.log("");
    console.log("Proceeding with reset in 3 seconds...");
    console.log("Press Ctrl+C to abort.");
    console.log("");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("Executing reset...");
    await resetDatabaseData(prisma);

    const afterCounts = await getTableRowCounts(prisma);

    console.log("");
    console.log("Reset complete.");
    console.log("");
    console.log("Post-reset row counts:");
    for (const [table, count] of Object.entries(afterCounts)) {
      console.log(`  ${table.padEnd(20)} ${count}`);
      if (count !== 0) {
        console.warn(`  WARNING: Table "${table}" still has ${count} rows`);
      }
    }

    await validateDatabaseStructure(prisma);

    console.log("");
    console.log("Database structure validation: PASSED");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Start the application");
    console.log("  2. Create a new user through the sign-up UI");
    console.log("  3. Enter real data manually");
  } catch (error) {
    console.error("");
    console.error("ERROR during reset:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
