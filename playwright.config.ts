// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

import { requireTestDatabaseUrl } from "./tests/integration/test-database-url";

const testDatabaseUrl = requireTestDatabaseUrl();
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET ?? "test-better-auth-secret-32-characters-min";
const useProductionWebServer = process.env.E2E_WEB_SERVER === "start";

process.env.DATABASE_URL = testDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl;
process.env.AUTH_EMAIL_DELIVERY = "test";
process.env.BETTER_AUTH_URL = betterAuthUrl;
process.env.BETTER_AUTH_SECRET = betterAuthSecret;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: !process.env.CI,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: useProductionWebServer ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      AUTH_EMAIL_DELIVERY: "test",
      BETTER_AUTH_URL: betterAuthUrl,
      BETTER_AUTH_SECRET: betterAuthSecret,
      ...(useProductionWebServer ? { AUTH_E2E_RUNTIME: "true" } : {}),
    },
  },
});
