// src/lib/working-days.ts

/**
 * Count working days (Monday-Friday) in a date range.
 *
 * Semantics:
 * - Includes startDate (inclusive)
 * - Excludes endDate (exclusive, per contract [validFrom, validTo) convention)
 * - Counts Monday-Friday only
 * - No holiday calendar in this phase
 *
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (exclusive)
 * @returns Number of working days, or 0 if range is empty
 */
export function countWorkingDays(startDate: Date, endDate: Date): number {
  if (endDate <= startDate) {
    return 0;
  }

  let count = 0;
  const current = new Date(startDate);

  // Iterate until day before endDate (endDate is exclusive)
  while (current < endDate) {
    const dayOfWeek = current.getUTCDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

/**
 * Count working days in a calendar month.
 *
 * @param year - Full year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Number of working days in that month
 */
export function countWorkingDaysInMonth(year: number, month: number): number {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1)); // first day of next month (exclusive)
  return countWorkingDays(startDate, endDate);
}
