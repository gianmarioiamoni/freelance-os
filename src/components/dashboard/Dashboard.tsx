// src/components/dashboard/Dashboard.tsx
import type { RevenueOverview } from "@/application/reporting/reporting-service";
import { MonthlyAnalytics } from "@/components/dashboard/MonthlyAnalytics";
import { MonthlyHours } from "@/components/dashboard/MonthlyHours";
import { ContractUtilization } from "@/components/dashboard/ContractUtilization";
import { PageHeader } from "@/components/page/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { formatPeriodDisplay } from "@/lib/analytics-periods";
import type { MonthlyAnalytics as MonthlyAnalyticsType } from "@/domain/analytics-types";
import Link from "next/link";
import type { JSX } from "react";

type DashboardProps = {
  analytics: MonthlyAnalyticsType;
  revenueOverview: RevenueOverview;
  hasActiveClients: boolean;
};

export function Dashboard({
  analytics,
  revenueOverview,
  hasActiveClients,
}: DashboardProps): JSX.Element {
  const hasTimeEntries = analytics.totalMinutes > 0;
  const periodDisplay = formatPeriodDisplay(analytics.period);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dashboard - ${periodDisplay}`}
        description="Track your work analytics and contract utilization"
      />

      {hasTimeEntries ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <MonthlyAnalytics analytics={analytics} revenueOverview={revenueOverview} />
          </div>
          <div className="lg:col-span-2">
            <MonthlyHours allocations={analytics.monthlyHoursAllocations} />
          </div>
          <div className="lg:col-span-1">
            <ContractUtilization utilizations={analytics.contractUtilizations} />
          </div>
        </div>
      ) : (
        <EmptyState
          title="No time entries yet"
          description={
            hasActiveClients
              ? "Log time from Time Tracking to see this month's analytics."
              : "Create a client, then log time from Time Tracking to see this month's analytics."
          }
          action={
            hasActiveClients ? (
              <Button asChild>
                <Link href="/time-tracking/new">Log time</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/clients/new">New client</Link>
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
