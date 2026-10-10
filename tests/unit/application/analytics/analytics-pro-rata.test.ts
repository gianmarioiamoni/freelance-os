import { describe, expect, it } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { AnalyticsPeriod } from "@/domain/analytics-types";

/**
 * Unit tests for AnalyticsService.calculateProRataCapacity (BR-105-017).
 *
 * Formula:
 *   monthlyCapacity = getMonthlyContractedMinutes(commitmentPercentage, period.year, period.month)
 *   proRataMinutes = monthlyCapacity × (workingDaysInOverlap / totalWorkingDaysInMonth)
 *
 * Boundary convention: [validFrom, validTo) - validTo is exclusive.
 * Ongoing contracts (validTo === null) are treated as infinitely valid.
 * Zero commitment (0%) returns 0.
 */

function d(iso: string): Date {
  return new Date(iso + "T00:00:00.000Z");
}

const COMMITMENT_PERCENTAGE = 60; // 60% commitment

describe("AnalyticsService.calculateProRataCapacity (BR-105-017)", () => {
  // ------------------------------------------------------------------
  // Zero commitment → 0 result
  // ------------------------------------------------------------------

  it("returns 0 when commitment is 0%", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      0,
      d("2026-01-01"),
      null,
      period,
    );
    expect(result).toBe(0);
  });

  it("returns 0 for 0% commitment even when validTo is finite", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      0,
      d("2026-01-01"),
      d("2026-12-31"),
      period,
    );
    expect(result).toBe(0);
  });

  // ------------------------------------------------------------------
  // Full-period overlap
  // ------------------------------------------------------------------

  it("returns full monthly capacity when contract covers the entire period", () => {
    // Period: Sep 2026 (22 working days). Contract: Jan 2026 → Jan 2027 (covers all).
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-01-01"),
      d("2027-01-01"),
      period,
    );
    // Sep 2026: 22 working days × 8h × 60min × 60% = 6336 minutes
    expect(result).toBe(6336);
  });

  it("returns full monthly capacity for October when contract covers all", () => {
    // Period: Oct 2026 (22 working days). Contract spans the full month.
    const period: AnalyticsPeriod = { startDate: d("2026-10-01"), endDate: d("2026-10-31") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-01-01"),
      d("2027-01-01"),
      period,
    );
    // Oct 2026: 22 working days × 8h × 60min × 60% = 6336 minutes
    expect(result).toBe(6336);
  });

  it("returns full monthly capacity for February when contract covers all", () => {
    const period: AnalyticsPeriod = { startDate: d("2027-02-01"), endDate: d("2027-02-28") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-01-01"),
      d("2028-01-01"),
      period,
    );
    // Feb 2027: 20 working days × 8h × 60min × 60% = 5760 minutes
    expect(result).toBe(5760);
  });

  // ------------------------------------------------------------------
  // Partial overlap - contract starts inside the period
  // ------------------------------------------------------------------

  it("pro-rates when contract starts in the middle of the period (start-side overlap)", () => {
    // Period: Sep 2026 (1-30). Contract: Sep 16 (Tue) → Dec 31.
    // Working days in Sep: 22. Working days Sep 16-30: 11 (Tue-Fri week + Mon-Fri week).
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-09-16"),
      d("2027-01-01"),
      period,
    );
    // Monthly capacity: 60% × 22 × 8 × 60 = 6336
    // Pro-rata: 6336 × (11 / 22) = 3168 minutes
    expect(result).toBe(3168);
  });

  // ------------------------------------------------------------------
  // Partial overlap - contract ends inside the period
  // ------------------------------------------------------------------

  it("pro-rates when contract ends in the middle of the period (end-side overlap)", () => {
    // Period: Sep 2026 (1-30). Contract: Jan 1 → Sep 16 (exclusive, last inclusive Sep 15 Mon).
    // Working days in Sep: 22. Working days Sep 1-15: 11 (Tue-Fri + Mon-Fri + Mon).
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-01-01"),
      d("2026-09-16"),
      period,
    );
    // Monthly capacity: 6336
    // Pro-rata: 6336 × (11 / 22) = 3168 minutes
    expect(result).toBe(3168);
  });

  // ------------------------------------------------------------------
  // Ongoing contract (validTo === null)
  // ------------------------------------------------------------------

  it("ongoing contract (validTo null) with finite capacity - pro-rates to full period", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-01-01"),
      null,
      period,
    );
    // Full period overlap: 6336 minutes
    expect(result).toBe(6336);
  });

  it("ongoing contract starting in the middle of the period - partial overlap", () => {
    // Contract starts Sep 16 and is ongoing. Period Sep 1–30.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-09-16"),
      null,
      period,
    );
    // Working days Sep 16-30: 11
    // Pro-rata: 6336 × (11 / 22) = 3168 minutes
    expect(result).toBe(3168);
  });

  it("ongoing + 0% capacity returns 0", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      0,
      d("2026-01-01"),
      null,
      period,
    );
    expect(result).toBe(0);
  });

  // ------------------------------------------------------------------
  // No overlap - contract ends before or starts after period
  // ------------------------------------------------------------------

  it("returns 0 when contract ends before the period starts", () => {
    // Contract: Jan 1 → Jul 1 (exclusive). Period: Sep 1–30.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-01-01"),
      d("2026-07-01"),
      period,
    );
    expect(result).toBe(0);
  });

  it("returns 0 when contract starts after the period ends", () => {
    // Contract: Dec 1 2026 → Jan 1 2027. Period: Sep 1–30.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-12-01"),
      d("2027-01-01"),
      period,
    );
    expect(result).toBe(0);
  });

  // ------------------------------------------------------------------
  // Boundary cases
  // ------------------------------------------------------------------

  it("returns full monthly capacity when validFrom equals period startDate (inclusive boundary)", () => {
    // Contract starts exactly on period start → full overlap.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE,
      d("2026-09-01"),
      d("2027-01-01"),
      period,
    );
    expect(result).toBe(6336);
  });

  it("does not apply rollover - capacity for the next month is independent", () => {
    // Each month's capacity is computed independently using working days for that month.
    const sepPeriod: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const octPeriod: AnalyticsPeriod = { startDate: d("2026-10-01"), endDate: d("2026-10-31") };

    const sepResult = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE, d("2026-01-01"), d("2027-01-01"), sepPeriod,
    );
    const octResult = AnalyticsService.calculateProRataCapacity(
      COMMITMENT_PERCENTAGE, d("2026-01-01"), d("2027-01-01"), octPeriod,
    );

    // Sep: 22 working days × 60% × 8 × 60 = 6336
    // Oct: 22 working days × 60% × 8 × 60 = 6336
    expect(sepResult).toBe(6336);
    expect(octResult).toBe(6336);
  });

  // ------------------------------------------------------------------
  // 100% and high-percentage commitments
  // ------------------------------------------------------------------

  it("100% commitment returns full monthly working-day capacity", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      100,
      d("2026-01-01"),
      d("2027-01-01"),
      period,
    );
    // Sep 2026: 22 working days × 8h × 60min × 100% = 10560 minutes
    expect(result).toBe(10560);
  });

  it("150% commitment (over-commitment) is allowed", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      150,
      d("2026-01-01"),
      d("2027-01-01"),
      period,
    );
    // Sep 2026: 22 working days × 8h × 60min × 150% = 15840 minutes
    expect(result).toBe(15840);
  });
});
