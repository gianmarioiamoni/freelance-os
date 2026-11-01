// src/app/(app)/timesheet-viewer/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { ErrorState } from "@/components/states/ErrorState";
import {
  loadViewerAccess,
  loadAnomalyReports,
} from "@/features/timesheet-viewer/load-viewer-data";
import { TimesheetViewerPageClient } from "@/features/timesheet-viewer/TimesheetViewerPageClient";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import type { JSX } from "react";

export const dynamic = "force-dynamic";

export default async function TimesheetViewerPage(): Promise<JSX.Element> {
  let context, viewers, reports, contracts;

  try {
    context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();
    
    [viewers, reports, contracts] = await Promise.all([
      loadViewerAccess(context),
      loadAnomalyReports(context),
      repositories.contracts.listContracts(context.workspaceId),
    ]);
  } catch (error) {
    console.error("Failed to load timesheet viewer data:", error);
    return (
      <section className="max-w-6xl">
        <PageHeader
          title="Timesheet Viewer Management"
          description="Manage external viewer access to timesheets and contracts."
        />
        <PageContent>
          <ErrorState message="Unable to load viewer management data. Please try again later." />
        </PageContent>
      </section>
    );
  }

  const repositories = createRepositories();

  const contractsWithClients = await Promise.all(
    contracts.map(async (contract) => {
      const client = await repositories.clients.getClient(
        context.workspaceId,
        contract.clientId,
      );
      return {
        id: contract.id,
        reference: contract.reference,
        clientName: client?.companyName || "Unknown Client",
      };
    }),
  );

  const authorizedContractsMap: Record<string, Array<{
    contractId: string;
    displayLabel: string | null;
  }>> = {};

  for (const viewer of viewers) {
    const authorized = await repositories.viewerAccess.listAuthorizedContracts(
      context.workspaceId,
      viewer.id,
    );
    authorizedContractsMap[viewer.id] = authorized;
  }

  return (
    <section className="max-w-6xl">
      <PageHeader
        title="Timesheet Viewer Management"
        description="Manage external viewer access to timesheets and contracts."
      />
      <PageContent>
        <TimesheetViewerPageClient
          viewers={viewers}
          reports={reports}
          contracts={contractsWithClients}
          authorizedContractsMap={authorizedContractsMap}
        />
      </PageContent>
    </section>
  );
}
