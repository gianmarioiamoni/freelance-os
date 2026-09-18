// tests/unit/infrastructure/auth-server-only.test.ts
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

describe("Better Auth server/client boundary", () => {
  it("keeps the server auth instance and session helper server-only", () => {
    expect(source("src/infrastructure/auth/auth.ts")).toMatch(
      /import ["']server-only["']/,
    );
    expect(source("src/infrastructure/auth/session.ts")).toMatch(
      /import ["']server-only["']/,
    );
    expect(
      source("src/infrastructure/email/password-reset-delivery.ts"),
    ).toMatch(/import ["']server-only["']/);
    expect(
      source("src/infrastructure/email/password-reset-capture.ts"),
    ).toMatch(/import ["']server-only["']/);
  });

  it("does not import server auth into client modules", () => {
    const clientFiles = [
      path.join(root, "src/infrastructure/auth/auth-client.ts"),
      ...listFiles(path.join(root, "src/features/auth")),
    ];

    for (const filePath of clientFiles) {
      const contents = readFileSync(filePath, "utf8");
      expect(contents).not.toMatch(/from ["']@\/infrastructure\/auth\/auth["']/);
      expect(contents).not.toMatch(/from ["']@\/infrastructure\/auth\/session["']/);
      expect(contents).not.toMatch(
        /from ["']@\/infrastructure\/auth\/google-provider["']/,
      );
      expect(contents).not.toMatch(/from ["']better-auth\/next-js["']/);
      expect(contents).not.toMatch(/GOOGLE_CLIENT_SECRET/);
      expect(contents).not.toMatch(/process\.env\.GOOGLE_/);
      expect(contents).not.toMatch(/from ["']@\/infrastructure\/email\//);
      expect(contents).not.toMatch(/RESEND_API_KEY/);
      expect(contents).not.toMatch(/AUTH_E2E_RUNTIME/);
    }
  });

  it("does not commit authentication secrets", () => {
    const example = source(".env.example");
    expect(example).toMatch(/BETTER_AUTH_SECRET=""/);
    expect(example).not.toMatch(/BETTER_AUTH_SECRET=".{8,}"/);
    expect(example).toMatch(/GOOGLE_CLIENT_ID=""/);
    expect(example).toMatch(/GOOGLE_CLIENT_SECRET=""/);
    expect(example).not.toMatch(/GOOGLE_CLIENT_ID=".{8,}"/);
    expect(example).not.toMatch(/GOOGLE_CLIENT_SECRET=".{8,}"/);
    expect(example).toMatch(/AUTH_EMAIL_DELIVERY=""/);
    expect(example).toMatch(/RESEND_API_KEY=""/);
    expect(example).toMatch(/AUTH_EMAIL_FROM=""/);
    expect(example).not.toMatch(/RESEND_API_KEY=".{8,}"/);
    expect(example).not.toMatch(/AUTH_EMAIL_FROM=".{8,}"/);
  });

  it("does not override Better Auth account-linking defaults", () => {
    const authSource = source("src/infrastructure/auth/auth.ts");
    expect(authSource).not.toMatch(/accountLinking/);
    expect(authSource).not.toMatch(/requireLocalEmailVerified/);
    expect(authSource).not.toMatch(/trustedProviders/);
    expect(authSource).not.toMatch(/disableImplicitLinking/);
  });

  it("keeps password-reset session revocation enabled", () => {
    expect(source("src/infrastructure/auth/auth.ts")).toMatch(
      /revokeSessionsOnPasswordReset:\s*true/,
    );
  });

  it("does not hardcode disabled production rate limits", () => {
    const authSource = source("src/infrastructure/auth/auth.ts");
    expect(authSource).toContain("getBetterAuthRateLimitOptions");
    expect(authSource).not.toMatch(/rateLimit:\s*\{\s*enabled:\s*false/);
  });
});
