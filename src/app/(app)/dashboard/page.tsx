// src/app/(app)/dashboard/page.tsx
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { listClients } from "@/application/clients/list-clients";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ErrorState } from "@/components/states/ErrorState";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { isNextRedirectError } from "@/lib/next-redirect-error";
import type { JSX } from "react";

export default async function DashboardPage(): Promise<JSX.Element> {
  const context = await getCurrentWorkspaceContext();

  try {
    const repositories = createRepositories();
    const analyticsService = new AnalyticsService(
      repositories.analytics,
      repositories.members
    );

    const [analytics, activeClients] = await Promise.all([
      analyticsService.getCurrentMonthAnalytics(context),
      listClients(context, repositories.clients, "ACTIVE"),
    ]);

    return (
      <Dashboard
        analytics={analytics}
        hasActiveClients={activeClients.length > 0}
      />
    );
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Failed to load dashboard analytics:", error);
    return <ErrorState message="Unable to load dashboard. Please try refreshing the page." />;
  }
}
