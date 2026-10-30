// src/app/(viewer-portal)/viewer-dashboard/page.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { ViewerMetricCard } from "@/components/viewer-portal/ViewerMetricCard";
import { SimpleDailyBars } from "@/components/viewer-portal/SimpleDailyBars";
import { AnomaliesAlert } from "@/components/viewer-portal/AnomaliesAlert";
import { PeriodSelector } from "@/components/viewer-portal/PeriodSelector";
import { getViewerDashboard } from "@/application/timesheet-viewer/get-viewer-dashboard";
import { requireViewerAccess } from "@/application/timesheet-viewer/viewer-access-guard";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { redirect } from "next/navigation";
import type { JSX } from "react";

type ViewerDashboardPageProps = {
  searchParams: Promise<{
    workspaceId?: string;
    viewerAccessId?: string;
    month?: string;
    year?: string;
  }>;
};

export default async function ViewerDashboardPage({
  searchParams,
}: ViewerDashboardPageProps): Promise<JSX.Element> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const params = await searchParams;
  const workspaceId = params.workspaceId;
  const viewerAccessId = params.viewerAccessId;

  if (!workspaceId || !viewerAccessId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Missing workspace or viewer access ID</p>
      </div>
    );
  }

  const now = new Date();
  const month = params.month
    ? parseInt(params.month, 10)
    : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();

  // Validate month and year
  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invalid month or year</p>
      </div>
    );
  }

  try {
    const repositories = createRepositories();

    // Guard: verify viewer access authorization
    await requireViewerAccess(
      session.user.id,
      workspaceId,
      viewerAccessId,
      repositories.viewerAccess,
    );

    const dashboardData = await getViewerDashboard(
      workspaceId,
      viewerAccessId,
      month,
      year,
      repositories,
    );

    const totalHours = AnalyticsService.formatDuration(
      dashboardData.metrics.totalMinutes,
    );
    const workingDays = dashboardData.metrics.workingDays;
    const totalEntries = dashboardData.metrics.totalEntries;
    const averageHours = dashboardData.metrics.averageMinutesPerDay
      ? AnalyticsService.formatDuration(
          Math.round(dashboardData.metrics.averageMinutesPerDay),
        )
      : "-";

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <PeriodSelector
            workspaceId={workspaceId}
            viewerAccessId={viewerAccessId}
          />
        </div>

        <AnomaliesAlert pendingCount={dashboardData.anomalies.pendingCount} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ViewerMetricCard
            label="Total Hours"
            value={totalHours}
            ariaLabel={`${totalHours} total hours tracked`}
          />
          <ViewerMetricCard
            label="Working Days"
            value={String(workingDays)}
            ariaLabel={`${workingDays} days worked`}
          />
          <ViewerMetricCard
            label="Activities"
            value={String(totalEntries)}
            ariaLabel={`${totalEntries} activities recorded`}
          />
          <ViewerMetricCard
            label="Daily Average"
            value={averageHours}
            secondaryValue="per day"
            ariaLabel={`${averageHours} daily average`}
          />
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-heading text-base leading-snug font-medium">
              Daily Activity
            </h2>
          </CardHeader>
          <CardContent>
            <SimpleDailyBars dailyData={dashboardData.dailyBreakdown} />
          </CardContent>
        </Card>

        {dashboardData.metrics.totalMinutes === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No time entries for this period
            </p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.constructor.name === "ViewerAccessNotFoundError" ||
        error.constructor.name === "ViewerUnauthorizedError")
    ) {
      return (
        <div className="text-center py-12">
          <p className="text-red-600 font-semibold">Access Denied</p>
          <p className="text-muted-foreground mt-2">
            {error.message}
          </p>
        </div>
      );
    }

    throw error;
  }
}
