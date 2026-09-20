// tests/helpers/calendar-date.ts

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Formats a UTC calendar date. `month` is 1-based. */
export function utcYmd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** UTC calendar day of `now` (`YYYY-MM-DD`). Does not use local getters. */
export function utcTodayYmd(now: Date = new Date()): string {
  return utcYmd(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}

/** Parses `YYYY-MM-DD` as UTC midnight. */
export function parseUtcYmd(ymd: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) {
    throw new Error(`parseUtcYmd: expected YYYY-MM-DD, received ${ymd}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Adds `days` on the UTC calendar. Does not use local `setDate`. */
export function addUtcDays(ymd: string, days: number): string {
  const date = parseUtcYmd(ymd);
  const shifted = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  );
  return utcTodayYmd(shifted);
}
