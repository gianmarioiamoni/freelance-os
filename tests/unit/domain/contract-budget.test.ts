// tests/unit/domain/contract-budget.test.ts
import { describe, expect, it } from "vitest";

import {
  calculateContractAllocatedMinutes,
  deriveContractAllocatedMinutes,
} from "@/domain/contract-budget";

function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

describe("calculateContractAllocatedMinutes", () => {
  it("calculates budget for finite contract with monthly capacity", () => {
    const result = calculateContractAllocatedMinutes(
      date("2026-01-01"),
      date("2026-07-01"), // 6 months
      8000, // 8000min/month
    );

    expect(result).toBe(48000); // 8000 × 6 = 48000
  });

  it("returns null for ongoing contract (validTo = null)", () => {
    const result = calculateContractAllocatedMinutes(
      date("2026-01-01"),
      null, // ongoing
      8000,
    );

    expect(result).toBeNull();
  });

  it("returns null when monthlyContractedMinutes is null", () => {
    const result = calculateContractAllocatedMinutes(
      date("2026-01-01"),
      date("2026-07-01"),
      null, // no monthly capacity
    );

    expect(result).toBeNull();
  });

  it("handles single-month contract", () => {
    const result = calculateContractAllocatedMinutes(
      date("2026-01-01"),
      date("2026-02-01"), // 1 month
      4800,
    );

    expect(result).toBe(4800); // 4800 × 1
  });

  it("handles multi-year contract", () => {
    const result = calculateContractAllocatedMinutes(
      date("2026-01-01"),
      date("2027-01-01"), // 12 months
      5760, // 96h/month
    );

    expect(result).toBe(69120); // 5760 × 12
  });

  it("calculates based on calendar months ignoring day-of-month", () => {
    // 2026-01-15 to 2026-03-10 = 2 calendar months (Jan→Feb, Feb→Mar)
    const result = calculateContractAllocatedMinutes(
      date("2026-01-15"),
      date("2026-03-10"),
      6000,
    );

    expect(result).toBe(12000); // 6000 × 2
  });
});

describe("deriveContractAllocatedMinutes", () => {
  it("uses explicit value when provided", () => {
    const result = deriveContractAllocatedMinutes(
      date("2026-01-01"),
      date("2026-07-01"),
      8000, // would calculate 48000
      30000, // explicit value
    );

    expect(result).toBe(30000); // explicit wins
  });

  it("calculates when explicit value is null", () => {
    const result = deriveContractAllocatedMinutes(
      date("2026-01-01"),
      date("2026-07-01"),
      8000,
      null, // no explicit value
    );

    expect(result).toBe(48000); // 8000 × 6
  });

  it("calculates when explicit value is undefined", () => {
    const result = deriveContractAllocatedMinutes(
      date("2026-01-01"),
      date("2026-07-01"),
      8000,
      undefined,
    );

    expect(result).toBe(48000);
  });

  it("preserves explicit zero value", () => {
    const result = deriveContractAllocatedMinutes(
      date("2026-01-01"),
      date("2026-07-01"),
      8000,
      0, // explicit zero
    );

    expect(result).toBe(0); // explicit wins, even zero
  });

  it("returns null for ongoing contract without explicit value", () => {
    const result = deriveContractAllocatedMinutes(
      date("2026-01-01"),
      null, // ongoing
      8000,
      null,
    );

    expect(result).toBeNull();
  });

  it("uses explicit value for ongoing contract", () => {
    const result = deriveContractAllocatedMinutes(
      date("2026-01-01"),
      null, // ongoing
      8000,
      50000, // explicit budget for ongoing contract
    );

    expect(result).toBe(50000); // explicit wins
  });

  it("returns null when no monthly capacity and no explicit value", () => {
    const result = deriveContractAllocatedMinutes(
      date("2026-01-01"),
      date("2026-07-01"),
      null, // no monthly capacity
      null, // no explicit value
    );

    expect(result).toBeNull();
  });
});
