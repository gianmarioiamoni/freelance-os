// src/components/dashboard/Dashboard.tsx
import { MonthlyAnalytics } from "@/components/dashboard/MonthlyAnalytics";
import { ClientAllocation } from "@/components/dashboard/ClientAllocation";
import { ContractUtilization } from "@/components/dashboard/ContractUtilization";
import { PageHeader } from "@/components/page/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { formatPeriodDisplay } from "@/lib/analytics-periods";
import type { MonthlyAnalytics as MonthlyAnalyticsType } from "@/domain/analytics-types";
import type { JSX } from "react";

type DashboardProps = {
  analytics: MonthlyAnalyticsType;
};

export function Dashboard({ analytics }: DashboardProps): JSX.Element {
  const hasTimeEntries = analytics.totalMinutes > 0;
  const periodDisplay = formatPeriodDisplay(analytics.period);

  if (!hasTimeEntries) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Dashboard - ${periodDisplay}`}
          description="Track your work analytics and contract utilization"
        />
        <EmptyState
          title="No time entries yet"
          description="Start by creating your first client and logging some work from the Time Tracking page."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dashboard - ${periodDisplay}`}
        description="Track your work analytics and contract utilization"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Summary - Takes full width on mobile, 1 column on large screens */}
        <div className="lg:col-span-3">
          <MonthlyAnalytics analytics={analytics} />
        </div>

        {/* Client Allocation - Left column on large screens */}
        <div className="lg:col-span-2">
          <ClientAllocation allocations={analytics.clientAllocations} />
        </div>

        {/* Contract Utilization - Right column on large screens */}
        <div className="lg:col-span-1">
          <ContractUtilization utilizations={analytics.contractUtilizations} />
        </div>
      </div>
    </div>
  );
}