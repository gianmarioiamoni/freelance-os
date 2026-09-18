// tests/unit/ci/vercel-config.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const vercelConfig = JSON.parse(
  readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
) as {
  framework?: string;
  installCommand?: string;
  buildCommand?: string;
};

describe("Vercel deployment configuration", () => {
  it("records Next.js on Vercel with Prisma generate and migrate deploy", () => {
    expect(vercelConfig.framework).toBe("nextjs");
    expect(vercelConfig.installCommand).toBe("pnpm install --frozen-lockfile");
    expect(vercelConfig.buildCommand).toContain("prisma generate");
    expect(vercelConfig.buildCommand).toContain("prisma migrate deploy");
    expect(vercelConfig.buildCommand).toContain("pnpm build");
  });
});
