// tests/unit/features/landing/capabilities.test.ts
import { describe, expect, it } from "vitest";

import { LANDING_CAPABILITIES } from "@/features/landing/capabilities";

describe("landing capabilities", () => {
  it("lists only the six approved MVP capabilities", () => {
    expect(LANDING_CAPABILITIES.map((capability) => capability.title)).toEqual([
      "Clients",
      "Contracts",
      "Time Tracking",
      "Analytics / Dashboard",
      "Reports",
      "Alerts",
    ]);
    expect(
      LANDING_CAPABILITIES.every((capability) => capability.detail.length > 0),
    ).toBe(true);
  });
});
