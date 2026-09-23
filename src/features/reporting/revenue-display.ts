// src/features/reporting/revenue-display.ts
import type { AccruedAmount, ForecastRevenue } from "@/domain/analytics-types";

export function formatPublishedAmounts(
  amounts: readonly AccruedAmount[],
): string {
  if (amounts.length === 0) {
    return "—";
  }

  return amounts.map((row) => `${row.published} ${row.currency}`).join(", ");
}

export function formatForecastAmounts(
  forecast: ForecastRevenue | null,
): string | null {
  if (forecast === null) {
    return null;
  }

  return formatPublishedAmounts(forecast.byCurrency);
}
