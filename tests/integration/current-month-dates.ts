// tests/integration/current-month-dates.ts
import { getCurrentMonthPeriod } from "@/lib/analytics-periods";

/**
 * Date builders for integration tests that assert against the current-month
 * period resolved by `AnalyticsService`.
 *
 * A test must never hardcode a calendar month while asserting against a
 * clock-resolved period: the fixtures fall outside the period as soon as the
 * month turns over (F-104-006). These builders derive every fixture date from
 * the same `getCurrentMonthPeriod()` the service uses, so fixtures move with
 * the clock.
 *
 * Timezone semantics are deliberately unchanged: this mirrors
 * `getCurrentMonthPeriod`, which builds UTC dates from the process clock.
 * Making `Workspace.timezone` authoritative, and ending a current period on
 * today, belong to EPIC-105 P105-03 (BR-105-014, BR-105-015).
 */

function currentMonthReference(): { year: number; month: number } {
  const start = getCurrentMonthPeriod().startDate;
  return { year: start.getUTCFullYear(), month: start.getUTCMonth() };
}

/**
 * A UTC date at `dayOfMonth` in the month `monthOffset` months from the
 * current month. Only days 1–28 are allowed, because any later day does not
 * exist in every month and would reintroduce calendar coupling.
 */
export function monthOffsetDay(monthOffset: number, dayOfMonth: number): Date {
  if (dayOfMonth < 1 || dayOfMonth > 28) {
    throw new Error(
      `monthOffsetDay: dayOfMonth must be 1-28 to exist in every month, received ${dayOfMonth}. Use lastDayOfCurrentMonth() or lastDayOfPreviousMonth() for month ends.`,
    );
  }

  const { year, month } = currentMonthReference();
  return new Date(Date.UTC(year, month + monthOffset, dayOfMonth));
}

/** A UTC date inside the current month. Only days 1–28 are allowed. */
export function currentMonthDay(dayOfMonth: number): Date {
  return monthOffsetDay(0, dayOfMonth);
}

export function lastDayOfCurrentMonth(): Date {
  return getCurrentMonthPeriod().endDate;
}

export function lastDayOfPreviousMonth(): Date {
  const { year, month } = currentMonthReference();
  return new Date(Date.UTC(year, month, 0));
}

/**
 * A day in February of the previous calendar year, which is therefore never
 * the current month. Used to prove that entries in a month of a different
 * length do not leak into the current-month period.
 */
export function februaryDayOfPreviousYear(dayOfMonth: number): Date {
  if (dayOfMonth < 1 || dayOfMonth > 28) {
    throw new Error(
      `februaryDayOfPreviousYear: dayOfMonth must be 1-28, received ${dayOfMonth}.`,
    );
  }

  const { year } = currentMonthReference();
  return new Date(Date.UTC(year - 1, 1, dayOfMonth));
}
