// tests/unit/infrastructure/password-reset-delivery.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const deliverySource = readFileSync(
  path.join(
    process.cwd(),
    "src/infrastructure/email/password-reset-delivery.ts",
  ),
  "utf8",
);

describe("password reset email delivery source", () => {
  it("does not interpolate tokens, URLs, or passwords into logs", () => {
    expect(deliverySource).toMatch(/console\.info\(DEVELOPMENT_DELIVERY_MESSAGE\)/);
    expect(deliverySource).toMatch(/console\.warn\(PRODUCTION_DELIVERY_MESSAGE\)/);
    expect(deliverySource).not.toMatch(/console\.\w+\([^)]*data\.(url|token)/);
    expect(deliverySource).not.toMatch(/console\.\w+\([^)]*message\.(url|token)/);
    expect(deliverySource).not.toMatch(/console\.\w+\([^)]*password/i);
  });
});
