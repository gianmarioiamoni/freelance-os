// tests/unit/domain/contract-commitment.test.ts
import { describe, expect, it } from "vitest";

import {
  calculateAllocatedMinutes,
  calculateCommitmentPercentage,
  calculateTotalContractHours,
  getMonthlyContractedMinutes,
} from "@/domain/contract-commitment";

function date(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe("calculateCommitmentPercentage", () => {
  it("returns input for PERCENTAGE mode", () => {
    expect(
      calculateCommitmentPercentage("PERCENTAGE", 60, date("2026-09-21"), date("2026-10-31")),
    ).toBe(60);
  });

  it("converts total hours to percentage for TOTAL_HOURS mode", () => {
    // 2026-09-21 to 2026-10-31 = 30 working days = 240h capacity
    // 144h / 240h = 60%
    expect(
      calculateCommitmentPercentage("TOTAL_HOURS", 144, date("2026-09-21"), date("2026-10-31")),
    ).toBe(60);
  });

  it("returns null for TOTAL_HOURS mode with ongoing contract", () => {
    expect(
      calculateCommitmentPercentage("TOTAL_HOURS", 144, date("2026-09-21"), null),
    ).toBeNull();
  });

  it("accepts percentage > 100", () => {
    expect(
      calculateCommitmentPercentage("PERCENTAGE", 150, date("2026-09-21"), date("2026-10-31")),
    ).toBe(150);
  });

  it("accepts percentage = 0", () => {
    expect(
      calculateCommitmentPercentage("PERCENTAGE", 0, date("2026-09-21"), date("2026-10-31")),
    ).toBe(0);
  });
});

describe("calculateTotalContractHours", () => {
  it("calculates total hours from percentage", () => {
    // 60% × 30 working days × 8h = 144h
    expect(
      calculateTotalContractHours(60, date("2026-09-21"), date("2026-10-31")),
    ).toBe(144);
  });

  it("returns null for ongoing contract", () => {
    expect(
      calculateTotalContractHours(60, date("2026-09-21"), null),
    ).toBeNull();
  });

  it("handles 0% commitment", () => {
    expect(
      calculateTotalContractHours(0, date("2026-09-21"), date("2026-10-31")),
    ).toBe(0);
  });

  it("handles > 100% commitment", () => {
    // 150% × 30 working days × 8h = 360h
    expect(
      calculateTotalContractHours(150, date("2026-09-21"), date("2026-10-31")),
    ).toBe(360);
  });
});

describe("calculateAllocatedMinutes", () => {
  it("converts total hours to minutes", () => {
    // 60% × 30 working days × 8h × 60 = 8,640 minutes
    expect(
      calculateAllocatedMinutes(60, date("2026-09-21"), date("2026-10-31")),
    ).toBe(8640);
  });

  it("returns null for ongoing contract", () => {
    expect(
      calculateAllocatedMinutes(60, date("2026-09-21"), null),
    ).toBeNull();
  });

  it("rounds to nearest minute", () => {
    // Ensure no fractional minutes
    expect(
      calculateAllocatedMinutes(60, date("2026-09-21"), date("2026-10-31")),
    ).toBe(Math.round(8640));
  });
});

describe("getMonthlyContractedMinutes", () => {
  it("calculates September 2026 monthly quota", () => {
    // September 2026: 22 working days
    // 60% × 22 × 8h × 60 = 6,336 minutes
    expect(getMonthlyContractedMinutes(60, 2026, 9)).toBe(6336);
  });

  it("calculates October 2026 monthly quota", () => {
    // October 2026: 22 working days
    // 60% × 22 × 8h × 60 = 6,336 minutes
    expect(getMonthlyContractedMinutes(60, 2026, 10)).toBe(6336);
  });

  it("handles February 2027 (20 working days)", () => {
    // 60% × 20 × 8h × 60 = 5,760 minutes
    expect(getMonthlyContractedMinutes(60, 2027, 2)).toBe(5760);
  });

  it("handles 0% commitment", () => {
    expect(getMonthlyContractedMinutes(0, 2026, 9)).toBe(0);
  });

  it("handles > 100% commitment", () => {
    // 150% × 22 × 8h × 60 = 15,840 minutes
    expect(getMonthlyContractedMinutes(150, 2026, 9)).toBe(15840);
  });
});

describe("commitment mode equivalence", () => {
  it("PERCENTAGE and TOTAL_HOURS produce same results", () => {
    const validFrom = date("2026-09-21");
    const validTo = date("2026-10-31");

    // Mode 1: PERCENTAGE 60%
    const percentageCommitment = calculateCommitmentPercentage(
      "PERCENTAGE",
      60,
      validFrom,
      validTo,
    );

    // Mode 2: TOTAL_HOURS 144h (equivalent to 60%)
    const totalHoursCommitment = calculateCommitmentPercentage(
      "TOTAL_HOURS",
      144,
      validFrom,
      validTo,
    );

    expect(percentageCommitment).toBe(60);
    expect(totalHoursCommitment).toBe(60);

    // Both should produce same allocated minutes
    const allocatedFromPercentage = calculateAllocatedMinutes(
      percentageCommitment!,
      validFrom,
      validTo,
    );
    const allocatedFromTotalHours = calculateAllocatedMinutes(
      totalHoursCommitment!,
      validFrom,
      validTo,
    );

    expect(allocatedFromPercentage).toBe(8640);
    expect(allocatedFromTotalHours).toBe(8640);

    // Both should produce same monthly quota
    const monthlySept = getMonthlyContractedMinutes(percentageCommitment!, 2026, 9);
    const monthlyOct = getMonthlyContractedMinutes(percentageCommitment!, 2026, 10);

    expect(monthlySept).toBe(6336); // 22 working days × 8h × 60% × 60min
    expect(monthlyOct).toBe(6336);
  });
});
