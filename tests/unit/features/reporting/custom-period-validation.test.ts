// tests/unit/features/reporting/custom-period-validation.test.ts
import { describe, expect, it } from "vitest";
import { validateCustomPeriodFields } from "@/features/reporting/custom-period-validation";

describe("validateCustomPeriodFields", () => {
  it("requires start date", () => {
    expect(validateCustomPeriodFields("", "2026-03-31")).toEqual({
      start: "Enter a start date.",
    });
  });

  it("requires end date", () => {
    expect(validateCustomPeriodFields("2026-01-01", "")).toEqual({
      end: "Enter an end date.",
    });
  });

  it("requires both dates when both are missing", () => {
    expect(validateCustomPeriodFields("", "")).toEqual({
      start: "Enter a start date.",
      end: "Enter an end date.",
    });
  });

  it("rejects start after end", () => {
    expect(validateCustomPeriodFields("2026-03-31", "2026-01-01")).toEqual({
      end: "End date must be on or after the start date.",
    });
  });

  it("accepts start equal to end", () => {
    expect(validateCustomPeriodFields("2026-01-15", "2026-01-15")).toBeNull();
  });

  it("accepts start before end", () => {
    expect(validateCustomPeriodFields("2026-01-01", "2026-03-31")).toBeNull();
  });
});
