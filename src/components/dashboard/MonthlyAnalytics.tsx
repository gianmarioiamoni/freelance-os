// src/components/dashboard/MonthlyAnalytics.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { MonthlyAnalytics } from "@/domain/analytics-types";
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
        <CardTitle>Monthly Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  analytics.totalMinutes > 0 
                    ? ((analytics.nonBillableMinutes / analytics.totalMinutes) * 100)
                    : null
                )})
              </span>
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">Daily Average</dt>
            <dd className="text-2xl font-bold" aria-label={`${AnalyticsService.formatDuration(Math.round(analytics.totalMinutes / 30))} daily average`}>
              {AnalyticsService.formatDuration(Math.round(analytics.totalMinutes / 30))}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                per day
              </span>
            </dd>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}