// tests/unit/application/analytics/analytics-calculations.test.ts
import { describe, expect, it } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { getCurrentMonthPeriod } from "@/lib/analytics-periods";

/**
 * Unit tests for shared analytics calculations (P105-02).
 * Validates calculation formulas, zero-denominator handling, and boundary cases.
 */

describe("AnalyticsService shared calculations", () => {
  describe("calculateAllocationPercentage", () => {
    it("should calculate allocation percentage", () => {
      const result = AnalyticsService.calculateAllocationPercentage(300, 1000);
      expect(result).toBe(30);
    });

    it("should return null for zero total", () => {
      const result = AnalyticsService.calculateAllocationPercentage(0, 0);
      expect(result).toBe(null);
    });

    it("should return 0% for zero part with non-zero total", () => {
      const result = AnalyticsService.calculateAllocationPercentage(0, 1000);
      expect(result).toBe(0);
    });

    it("should return 100% for equal part and total", () => {
      const result = AnalyticsService.calculateAllocationPercentage(1000, 1000);
      expect(result).toBe(100);
    });

    it("should handle fractional percentages", () => {
      const result = AnalyticsService.calculateAllocationPercentage(123, 1000);
      expect(result).toBe(12.3);
    });
  });

  describe("calculateDailyAverage", () => {
    it("should calculate daily average for current month", () => {
      const period = getCurrentMonthPeriod();
      const totalMinutes = 12000; // 200 hours
      const result = AnalyticsService.calculateDailyAverage(totalMinutes, period);
      
      // The result depends on the current month's day count
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should calculate daily average for 30-day period", () => {
      const period = {
        startDate: new Date(Date.UTC(2026, 8, 1)),
        endDate: new Date(Date.UTC(2026, 8, 30)),
      };
      const totalMinutes = 12000; // 200 hours
      const result = AnalyticsService.calculateDailyAverage(totalMinutes, period);
      
      expect(result).toBe(400); // 12000 / 30 = 400
    });

    it("should calculate daily average for 31-day period", () => {
      const period = {
        startDate: new Date(Date.UTC(2026, 9, 1)),
        endDate: new Date(Date.UTC(2026, 9, 31)),
      };
      const totalMinutes = 12400; // 206h 40m
      const result = AnalyticsService.calculateDailyAverage(totalMinutes, period);
      
      expect(result).toBe(400); // 12400 / 31 = 400
    });

    it("should round to integer minutes", () => {
      const period = {
        startDate: new Date(Date.UTC(2026, 8, 1)),
        endDate: new Date(Date.UTC(2026, 8, 30)),
      };
      const totalMinutes = 12345;
      const result = AnalyticsService.calculateDailyAverage(totalMinutes, period);
      
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBe(412); // Math.round(12345 / 30) = 412
    });

    it("should handle zero total minutes", () => {
      const period = getCurrentMonthPeriod();
      const result = AnalyticsService.calculateDailyAverage(0, period);
      
      expect(result).toBe(0);
    });

    it("should handle February (28 days)", () => {
      const period = {
        startDate: new Date(Date.UTC(2027, 1, 1)), // Feb 2027
        endDate: new Date(Date.UTC(2027, 1, 28)),
      };
      const totalMinutes = 11200; // 186h 40m
      const result = AnalyticsService.calculateDailyAverage(totalMinutes, period);
      
      expect(result).toBe(400); // 11200 / 28 = 400
    });
  });
});
