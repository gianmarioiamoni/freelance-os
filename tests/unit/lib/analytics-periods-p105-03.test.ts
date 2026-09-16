// tests/unit/lib/analytics-periods-p105-03.test.ts
//
// P105-03 acceptance tests.
// Proves BR-105-014 (Workspace.timezone is the sole authority) and
// BR-105-015 (current-period end = today).
//
// Clock injection: vi.setSystemTime pins the "global now"; getTodayInTimezone
// and all period constructors accept an optional `now` parameter so tests can
// pass an explicit Date instead of relying on fake timers where that is cleaner.

import { describe, expect, it, afterEach, vi } from "vitest";

import {
  getTodayInTimezone,
  getTodayPeriod,
  getCurrentWeekPeriod,
  getCurrentMonthPeriod,
  getCurrentYearPeriod,
  getMonthPeriod,
  getPeriodDays,
} from "@/lib/analytics-periods";

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// getTodayInTimezone — foundation for all period constructors
// ---------------------------------------------------------------------------

describe("getTodayInTimezone — BR-105-014", () => {
  it("returns the workspace-local calendar date, not the server UTC date", () => {
    // 2026-09-16 01:30 UTC → still Sep 15 in America/New_York (UTC-4 in summer)
    const now = new Date("2026-09-16T01:30:00.000Z");

    const utcDate = getTodayInTimezone("UTC", now);
    const nyDate = getTodayInTimezone("America/New_York", now);

    expect(utcDate).toEqual({ year: 2026, month: 9, day: 16 });
    expect(nyDate).toEqual({ year: 2026, month: 9, day: 15 });
  });

  it("returns the next calendar day for timezones ahead of UTC", () => {
    // 2026-09-16 23:00 UTC → Sep 17 in Pacific/Auckland (UTC+12 in NZ standard time)
    const now = new Date("2026-09-16T23:00:00.000Z");

    const utcDate = getTodayInTimezone("UTC", now);
    const aucklandDate = getTodayInTimezone("Pacific/Auckland", now);

    expect(utcDate).toEqual({ year: 2026, month: 9, day: 16 });
    expect(aucklandDate.day).toBe(17);
  });

  it("returns the correct date at UTC midnight", () => {
    const now = new Date("2026-09-16T00:00:00.000Z");
    expect(getTodayInTimezone("UTC", now)).toEqual({ year: 2026, month: 9, day: 16 });
  });

  it("handles January correctly", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    expect(getTodayInTimezone("UTC", now)).toEqual({ year: 2026, month: 1, day: 1 });
  });

  it("handles December 31", () => {
    const now = new Date("2026-12-31T23:59:59.000Z");
    expect(getTodayInTimezone("UTC", now)).toEqual({ year: 2026, month: 12, day: 31 });
  });

  it("year-boundary: UTC is Dec 31 but workspace-local is already Jan 1", () => {
    // America/Los_Angeles is UTC-8 in winter; 2026-12-31 23:30 UTC → Jan 1 2027 in UTC+x
    // Use Pacific/Auckland which is UTC+13 in summer
    const now = new Date("2026-12-31T12:00:00.000Z");
    const auckland = getTodayInTimezone("Pacific/Auckland", now);
    // Auckland is UTC+13 in NZ daylight saving
    expect(auckland.year).toBe(2027);
    expect(auckland.month).toBe(1);
    expect(auckland.day).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getTodayPeriod
// ---------------------------------------------------------------------------

describe("getTodayPeriod — BR-105-014/015", () => {
  it("returns a single-day period for workspace-local today", () => {
    const now = new Date("2026-09-16T10:00:00.000Z");
    const period = getTodayPeriod("Europe/Rome", now);

    // 10:00 UTC = 12:00 Rome (CEST, UTC+2) → still Sep 16
    expect(period.startDate).toEqual(new Date("2026-09-16T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-16T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(1);
  });

  it("uses workspace-local date when server UTC and workspace dates differ", () => {
    // 01:00 UTC → still Sep 15 in America/New_York (UTC-4 EDT)
    const now = new Date("2026-09-16T01:00:00.000Z");
    const period = getTodayPeriod("America/New_York", now);

    expect(period.startDate).toEqual(new Date("2026-09-15T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-15T00:00:00.000Z"));
  });
});

// ---------------------------------------------------------------------------
// getCurrentWeekPeriod — BR-105-014/015, PD-105-009 (Monday start)
// ---------------------------------------------------------------------------

describe("getCurrentWeekPeriod — Monday start, ends today", () => {
  it("Wednesday: week starts on Monday and ends on Wednesday (workspace-local)", () => {
    // 2026-09-16 is a Wednesday; workspace = Europe/Rome (UTC+2 CEST)
    const now = new Date("2026-09-16T10:00:00.000Z"); // 12:00 Rome → Wednesday Sep 16
    const period = getCurrentWeekPeriod("Europe/Rome", now);

    expect(period.startDate).toEqual(new Date("2026-09-14T00:00:00.000Z")); // Monday
    expect(period.endDate).toEqual(new Date("2026-09-16T00:00:00.000Z"));   // Wednesday = today
  });

  it("Monday: week starts and ends on the same day (single day)", () => {
    // 2026-09-14 is a Monday
    const now = new Date("2026-09-14T10:00:00.000Z");
    const period = getCurrentWeekPeriod("UTC", now);

    expect(period.startDate).toEqual(new Date("2026-09-14T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-14T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(1);
  });

  it("Sunday: week start is the previous Monday", () => {
    // 2026-09-20 is a Sunday
    const now = new Date("2026-09-20T12:00:00.000Z");
    const period = getCurrentWeekPeriod("UTC", now);

    expect(period.startDate).toEqual(new Date("2026-09-14T00:00:00.000Z")); // Monday
    expect(period.endDate).toEqual(new Date("2026-09-20T00:00:00.000Z"));   // Sunday
    expect(getPeriodDays(period)).toBe(7);
  });

  it("week start in previous month when Monday falls in previous month", () => {
    // 2026-09-01 is a Tuesday → week starts 2026-08-31 (Monday)
    const now = new Date("2026-09-01T12:00:00.000Z");
    const period = getCurrentWeekPeriod("UTC", now);

    expect(period.startDate).toEqual(new Date("2026-08-31T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-01T00:00:00.000Z"));
  });

  it("timezone authority: server UTC and workspace differ on the week boundary", () => {
    // 01:00 UTC Sep 16 → Sep 15 (Tuesday) in America/New_York (UTC-4 EDT)
    // So week start should be Sep 14 (Monday), end Sep 15
    const now = new Date("2026-09-16T01:00:00.000Z");
    const period = getCurrentWeekPeriod("America/New_York", now);

    expect(period.startDate).toEqual(new Date("2026-09-14T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-15T00:00:00.000Z")); // workspace today = Sep 15
  });
});

// ---------------------------------------------------------------------------
// getCurrentMonthPeriod — BR-105-014/015
// ---------------------------------------------------------------------------

describe("getCurrentMonthPeriod — first-of-month → today", () => {
  it("mid-month: period is first-of-month → today", () => {
    const now = new Date("2026-09-16T10:00:00.000Z");
    const period = getCurrentMonthPeriod("Europe/Rome", now);

    expect(period.startDate).toEqual(new Date("2026-09-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-16T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(16);
  });

  it("first of month: period is a single day", () => {
    const now = new Date("2026-09-01T06:00:00.000Z");
    const period = getCurrentMonthPeriod("UTC", now);

    expect(period.startDate).toEqual(new Date("2026-09-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-01T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(1);
  });

  it("timezone authority: workspace-local Sep 15, server UTC is Sep 16", () => {
    // 01:00 UTC Sep 16 → Sep 15 in America/New_York
    const now = new Date("2026-09-16T01:00:00.000Z");
    const period = getCurrentMonthPeriod("America/New_York", now);

    expect(period.startDate).toEqual(new Date("2026-09-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-15T00:00:00.000Z")); // workspace today
  });

  it("January 1 is both start and end when workspace-local date is Jan 1", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const period = getCurrentMonthPeriod("UTC", now);

    expect(period.startDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("year boundary: UTC is Jan 1 2027 but workspace-local is still Dec 31 2026", () => {
    // Use America/Los_Angeles (UTC-8 in winter)
    // 2027-01-01T02:00:00Z → Dec 31 2026 18:00 in LA
    const now = new Date("2027-01-01T02:00:00.000Z");
    const period = getCurrentMonthPeriod("America/Los_Angeles", now);

    expect(period.startDate).toEqual(new Date("2026-12-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-12-31T00:00:00.000Z"));
  });
});

// ---------------------------------------------------------------------------
// getCurrentYearPeriod — BR-105-014/015
// ---------------------------------------------------------------------------

describe("getCurrentYearPeriod — Jan 1 → today", () => {
  it("mid-year: period is Jan 1 → today", () => {
    const now = new Date("2026-09-16T10:00:00.000Z");
    const period = getCurrentYearPeriod("UTC", now);

    expect(period.startDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-16T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(259); // 2026 is not a leap year: 31+28+31+30+31+30+31+31+16
  });

  it("Jan 1: period is a single day", () => {
    const now = new Date("2026-01-01T06:00:00.000Z");
    const period = getCurrentYearPeriod("UTC", now);

    expect(period.startDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(1);
  });

  it("timezone authority: workspace in UTC+13 sees next year before UTC does", () => {
    // 2026-12-31 23:30 UTC → 2027-01-01 12:30 in Pacific/Auckland
    const now = new Date("2026-12-31T23:30:00.000Z");
    const period = getCurrentYearPeriod("Pacific/Auckland", now);

    expect(period.startDate).toEqual(new Date("2027-01-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2027-01-01T00:00:00.000Z"));
  });

  it("timezone authority: workspace-local Sep 15, server UTC Sep 16", () => {
    const now = new Date("2026-09-16T01:00:00.000Z"); // 01:00 UTC = Sep 15 NY
    const period = getCurrentYearPeriod("America/New_York", now);

    expect(period.startDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-09-15T00:00:00.000Z"));
  });
});

// ---------------------------------------------------------------------------
// Historical periods — BR-105-015: natural end unchanged
// ---------------------------------------------------------------------------

describe("getMonthPeriod — historical periods retain natural end", () => {
  it("historical month: full calendar month regardless of today", () => {
    const period = getMonthPeriod(2026, 8); // August 2026

    expect(period.startDate).toEqual(new Date("2026-08-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-08-31T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(31);
  });

  it("historical February non-leap year: ends on Feb 28", () => {
    const period = getMonthPeriod(2026, 2);

    expect(period.startDate).toEqual(new Date("2026-02-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-02-28T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(28);
  });

  it("historical February leap year: ends on Feb 29", () => {
    const period = getMonthPeriod(2024, 2);

    expect(period.startDate).toEqual(new Date("2024-02-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2024-02-29T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(29);
  });

  it("December: ends on Dec 31", () => {
    const period = getMonthPeriod(2026, 12);

    expect(period.startDate).toEqual(new Date("2026-12-01T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-12-31T00:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(31);
  });

  it("historical month is not affected by the process clock", () => {
    // Even if system time is mocked, historical periods return full month
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T12:00:00.000Z"));

    const period = getMonthPeriod(2026, 8);
    expect(period.endDate).toEqual(new Date("2026-08-31T00:00:00.000Z"));

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Boundary condition: midnight / timezone offset
// ---------------------------------------------------------------------------

describe("timezone boundary conditions", () => {
  it("exactly at midnight UTC: workspace-local and UTC agree", () => {
    const now = new Date("2026-09-16T00:00:00.000Z");
    const period = getCurrentMonthPeriod("UTC", now);

    expect(period.endDate).toEqual(new Date("2026-09-16T00:00:00.000Z"));
  });

  it("one second before UTC midnight: UTC sees Sep 15, ahead-of-UTC workspace may see Sep 16", () => {
    // 2026-09-15T23:59:59Z → still Sep 15 UTC, but Sep 16 in UTC+1
    const now = new Date("2026-09-15T23:59:59.000Z");

    const utcPeriod = getCurrentMonthPeriod("UTC", now);
    const romePeriod = getCurrentMonthPeriod("Europe/Rome", now); // UTC+1 in September = CEST UTC+2

    expect(utcPeriod.endDate).toEqual(new Date("2026-09-15T00:00:00.000Z"));
    // Europe/Rome is UTC+2 in Sep → 23:59 UTC = 01:59 Rome the next day
    expect(romePeriod.endDate).toEqual(new Date("2026-09-16T00:00:00.000Z"));
  });

  it("fake timers: vi.setSystemTime controls what getTodayInTimezone sees", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T12:00:00.000Z"));

    const period = getCurrentMonthPeriod("UTC");

    expect(period.endDate).toEqual(new Date("2026-09-16T00:00:00.000Z"));
  });

  it("Monday start does not cross year boundary in week spanning Dec 31", () => {
    // 2026-12-31 is a Thursday → week starts Monday 2026-12-28
    const now = new Date("2026-12-31T12:00:00.000Z");
    const period = getCurrentWeekPeriod("UTC", now);

    expect(period.startDate).toEqual(new Date("2026-12-28T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-12-31T00:00:00.000Z"));
  });

  it("Monday start when today is Jan 1 and the Monday is in December of previous year", () => {
    // 2026-01-01 is a Thursday → week start is Monday 2025-12-29
    const now = new Date("2026-01-01T12:00:00.000Z");
    const period = getCurrentWeekPeriod("UTC", now);

    expect(period.startDate).toEqual(new Date("2025-12-29T00:00:00.000Z"));
    expect(period.endDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });
});

// ---------------------------------------------------------------------------
// getPeriodDays on "through today" partial periods
// ---------------------------------------------------------------------------

describe("getPeriodDays on partial current periods", () => {
  it("partial month day count is exact, not 30", () => {
    // Sep 1–16 = 16 days
    const period = getCurrentMonthPeriod("UTC", new Date("2026-09-16T12:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(16);
  });

  it("partial year day count is exact", () => {
    // Jan 1 to Jan 7 = 7 days
    const period = getCurrentYearPeriod("UTC", new Date("2026-01-07T12:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(7);
  });

  it("single day week has 1 day", () => {
    // 2026-09-14 is a Monday
    const period = getCurrentWeekPeriod("UTC", new Date("2026-09-14T12:00:00.000Z"));
    expect(getPeriodDays(period)).toBe(1);
  });
});
