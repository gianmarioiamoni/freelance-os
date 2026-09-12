// tests/integration/test-database-url.ts
import { existsSync, readFileSync } from "node:fs";

function valueFromEnvFile(key: string): string | undefined {
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

function databaseNameFromUrl(url: string): string {
  const normalized = url.replace(/^postgresql:/, "http:");
  const pathname = new URL(normalized).pathname.replace(/^\//, "");
  return decodeURIComponent(pathname.split("/")[0] ?? "");
}

export function requireTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? valueFromEnvFile("TEST_DATABASE_URL");

  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is required for isolated tests. Use an isolated database such as freelanceos_test, not the development database.",
    );
  }

  const databaseName = databaseNameFromUrl(url);

  if (databaseName === "freelance_os" || !databaseName.endsWith("_test")) {
    throw new Error(
      `TEST_DATABASE_URL must target an isolated test database (name ending in _test). Received "${databaseName}".`,
    );
  }

  return url;
}
