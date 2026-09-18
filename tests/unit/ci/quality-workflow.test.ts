// tests/unit/ci/quality-workflow.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  path.join(process.cwd(), ".github/workflows/quality.yml"),
  "utf8",
);

describe("CI quality workflow", () => {
  it("enforces the required quality gates", () => {
    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain("prisma validate");
    expect(workflow).toContain("prisma generate");
    expect(workflow).toContain("pnpm lint");
    expect(workflow).toContain("pnpm typecheck");
    expect(workflow).toContain("pnpm test:db:migrate");
    expect(workflow).toMatch(/run: pnpm test$/m);
    expect(workflow).toContain("pnpm test:integration");
    expect(workflow).toContain("pnpm build");
    expect(workflow).toContain("pnpm test:e2e");
    expect(workflow).not.toContain("db push");
  });

  it("uses isolated PostgreSQL without production Google or email secrets", () => {
    expect(workflow).toContain("postgres:17");
    expect(workflow).toContain("freelanceos_test");
    expect(workflow).toContain("TEST_DATABASE_URL:");
    expect(workflow).toContain("AUTH_EMAIL_DELIVERY: test");
    expect(workflow).not.toMatch(/GOOGLE_CLIENT_ID:/);
    expect(workflow).not.toMatch(/GOOGLE_CLIENT_SECRET:/);
    expect(workflow).not.toMatch(/EMAIL_PROVIDER/);
    expect(workflow).not.toMatch(/RESEND_API_KEY/);
    expect(workflow).not.toMatch(/AUTH_EMAIL_FROM/);
    expect(workflow).not.toMatch(/SMTP_/);
  });
});

const playwrightConfig = readFileSync(
  path.join(process.cwd(), "playwright.config.ts"),
  "utf8",
);

describe("Playwright CI contract", () => {
  it("keeps default E2E on pnpm dev and isolates next start via AUTH_E2E_RUNTIME", () => {
    expect(playwrightConfig).toContain(
      'const useProductionWebServer = process.env.E2E_WEB_SERVER === "start"',
    );
    expect(playwrightConfig).toContain(
      'command: useProductionWebServer ? "pnpm start" : "pnpm dev"',
    );
    expect(playwrightConfig).toContain(
      '...(useProductionWebServer ? { AUTH_E2E_RUNTIME: "true" } : {})',
    );
    expect(playwrightConfig).toContain('AUTH_EMAIL_DELIVERY: "test"');
    expect(playwrightConfig).toContain("workers: process.env.CI ? 1 : undefined");
    expect(playwrightConfig).toContain("reuseExistingServer: false");
  });
});

