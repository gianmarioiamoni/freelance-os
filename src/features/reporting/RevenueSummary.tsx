// src/features/reporting/RevenueSummary.tsx
import type {
  AccruedRevenue,
  ExpectedRevenue,
  ForecastRevenue,
} from "@/domain/analytics-types";
import {
  formatForecastAmounts,
  formatPublishedAmounts,
} from "@/features/reporting/revenue-display";
import type { JSX } from "react";

type RevenueSummaryProps = {
  accrued: AccruedRevenue;
  forecast: ForecastRevenue | null;
  expected?: ExpectedRevenue;
};

export function RevenueSummary({
  accrued,
  forecast,
  expected,
}: RevenueSummaryProps): JSX.Element {
  const forecastLabel = formatForecastAmounts(forecast);

  return (
    <dl className={`grid gap-4 sm:grid-cols-2${expected ? " lg:grid-cols-3" : ""}`}>
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
    </dl>
  );
}
