// tests/unit/lib/analytics-periods.test.ts
import { describe, expect, it, vi } from "vitest";

import {
  getCurrentMonthPeriod,
  getMonthPeriod,
  getDateRangePeriod,
  isValidPeriod,
  isDateInPeriod,
  getPeriodDays,
  formatPeriodDisplay,
} from "@/lib/analytics-periods";

describe("analytics-periods", () => {
  describe("getCurrentMonthPeriod", () => {
    it("ends today, not the last day of the month (BR-105-015)", () => {
      // Workspace-local date: 2026-09-15 (mid-month)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-15T10:00:00.000Z"));

      const period = getCurrentMonthPeriod("UTC");

      expect(period.startDate).toEqual(new Date("2026-09-01"));
      // BR-105-015: ends today, not 2026-09-30
      expect(period.endDate).toEqual(new Date("2026-09-15"));

      vi.useRealTimers();
    });

    it("ends today on the first day of the month", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-01T00:30:00.000Z"));

      const period = getCurrentMonthPeriod("UTC");

      expect(period.startDate).toEqual(new Date("2026-09-01"));
      expect(period.endDate).toEqual(new Date("2026-09-01"));

      vi.useRealTimers();
    });

    it("ends today in leap year February (not last day)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-02-15T12:00:00.000Z"));

      const period = getCurrentMonthPeriod("UTC");

      expect(period.startDate).toEqual(new Date("2024-02-01"));
      // BR-105-015: ends today (Feb 15), not Feb 29
      expect(period.endDate).toEqual(new Date("2024-02-15"));

      vi.useRealTimers();
    });
  });

  describe("getMonthPeriod", () => {
    it("should return correct period for regular month", () => {
      const period = getMonthPeriod(2026, 9); // September 2026

      expect(period.startDate).toEqual(new Date("2026-09-01"));
      expect(period.endDate).toEqual(new Date("2026-09-30"));
    });

    it("should handle February in non-leap year", () => {
      const period = getMonthPeriod(2026, 2);

      expect(period.startDate).toEqual(new Date("2026-02-01"));
      expect(period.endDate).toEqual(new Date("2026-02-28"));
    });

    it("should handle February in leap year", () => {
      const period = getMonthPeriod(2024, 2);

      expect(period.startDate).toEqual(new Date("2024-02-01"));
      expect(period.endDate).toEqual(new Date("2024-02-29"));
    });

    it("should handle December", () => {
      const period = getMonthPeriod(2026, 12);

      expect(period.startDate).toEqual(new Date("2026-12-01"));
      expect(period.endDate).toEqual(new Date("2026-12-31"));
    });
  });

  describe("getDateRangePeriod", () => {
    it("should create period from date range", () => {
      const startDate = new Date("2026-09-15T14:30:00");
      const endDate = new Date("2026-09-20T16:45:00");

      const period = getDateRangePeriod(startDate, endDate);

      expect(period.startDate).toEqual(new Date("2026-09-15"));
      expect(period.endDate).toEqual(new Date("2026-09-20"));
    });

    it("should handle same start and end date", () => {
      const date = new Date("2026-09-15T14:30:00");

      const period = getDateRangePeriod(date, date);

      expect(period.startDate).toEqual(new Date("2026-09-15"));
      expect(period.endDate).toEqual(new Date("2026-09-15"));
    });
  });

  describe("isValidPeriod", () => {
    it("should return true for valid period", () => {
      const period = {
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-30"),
      };

      expect(isValidPeriod(period)).toBe(true);
    });

    it("should return true for same start and end date", () => {
      const period = {
        startDate: new Date("2026-09-15"),
        endDate: new Date("2026-09-15"),
      };

      expect(isValidPeriod(period)).toBe(true);
    });

    it("should return false for invalid period", () => {
      const period = {
        startDate: new Date("2026-09-30"),
        endDate: new Date("2026-09-01"), // end before start
      };

      expect(isValidPeriod(period)).toBe(false);
    });
  });

  describe("isDateInPeriod", () => {
    const period = {
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-30"),
    };

    it("should return true for date within period", () => {
      const date = new Date("2026-09-15");
      expect(isDateInPeriod(date, period)).toBe(true);
    });

    it("should return true for start date", () => {
      const date = new Date("2026-09-01");
      expect(isDateInPeriod(date, period)).toBe(true);
    });

    it("should return true for end date", () => {
      const date = new Date("2026-09-30");
      expect(isDateInPeriod(date, period)).toBe(true);
    });

    it("should return false for date before period", () => {
      const date = new Date("2026-08-31");
      expect(isDateInPeriod(date, period)).toBe(false);
    });

    it("should return false for date after period", () => {
      const date = new Date("2026-10-01");
      expect(isDateInPeriod(date, period)).toBe(false);
    });

    it("should ignore time portion", () => {
      const date = new Date("2026-09-15T23:59:59");
      expect(isDateInPeriod(date, period)).toBe(true);
    });
  });

  describe("getPeriodDays", () => {
    it("should calculate days for full month", () => {
      const period = {
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-30"),
      };

      expect(getPeriodDays(period)).toBe(30);
    });

    it("should calculate days for single day", () => {
      const period = {
        startDate: new Date("2026-09-15"),
        endDate: new Date("2026-09-15"),
      };

      expect(getPeriodDays(period)).toBe(1);
    });

    it("should calculate days for week", () => {
      const period = {
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-07"),
      };

      expect(getPeriodDays(period)).toBe(7);
    });

    it("should handle leap year February", () => {
      const period = {
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-02-29"),
      };

      expect(getPeriodDays(period)).toBe(29);
    });
  });

  describe("formatPeriodDisplay", () => {
    it("should format full month period", () => {
      const period = {
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-30"),
      };

      expect(formatPeriodDisplay(period)).toBe("September 2026");
    });

    it("should format partial month as date range", () => {
      const period = {
        startDate: new Date("2026-09-15"),
        endDate: new Date("2026-09-20"),
      };

      const result = formatPeriodDisplay(period);
      expect(result).toContain("9/15/2026");
      expect(result).toContain("9/20/2026");
    });

    it("should format cross-month period as date range", () => {
      const period = {
        startDate: new Date("2026-09-25"),
        endDate: new Date("2026-10-05"),
      };

      const result = formatPeriodDisplay(period);
      expect(result).toContain(" - ");
    });

    it("should format February leap year", () => {
      const period = {
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-02-29"),
      };

      expect(formatPeriodDisplay(period)).toBe("February 2024");
    });

    it("should format January", () => {
      const period = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      };

      expect(formatPeriodDisplay(period)).toBe("January 2026");
    });

    it("should format December", () => {
      const period = {
        startDate: new Date("2026-12-01"),
        endDate: new Date("2026-12-31"),
      };

      expect(formatPeriodDisplay(period)).toBe("December 2026");
    });
  });
});