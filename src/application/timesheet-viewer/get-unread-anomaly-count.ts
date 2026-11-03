// src/application/timesheet-viewer/get-unread-anomaly-count.ts
import type { AnomalyReportRepository } from "@/domain/repositories";

type UnreadAnomalyCountRepositories = {
  anomalyReports: AnomalyReportRepository;
};

export async function getUnreadAnomalyCount(
  workspaceId: string,
  freelancerId: string,
  repositories: UnreadAnomalyCountRepositories,
): Promise<number> {
  const anomalies = await repositories.anomalyReports.listForWorkspace(
    workspaceId,
    "OPEN",
  );

  return anomalies.length;
}
