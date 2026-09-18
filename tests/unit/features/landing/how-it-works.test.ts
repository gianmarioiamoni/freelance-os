// tests/unit/features/landing/how-it-works.test.ts
import { describe, expect, it } from "vitest";

import { LANDING_HOW_IT_WORKS } from "@/features/landing/how-it-works";

describe("landing how it works", () => {
  it("lists three operational steps", () => {
    expect(LANDING_HOW_IT_WORKS.map((item) => item.title)).toEqual([
      "Set up",
      "Track",
      "Understand",
    ]);
  });
});
