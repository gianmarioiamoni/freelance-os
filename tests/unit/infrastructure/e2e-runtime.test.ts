// tests/unit/infrastructure/e2e-runtime.test.ts
import { describe, expect, it } from "vitest";

import {
  getBetterAuthRateLimitOptions,
  isE2EAuthRuntime,
} from "@/infrastructure/auth/e2e-runtime";

describe("E2E auth runtime isolation", () => {
  it("enables isolation only for an explicit local E2E marker", () => {
    expect(isE2EAuthRuntime({})).toBe(false);
    expect(isE2EAuthRuntime({ AUTH_E2E_RUNTIME: "false" })).toBe(false);
    expect(isE2EAuthRuntime({ AUTH_E2E_RUNTIME: "true" })).toBe(true);
  });

  it("never isolates Better Auth on Vercel", () => {
    expect(
      isE2EAuthRuntime({
        AUTH_E2E_RUNTIME: "true",
        VERCEL: "1",
      }),
    ).toBe(false);
    expect(
      isE2EAuthRuntime({
        AUTH_E2E_RUNTIME: "true",
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
  });

  it("does not change production Better Auth rate-limit defaults", () => {
    expect(getBetterAuthRateLimitOptions({})).toBeUndefined();
    expect(
      getBetterAuthRateLimitOptions({ NODE_ENV: "production" }),
    ).toBeUndefined();
    expect(
      getBetterAuthRateLimitOptions({
        AUTH_E2E_RUNTIME: "true",
        VERCEL: "1",
      }),
    ).toBeUndefined();
  });

  it("disables rate limits only for the isolated E2E runtime", () => {
    expect(
      getBetterAuthRateLimitOptions({ AUTH_E2E_RUNTIME: "true" }),
    ).toEqual({ enabled: false });
  });
});
