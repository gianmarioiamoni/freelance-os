// src/features/reporting/revenue-display.ts
import type { CurrencyAmount } from "@/application/invoices/workspace-invoice-service";
import type { AccruedAmount, ForecastRevenue } from "@/domain/analytics-types";

export function formatPublishedAmounts(
  amounts: readonly AccruedAmount[],
): string {
  if (amounts.length === 0) {
    return "-";
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

/**
 * Format invoice amounts (Invoiced/Paid/Outstanding).
 * Displays decimal amounts with currency labels; currencies stay separate.
 */
export function formatInvoiceAmounts(
  amounts: readonly CurrencyAmount[],
): string {
  if (amounts.length === 0) {
    return "-";
  }

  return amounts
    .map((row) => `${formatDecimalAmount(row.amount)} ${row.currency}`)
    .join(", ");
}

/**
 * Format decimal string amount for display.
 * Removes trailing zeros after decimal point for cleaner display.
 */
function formatDecimalAmount(amount: string): string {
  const [whole, fraction = ""] = amount.split(".");

  if (!fraction || fraction === "0000") {
    return whole;
  }

  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}
