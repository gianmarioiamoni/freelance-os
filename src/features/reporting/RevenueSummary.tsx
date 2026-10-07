// src/features/reporting/RevenueSummary.tsx
import type { CurrencyAmount } from "@/application/invoices/workspace-invoice-service";
import type {
  AccruedRevenue,
  ExpectedRevenue,
  ForecastRevenue,
} from "@/domain/analytics-types";
import {
  formatForecastAmounts,
  formatInvoiceAmounts,
  formatPublishedAmounts,
} from "@/features/reporting/revenue-display";
import type { JSX } from "react";

type RevenueSummaryProps = {
  accrued: AccruedRevenue;
  forecast: ForecastRevenue | null;
  expected?: ExpectedRevenue;
  /** When provided (including empty), Invoiced/Paid/Outstanding are always shown. */
  invoiced?: readonly CurrencyAmount[];
  paid?: readonly CurrencyAmount[];
  outstanding?: readonly CurrencyAmount[];
};

export function RevenueSummary({
  accrued,
  forecast,
  expected,
  invoiced,
  paid,
  outstanding,
}: RevenueSummaryProps): JSX.Element {
  const forecastLabel = formatForecastAmounts(forecast);
  const showInvoiceMetrics = invoiced !== undefined;

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div className="space-y-1">
        <dt className="text-sm font-medium text-muted-foreground">Accrued</dt>
        <dd className="text-2xl font-bold tabular-nums">
          {formatPublishedAmounts(accrued.byCurrency)}
        </dd>
      </div>
      {expected ? (
        <div className="space-y-1">
          <dt className="text-sm font-medium text-muted-foreground">Expected</dt>
          <dd className="text-2xl font-bold tabular-nums">
            {formatPublishedAmounts(expected.byCurrency)}
          </dd>
        </div>
      ) : null}
      {forecastLabel !== null ? (
        <div className="space-y-1">
          <dt className="text-sm font-medium text-muted-foreground">Forecast</dt>
          <dd className="text-2xl font-bold tabular-nums">{forecastLabel}</dd>
        </div>
      ) : null}
      {showInvoiceMetrics ? (
        <>
          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Invoiced</dt>
            <dd className="text-2xl font-bold tabular-nums">
              {formatInvoiceAmounts(invoiced)}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Paid</dt>
            <dd className="text-2xl font-bold tabular-nums">
              {formatInvoiceAmounts(paid ?? [])}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Outstanding</dt>
            <dd className="text-2xl font-bold tabular-nums">
              {formatInvoiceAmounts(outstanding ?? [])}
            </dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}
