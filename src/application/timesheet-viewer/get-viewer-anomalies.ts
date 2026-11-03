// src/application/timesheet-viewer/get-viewer-anomalies.ts
import type {
  AnomalyReportRepository,
  ContractRepository,
  TimeEntryRepository,
  ViewerAccessRepository,
} from "@/domain/repositories";
import { ViewerAccessNotFoundError } from "@/domain/viewer-errors";

export type ViewerAnomalyDisplay = {
  id: string;
  workDate: Date;
  engagement: string;
  message: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  freelanceNotes: string | null;
  createdAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
};

type ViewerAnomaliesRepositories = {
  viewerAccess: ViewerAccessRepository;
  anomalyReports: AnomalyReportRepository;
  timeEntries: TimeEntryRepository;
  contracts: ContractRepository;
};

export async function getViewerAnomalies(
  workspaceId: string,
  viewerAccessId: string,
  repositories: ViewerAnomaliesRepositories,
): Promise<ViewerAnomalyDisplay[]> {
  // 1. Verify viewer is ACTIVE
  const viewer = await repositories.viewerAccess.getById(
    workspaceId,
    viewerAccessId,
  );
  if (!viewer || viewer.status !== "ACTIVE") {
    throw new ViewerAccessNotFoundError();
  }

  // 2. Get all anomaly reports for this viewer
  const reports = await repositories.anomalyReports.listForViewerAccess(
    workspaceId,
    viewerAccessId,
  );

  // 3. Enrich with engagement names
  const enrichedReports: ViewerAnomalyDisplay[] = [];

  for (const report of reports) {
    let engagement = "Unknown";

    if (report.timeEntryId) {
      try {
        const timeEntry = await repositories.timeEntries.getTimeEntry(
          workspaceId,
          report.timeEntryId,
        );

        if (timeEntry) {
          const contract = await repositories.contracts.getContract(
            workspaceId,
            timeEntry.contractId,
          );
          engagement = contract?.reference || "Unknown";
        }
      } catch (error) {
        console.error(
          `Failed to load engagement for anomaly ${report.id}:`,
          error,
        );
      }
    }

    enrichedReports.push({
      id: report.id,
      workDate: report.workDate,
      engagement,
      message: report.message,
      status: report.status,
      freelanceNotes: report.freelanceNotes,
      createdAt: report.createdAt,
      acknowledgedAt: report.acknowledgedAt,
      resolvedAt: report.resolvedAt,
    });
  }

  // 4. Sort by creation date (most recent first)
  return enrichedReports.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
