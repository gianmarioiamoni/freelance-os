// tests/unit/features/reporting/revenue-display.test.ts
import { describe, expect, it } from "vitest";

import type { ForecastRevenue } from "@/domain/analytics-types";
import {
  formatForecastAmounts,
  formatPublishedAmounts,
} from "@/features/reporting/revenue-display";

const period = {
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T00:00:00.000Z"),
};

describe("revenue display", () => {
  it("formats published Accrued amounts without mixing currencies", () => {
    expect(
      formatPublishedAmounts([
        { currency: "EUR", unrounded: 160, published: 160 },
        { currency: "USD", unrounded: 40.4, published: 40 },
      ]),
    ).toBe("160 EUR, 40 USD");
  });

  it("returns null Forecast for historical or custom periods", () => {
    expect(formatForecastAmounts(null)).toBeNull();
  });

  it("displays a server-derived Forecast, including a real zero", () => {
    const forecast: ForecastRevenue = {
      period,
      timezone: "UTC",
      elapsedPeriod: 15,
      totalPeriod: 15,
      byCurrency: [{ currency: "EUR", unrounded: 0, published: 0 }],
      byContract: [],
    };

    expect(formatForecastAmounts(forecast)).toBe("0 EUR");
  });
});
