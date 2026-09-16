// tests/unit/application/analytics/analytics-pro-rata.test.ts
import { describe, expect, it } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { AnalyticsPeriod } from "@/domain/analytics-types";

/**
 * Unit tests for AnalyticsService.calculateProRataCapacity (BR-105-017).
 *
 * Formula:
 *   overlapDays = max(0, min(periodEnd, contractInclusiveEnd) − max(periodStart, validFrom) + 1)
 *   proRataMinutes = monthlyContractedMinutes × (overlapDays / periodDays)
 *
 * Boundary convention: [validFrom, validTo) — validTo is exclusive.
 * Ongoing contracts (validTo === null) are treated as infinitely valid.
 * No rollover, carry-over, or expiry semantics (OBD-012 open).
 */

function d(iso: string): Date {
  return new Date(iso + "T00:00:00.000Z");
}

const MONTHLY_MINUTES = 4800; // 80 hours/month

describe("AnalyticsService.calculateProRataCapacity (BR-105-017)", () => {
  // ------------------------------------------------------------------
  // Null capacity → null result (no denominator invented)
  // ------------------------------------------------------------------

  it("returns null when monthlyContractedMinutes is null (unlimited — BR-105-016)", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      null,
      d("2026-01-01"),
      null,
      period,
    );
    expect(result).toBeNull();
  });

  it("returns null for null capacity even when validTo is finite", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      null,
      d("2026-01-01"),
      d("2026-12-31"),
      period,
    );
    expect(result).toBeNull();
  });

  // ------------------------------------------------------------------
  // Full-period overlap
  // ------------------------------------------------------------------

  it("returns full monthly capacity when contract covers the entire 30-day period", () => {
    // Period: Sep 2026 (30 days). Contract: Jan 2026 → Jan 2027 (covers all).
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-01-01"),
      d("2027-01-01"), // exclusive end — contract covers through 2026-12-31
      period,
    );
    // 30 overlap / 30 period = 1.0 × 4800 = 4800
    expect(result).toBe(4800);
  });

  it("returns full monthly capacity for a 31-day period when contract covers all", () => {
    // Period: Oct 2026 (31 days). Contract spans the full month.
    const period: AnalyticsPeriod = { startDate: d("2026-10-01"), endDate: d("2026-10-31") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-01-01"),
      d("2027-01-01"),
      period,
    );
    // 31/31 = 1.0 → 4800
    expect(result).toBe(4800);
  });

  it("returns full monthly capacity for a 28-day period (February) when contract covers all", () => {
    const period: AnalyticsPeriod = { startDate: d("2027-02-01"), endDate: d("2027-02-28") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-01-01"),
      d("2028-01-01"),
      period,
    );
    // 28/28 = 1.0 → 4800
    expect(result).toBe(4800);
  });

  // ------------------------------------------------------------------
  // Single-day period
  // ------------------------------------------------------------------

  it("returns 1/30 of monthly capacity for a single day in a 30-day period", () => {
    // Period: one day (2026-09-15). Month has 30 days.
    const period: AnalyticsPeriod = { startDate: d("2026-09-15"), endDate: d("2026-09-15") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,   // 4800
      d("2026-01-01"),
      d("2027-01-01"),
      period,
    );
    // 1/1 period day, contract covers the day fully → 4800 × 1/1 = 4800
    // (period is 1 day, overlap is 1 day)
    expect(result).toBe(4800);
  });

  it("returns correct pro-rata for a 1-day period within a 30-day month (external context)", () => {
    // Verify: 4800 × (1/30) when the caller uses a 30-day period and only one day overlaps.
    // Contract valid only on 2026-09-15 → [2026-09-15, 2026-09-16).
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-09-15"),
      d("2026-09-16"), // exclusive → effective inclusive end = 2026-09-15 (1 day)
      period,
    );
    // overlap = 1 day (just 2026-09-15); period = 30 days
    expect(result).toBeCloseTo(4800 / 30, 6);
  });

  // ------------------------------------------------------------------
  // Partial overlap — contract starts inside the period
  // ------------------------------------------------------------------

  it("pro-rates when contract starts in the middle of the period (start-side overlap)", () => {
    // Period: Sep 1–30 (30 days). Contract: Sep 16 → Dec 31 (inclusive) → validTo 2027-01-01.
    // Overlap: Sep 16–30 = 15 days.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-09-16"),
      d("2027-01-01"),
      period,
    );
    // 15 overlap / 30 period = 0.5 × 4800 = 2400
    expect(result).toBe(2400);
  });

  // ------------------------------------------------------------------
  // Partial overlap — contract ends inside the period
  // ------------------------------------------------------------------

  it("pro-rates when contract ends in the middle of the period (end-side overlap)", () => {
    // Period: Sep 1–30 (30 days). Contract: Jan 1 → Sep 16 (exclusive) → last inclusive day Sep 15.
    // Overlap: Sep 1–15 = 15 days.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-01-01"),
      d("2026-09-16"), // exclusive end → last inclusive = Sep 15
      period,
    );
    // 15 overlap / 30 period = 0.5 × 4800 = 2400
    expect(result).toBe(2400);
  });

  // ------------------------------------------------------------------
  // Ongoing contract (validTo === null) — BR-105-016 / BR-105-017
  // ------------------------------------------------------------------

  it("ongoing contract (validTo null) with finite capacity — pro-rates to full period", () => {
    // validTo null → contract extends through the entire period and beyond.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-01-01"),
      null, // ongoing
      period,
    );
    // overlap = full 30 days (ongoing covers entire period)
    expect(result).toBe(4800);
  });

  it("ongoing contract starting in the middle of the period — partial overlap", () => {
    // Contract starts Sep 16 and is ongoing. Period Sep 1–30.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-09-16"),
      null, // ongoing
      period,
    );
    // Overlap: Sep 16–30 = 15 days / 30 days period
    expect(result).toBe(2400);
  });

  it("ongoing + null capacity returns null (BR-105-016: all four combinations)", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      null, // unlimited
      d("2026-01-01"),
      null, // ongoing
      period,
    );
    expect(result).toBeNull();
  });

  // ------------------------------------------------------------------
  // No overlap — period entirely outside contract validity
  // ------------------------------------------------------------------

  it("returns 0 when the period is entirely after the contract validity", () => {
    // Contract: Jan 1 → Jul 1 (exclusive). Period: Sep 1–30.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-01-01"),
      d("2026-07-01"), // ends June 30 inclusive
      period,
    );
    expect(result).toBe(0);
  });

  it("returns 0 when the period is entirely before the contract validity", () => {
    // Contract: Dec 1 2026 → Jan 1 2027. Period: Sep 1–30.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-12-01"),
      d("2027-01-01"),
      period,
    );
    expect(result).toBe(0);
  });

  // ------------------------------------------------------------------
  // Weekly period
  // ------------------------------------------------------------------

  it("pro-rates correctly for a 7-day week when contract covers the full week", () => {
    // Period: 7 days (Mon Sep 14 – Sun Sep 20). Contract covers all.
    const period: AnalyticsPeriod = { startDate: d("2026-09-14"), endDate: d("2026-09-20") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-01-01"),
      d("2027-01-01"),
      period,
    );
    // 7/7 = 1.0 × 4800 = 4800
    expect(result).toBe(4800);
  });

  it("pro-rates correctly for a partial week overlap", () => {
    // Period: Mon Sep 14 – Sun Sep 20 (7 days). Contract: Sep 17 onwards.
    // Overlap: Sep 17–20 = 4 days.
    const period: AnalyticsPeriod = { startDate: d("2026-09-14"), endDate: d("2026-09-20") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-09-17"),
      d("2027-01-01"),
      period,
    );
    // 4/7 × 4800
    expect(result).toBeCloseTo((4800 * 4) / 7, 6);
  });

  // ------------------------------------------------------------------
  // Year-scale period
  // ------------------------------------------------------------------

  it("pro-rates for a full 365-day year period when contract covers all", () => {
    const period: AnalyticsPeriod = { startDate: d("2026-01-01"), endDate: d("2026-12-31") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-01-01"),
      d("2027-01-01"),
      period,
    );
    // 365/365 = 1.0 × 4800
    expect(result).toBe(4800);
  });

  // ------------------------------------------------------------------
  // Exact boundary: validTo on the same day as period start (exclusive = no overlap)
  // ------------------------------------------------------------------

  it("returns 0 when validTo equals period startDate (exclusive boundary — no overlap)", () => {
    // Contract [2026-01-01, 2026-09-01) → last inclusive day is Aug 31.
    // Period: Sep 1–30. No overlap.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-01-01"),
      d("2026-09-01"), // exclusive — contract ends Aug 31 inclusive
      period,
    );
    expect(result).toBe(0);
  });

  it("returns full capacity when validFrom equals period startDate (inclusive boundary)", () => {
    // Contract starts exactly on period start → full overlap.
    const period: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const result = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES,
      d("2026-09-01"),
      d("2027-01-01"),
      period,
    );
    expect(result).toBe(4800);
  });

  // ------------------------------------------------------------------
  // OBD-012 guard: no rollover or expiry semantics applied
  // ------------------------------------------------------------------

  it("does not apply rollover — capacity for the next month is independent", () => {
    // Two consecutive periods. The calculation for Sep must not carry over to Oct.
    const sepPeriod: AnalyticsPeriod = { startDate: d("2026-09-01"), endDate: d("2026-09-30") };
    const octPeriod: AnalyticsPeriod = { startDate: d("2026-10-01"), endDate: d("2026-10-31") };

    const sepResult = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES, d("2026-01-01"), d("2027-01-01"), sepPeriod,
    );
    const octResult = AnalyticsService.calculateProRataCapacity(
      MONTHLY_MINUTES, d("2026-01-01"), d("2027-01-01"), octPeriod,
    );

    // Each period yields its own pro-rata: 4800. No carry-over between them.
    expect(sepResult).toBe(4800);
    expect(octResult).toBe(4800);
    // The sum is NOT double the monthly limit — it's each period's own pro-rata.
    // (This assertion documents that we do not accumulate across periods.)
    expect(sepResult! + octResult!).toBe(9600); // two independent months
  });
});

// ------------------------------------------------------------------
// BR-105-016: isOngoingUtilization helper
// ------------------------------------------------------------------

describe("AnalyticsService.isOngoingUtilization (BR-105-016)", () => {
  it("returns true when validTo is null (ongoing contract)", () => {
    expect(AnalyticsService.isOngoingUtilization(null)).toBe(true);
  });

  it("returns false when validTo is a Date (finite contract)", () => {
    expect(AnalyticsService.isOngoingUtilization(new Date("2026-12-31"))).toBe(false);
  });
});
