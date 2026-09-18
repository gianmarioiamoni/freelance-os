// tests/unit/ci/prisma-config.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Prisma CLI configuration", () => {
  it("keeps seed in prisma.config.ts instead of package.json#prisma", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    ) as { prisma?: unknown };

    expect(packageJson.prisma).toBeUndefined();

    const config = readFileSync(path.join(root, "prisma.config.ts"), "utf8");
    expect(config).toContain('import "dotenv/config"');
    expect(config).toContain('from "prisma/config"');
    expect(config).toContain("defineConfig");
    expect(config).toContain('seed: "tsx prisma/seed.ts"');
    expect(config).not.toMatch(/engine:/);
    expect(config).not.toMatch(/datasource:/);
  });
});
