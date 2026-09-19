// tests/unit/lib/next-redirect-error.test.ts
import { describe, expect, it } from "vitest";

import { isNextRedirectError } from "@/lib/next-redirect-error";

describe("isNextRedirectError", () => {
  it("treats a Next.js redirect digest as control flow, not an application error", () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/onboarding;307;",
    });

    expect(isNextRedirectError(redirect)).toBe(true);
  });

  it("does not treat a real application error as a redirect", () => {
    expect(isNextRedirectError(new Error("Unable to load dashboard analytics"))).toBe(
      false,
    );
  });

  it("does not treat non-error values as a redirect", () => {
    expect(isNextRedirectError("NEXT_REDIRECT")).toBe(false);
    expect(isNextRedirectError(null)).toBe(false);
  });
});
