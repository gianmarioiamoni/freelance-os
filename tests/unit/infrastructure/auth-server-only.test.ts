// tests/unit/infrastructure/auth-server-only.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Better Auth server instance", () => {
  it("declares the server-only boundary", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/infrastructure/auth/auth.ts"),
      "utf8",
    );

    expect(source).toMatch(/import ["']server-only["']/);
  });
});
