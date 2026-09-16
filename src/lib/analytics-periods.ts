// src/lib/analytics-periods.ts
import type { AnalyticsPeriod } from "@/domain/analytics-types";

// ---------------------------------------------------------------------------
// Internal: timezone-aware calendar date resolution (BR-105-014)
// ---------------------------------------------------------------------------

/**
 * Returns the current calendar date in the given IANA timezone.
 * Uses `Intl.DateTimeFormat` so it is independent of the process timezone.
 * BR-105-014: `Workspace.timezone` is the sole authority.
 *
 * @param timezone - IANA timezone string, e.g. "Europe/Rome"
 * @param now      - The point in time to resolve (defaults to `new Date()`).
 *                   Inject in tests via `vi.setSystemTime`.
 */
export function getTodayInTimezone(
  timezone: string,
  now: Date = new Date(),
): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // "en-CA" locale produces "YYYY-MM-DD" — safe to split
  const [datePart] = formatter.format(now).split(",");
  const [year, month, day] = datePart.trim().split("-").map(Number);
  return { year, month, day };
}

/**
 * Converts a workspace-local calendar date to a UTC Date at midnight.
 * All `AnalyticsPeriod` dates are stored as UTC midnight per the established
 * domain convention (workDate is a calendar date, not a timestamp).
 */
function toUTCDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

// ---------------------------------------------------------------------------
// Current-period constructors (timezone-aware, ends today — BR-105-014/015)
// ---------------------------------------------------------------------------

/**
 * Creates a one-day period for today in the given workspace timezone.
 * BR-105-015: current period ends today.
 * BR-105-014: boundary derived from Workspace.timezone, not the server clock.
 */
export function getTodayPeriod(timezone: string, now: Date = new Date()): AnalyticsPeriod {
  const { year, month, day } = getTodayInTimezone(timezone, now);
  const today = toUTCDate(year, month, day);
  return { startDate: today, endDate: today };
}

/**
 * Creates a period for the current week (Monday → today) in the workspace timezone.
 * Week convention: Monday start, per PD-105-009.
 * BR-105-015: current week ends today.
 * BR-105-014: boundary derived from Workspace.timezone.
 */
export function getCurrentWeekPeriod(timezone: string, now: Date = new Date()): AnalyticsPeriod {
  const { year, month, day } = getTodayInTimezone(timezone, now);
  const today = toUTCDate(year, month, day);

  // Determine the Monday of the current week in workspace-local space.
  // today is already a UTC-midnight Date representing a workspace-local calendar day.
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setUTCDate(today.getUTCDate() - daysFromMonday);

  return { startDate: weekStart, endDate: today };
}

/**
 * Creates a period for the current month (first-of-month → today) in the workspace timezone.
 * BR-105-015: current month ends today (replaces end-of-month semantics per F-104-017).
 * BR-105-014: boundary derived from Workspace.timezone.
 *
 * @deprecated Pass a timezone — the zero-argument overload is removed by P105-03.
 *             Kept for backward compatibility during the transition only; callers
 *             in production must pass `context.timezone`.
 */
export function getCurrentMonthPeriod(timezone = "UTC", now: Date = new Date()): AnalyticsPeriod {
  const { year, month, day } = getTodayInTimezone(timezone, now);
  const startDate = toUTCDate(year, month, 1);
  const endDate = toUTCDate(year, month, day);
  return { startDate, endDate };
}

/**
 * Creates a period for the current year (Jan 1 → today) in the workspace timezone.
 * BR-105-015: current year ends today.
 * BR-105-014: boundary derived from Workspace.timezone.
 */
export function getCurrentYearPeriod(timezone: string, now: Date = new Date()): AnalyticsPeriod {
  const { year, month, day } = getTodayInTimezone(timezone, now);
  const startDate = toUTCDate(year, 1, 1);
  const endDate = toUTCDate(year, month, day);
  return { startDate, endDate };
}

/**
 * Returns the Monday that starts the ISO week containing `date`.
 * `date` is treated as a UTC-midnight calendar date (as produced by the
 * period constructors above and by URL search-parameter parsing).
 * PD-105-009: Monday-start convention, shared across time-tracking and reporting.
 * F-105-P-003: promoted from `src/app/(app)/time-tracking/page.tsx`.
 */
export function getWeekStartFromDate(date: Date): Date {
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(date);
  weekStart.setUTCDate(date.getUTCDate() - daysFromMonday);
  return weekStart;
}

// ---------------------------------------------------------------------------
// Historical period constructors (natural end — BR-105-015)
// ---------------------------------------------------------------------------

/**
 * Creates a period for a specific month and year.
 * Historical: spans the full calendar month, regardless of today.
 * month is 1-based (January = 1).
 */
export function getMonthPeriod(year: number, month: number): AnalyticsPeriod {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0)); // day 0 = last day of previous month
  return { startDate, endDate };
}

/**
 * Creates a period for a specific date range (inclusive, UTC midnight).
 */
export function getDateRangePeriod(startDate: Date, endDate: Date): AnalyticsPeriod {
  return {
    startDate: new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())),
    endDate: new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())),
  };
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/**
 * Validates that a period has a valid date range (start ≤ end).
 */
export function isValidPeriod(period: AnalyticsPeriod): boolean {
  return period.startDate <= period.endDate;
}

/**
 * Checks if a date falls within the given period (inclusive).
 */
export function isDateInPeriod(date: Date, period: AnalyticsPeriod): boolean {
  const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return dateOnly >= period.startDate && dateOnly <= period.endDate;
}

/**
 * Gets the number of days in a period (inclusive of both endpoints).
 * P105-02: Used as the daily-average divisor; no longer hardcoded to 30.
 */
export function getPeriodDays(period: AnalyticsPeriod): number {
  const timeDiff = period.endDate.getTime() - period.startDate.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive end date
}

/**
 * Formats a period for display.
 * Uses explicit locale (en-US) per PD-105-010 / F-104-015 to avoid
 * non-deterministic `toLocaleDateString()` output.
 */
export function formatPeriodDisplay(period: AnalyticsPeriod): string {
  const startMonth = period.startDate.getUTCMonth();
  const startYear = period.startDate.getUTCFullYear();
  const endMonth = period.endDate.getUTCMonth();
  const endYear = period.endDate.getUTCFullYear();

  // Full calendar month?
  const isFullMonth =
    period.startDate.getUTCDate() === 1 &&
    period.endDate.getUTCDate() === new Date(Date.UTC(endYear, endMonth + 1, 0)).getUTCDate() &&
    startMonth === endMonth &&
    startYear === endYear;

  // Partial current month: starts on the 1st, ends within the same month
  // (e.g. current-month periods that end today per PD-105-002).
  const isCurrentMonthPeriod =
    period.startDate.getUTCDate() === 1 &&
    startMonth === endMonth &&
    startYear === endYear;

  if (isFullMonth || isCurrentMonthPeriod) {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${monthNames[startMonth]} ${startYear}`;
  }

  // Explicit locale per F-104-015 / PD-105-010
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(period.startDate)} - ${fmt.format(period.endDate)}`;
}
