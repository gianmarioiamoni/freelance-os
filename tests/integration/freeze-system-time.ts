// tests/integration/freeze-system-time.ts
import { afterEach, beforeEach, vi } from "vitest";

/**
 * Fixed mid-month clock for current-period analytics/alert integration tests.
 *
 * `getCurrentMonthPeriod` now spans the full calendar month. Fixtures
 * on day 15/16, or hardcoded September work dates, fall outside the period
 * whenever the real calendar is in a later month.
 *
 * Only `Date` is faked so Prisma/async timers keep running.
 */
export const FROZEN_INTEGRATION_NOW = new Date("2026-09-20T12:00:00.000Z");

export function pinIntegrationClock(now: Date = FROZEN_INTEGRATION_NOW): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
}
