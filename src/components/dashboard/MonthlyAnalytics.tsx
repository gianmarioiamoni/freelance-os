// src/components/dashboard/MonthlyAnalytics.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { MonthlyAnalytics } from "@/domain/analytics-types";
import { RevenueSummary } from "@/features/reporting/RevenueSummary";
import type { JSX } from "react";

type MonthlyAnalyticsProps = {
  analytics: MonthlyAnalytics;
};

export function MonthlyAnalytics({ analytics }: MonthlyAnalyticsProps): JSX.Element {
  const totalHours = AnalyticsService.formatDuration(analytics.totalMinutes);
  const billableHours = AnalyticsService.formatDuration(analytics.billableMinutes);
  const nonBillableHours = AnalyticsService.formatDuration(analytics.nonBillableMinutes);
  const billablePercentage = AnalyticsService.formatPercentage(analytics.billablePercentage);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm">
          Monthly Summary
        </h2>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Total Hours</dt>
            <dd className="text-2xl font-bold" aria-label={`${totalHours} total hours tracked`}>
              {totalHours}
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Billable Hours</dt>
            <dd className="text-2xl font-bold" aria-label={`${billableHours} billable hours, ${billablePercentage} of total`}>
              {billableHours}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({billablePercentage})
              </span>
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Non-billable Hours</dt>
            <dd className="text-2xl font-bold" aria-label={`${nonBillableHours} non-billable hours`}>
              {nonBillableHours}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({AnalyticsService.formatPercentage(
                  AnalyticsService.calculateBillablePercentage(
                    analytics.nonBillableMinutes,
                    analytics.totalMinutes
                  )
                )})
              </span>
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Daily Average</dt>
            <dd className="text-2xl font-bold" aria-label={`${AnalyticsService.formatDuration(AnalyticsService.calculateDailyAverage(analytics.totalMinutes, analytics.period))} daily average`}>
              {AnalyticsService.formatDuration(AnalyticsService.calculateDailyAverage(analytics.totalMinutes, analytics.period))}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                per day
              </span>
            </dd>
          </div>
        </dl>
        <div className="mt-6 border-t pt-4">
          <RevenueSummary accrued={analytics.accrued} forecast={analytics.forecast} />
        </div>
      </CardContent>
    </Card>
  );
}