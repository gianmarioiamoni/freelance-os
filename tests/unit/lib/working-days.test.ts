// tests/unit/lib/working-days.test.ts
import { describe, expect, it } from "vitest";

import { countWorkingDays, countWorkingDaysInMonth } from "@/lib/working-days";

function date(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe("countWorkingDays", () => {
  it("counts Monday-Friday only", () => {
    // 2026-09-21 (Mon) to 2026-09-26 (Sat) exclusive = Mon-Fri = 5 days
    expect(countWorkingDays(date("2026-09-21"), date("2026-09-26"))).toBe(5);
  });

  it("excludes weekends", () => {
    // 2026-09-27 (Sun) to 2026-09-29 (Mon) exclusive = Sun27, Mon28 but Mon28 excluded = 0 + 1 = 1 working day
    // Actually: Sun27 is not working, Mon28 is included but we want to test weekend exclusion
    // Better example: 2026-09-26 (Sat) to 2026-09-28 (Mon) exclusive = Sat26, Sun27 = 0 working days
    expect(countWorkingDays(date("2026-09-26"), date("2026-09-28"))).toBe(0);
  });

  it("respects exclusive endDate", () => {
    // 2026-09-21 (Mon) to 2026-09-22 (Tue) exclusive = 1 day (Mon only)
    expect(countWorkingDays(date("2026-09-21"), date("2026-09-22"))).toBe(1);
  });

  it("returns 0 for empty range", () => {
    expect(countWorkingDays(date("2026-09-21"), date("2026-09-21"))).toBe(0);
  });

  it("returns 0 when endDate < startDate", () => {
    expect(countWorkingDays(date("2026-09-25"), date("2026-09-21"))).toBe(0);
  });

  it("counts single working day", () => {
    // 2026-09-22 (Tue) to 2026-09-23 (Wed) exclusive = 1 day
    expect(countWorkingDays(date("2026-09-22"), date("2026-09-23"))).toBe(1);
  });

  it("counts across month boundary", () => {
    // 2026-09-29 (Tue) to 2026-10-02 (Fri) exclusive = Tue29, Wed30, Thu1 = 3 days
    expect(countWorkingDays(date("2026-09-29"), date("2026-10-02"))).toBe(3);
  });

  it("counts multi-month period (example: 2026-09-21 to 2026-10-31)", () => {
    // Sept 21-30: Mon21-Fri25 + Mon28-Wed30 = 8 days
    // Oct 1-30: Thu1-Fri2, Mon5-Fri9, Mon12-Fri16, Mon19-Fri23, Mon26-Fri30 = 22 days
    // Total: 30 working days
    expect(countWorkingDays(date("2026-09-21"), date("2026-10-31"))).toBe(30);
  });
});

describe("countWorkingDaysInMonth", () => {
  it("counts September 2026 (30 days, starts Tuesday)", () => {
    // Sept 2026: 1 Tue, 2-30 = 22 working days (4 weekends × 2 + 2 = 8 weekend days, 30 - 8 = 22)
    expect(countWorkingDaysInMonth(2026, 9)).toBe(22);
  });

  it("counts October 2026 (31 days, starts Thursday)", () => {
    // Oct 2026: 22 working days (5 weekends × 2 - 1 = 9 weekend days, 31 - 9 = 22)
    expect(countWorkingDaysInMonth(2026, 10)).toBe(22);
  });

  it("counts February 2027 (28 days)", () => {
    // Feb 2027: starts Monday, 28 days = 20 working days
    expect(countWorkingDaysInMonth(2027, 2)).toBe(20);
  });

  it("counts December 2026 (31 days)", () => {
    expect(countWorkingDaysInMonth(2026, 12)).toBe(23);
  });
});
