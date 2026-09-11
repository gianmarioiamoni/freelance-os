// scripts/test-db-migrate.mjs
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function valueFromEnvFile(key) {
  if (!existsSync(".env")) {
    return undefined;
  }

  const line = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${key}=`));

  if (!line) {
    return undefined;
  }

  return line.slice(key.length + 1).trim().replace(/^"|"$/g, "");
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? valueFromEnvFile("TEST_DATABASE_URL");

if (!testDatabaseUrl) {
  console.error("TEST_DATABASE_URL is required for test database migrations.");
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
  },
});

process.exit(result.status ?? 1);
