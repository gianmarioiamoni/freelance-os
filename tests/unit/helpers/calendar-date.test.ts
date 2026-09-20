// tests/unit/helpers/calendar-date.test.ts
import { describe, expect, it } from "vitest";

import {
  addUtcDays,
  parseUtcYmd,
  utcTodayYmd,
  utcYmd,
} from "../../helpers/calendar-date";

describe("calendar-date helpers", () => {
  it("utcTodayYmd uses the UTC calendar day across the Rome/UTC midnight window", () => {
    // 2026-09-19T22:30:00Z is 2026-09-20 00:30 in Europe/Rome.
    expect(utcTodayYmd(new Date("2026-09-19T22:30:00.000Z"))).toBe("2026-09-19");
    expect(utcTodayYmd(new Date("2026-09-20T00:30:00.000Z"))).toBe("2026-09-20");
  });

  it("parseUtcYmd is UTC midnight", () => {
    const date = parseUtcYmd("2026-09-20");
    expect(date.toISOString()).toBe("2026-09-20T00:00:00.000Z");
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
  });

  it("addUtcDays crosses month and year on the UTC calendar", () => {
    expect(addUtcDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addUtcDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("utcYmd pads month and day", () => {
    expect(utcYmd(2026, 9, 5)).toBe("2026-09-05");
  });
});
