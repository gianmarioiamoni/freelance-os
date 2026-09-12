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
    expect(workflow).not.toMatch(/SMTP_/);
  });
});
