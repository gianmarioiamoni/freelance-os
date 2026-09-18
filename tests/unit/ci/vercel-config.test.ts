// tests/unit/ci/vercel-config.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const vercelPath = path.join(process.cwd(), "vercel.json");
const vercelRaw = readFileSync(vercelPath, "utf8");
const vercelConfig = JSON.parse(vercelRaw) as {
  framework?: string;
  installCommand?: string;
  buildCommand?: string;
};

const packageJson = JSON.parse(
  readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
) as {
  scripts: Record<string, string>;
};

describe("Vercel deployment configuration", () => {
  it("records Next.js on Vercel with Prisma generate and migrate deploy", () => {
    expect(vercelConfig.framework).toBe("nextjs");
    expect(vercelConfig.installCommand).toBe("pnpm install --frozen-lockfile");
    expect(vercelConfig.buildCommand).toContain("prisma generate");
    expect(vercelConfig.buildCommand).toContain("prisma migrate deploy");
    expect(vercelConfig.buildCommand).toContain("pnpm build");
  });

  it("aligns with package.json production build and migrate scripts", () => {
    expect(packageJson.scripts.build).toBe("next build --turbopack");
    expect(packageJson.scripts.start).toBe("next start");
    expect(packageJson.scripts.postinstall).toBe("prisma generate");
    expect(packageJson.scripts["db:migrate:deploy"]).toBe("prisma migrate deploy");
    expect(Object.keys(vercelConfig).sort()).toEqual([
      "buildCommand",
      "framework",
      "installCommand",
    ]);
  });

  it("does not embed secrets, E2E markers, or a hosted project identity", () => {
    expect(vercelRaw).not.toMatch(/AUTH_E2E_RUNTIME/);
    expect(vercelRaw).not.toMatch(/TEST_DATABASE_URL/);
    expect(vercelRaw).not.toMatch(/GOOGLE_CLIENT/);
    expect(vercelRaw).not.toMatch(/RESEND_API_KEY/);
    expect(vercelRaw).not.toMatch(/BETTER_AUTH_SECRET/);
    expect(vercelRaw).not.toMatch(/DATABASE_URL/);
    expect(vercelRaw).not.toMatch(/projectId/);
    expect(vercelRaw).not.toMatch(/\.vercel\.app/);
  });
});
