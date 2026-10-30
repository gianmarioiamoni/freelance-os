// src/application/timesheet-viewer/create-anomaly-report.ts
import {
  parseCreateAnomalyInput,
  type CreateAnomalyInput,
} from "@/application/timesheet-viewer/viewer-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { AnomalyReportRecord } from "@/domain/persistence-types";
import type {
  AnomalyReportRepository,
  ViewerAccessRepository,
} from "@/domain/repositories";
import { ViewerAccessNotFoundError } from "@/domain/viewer-errors";

export async function createAnomalyReport(
  context: WorkspaceContext,
  input: CreateAnomalyInput,
  viewerAccess: ViewerAccessRepository,
  anomalyReports: AnomalyReportRepository,
): Promise<AnomalyReportRecord> {
  const validated = parseCreateAnomalyInput(input);

  // Verify viewer access exists and belongs to workspace
  const viewer = await viewerAccess.getById(
    context.workspaceId,
    validated.viewerAccessId,
  );
  if (!viewer) {
    throw new ViewerAccessNotFoundError();
  }

  // Verify viewer is active (can report anomalies)
  if (viewer.status !== "ACTIVE") {
    throw new ViewerAccessNotFoundError();
  }

  return anomalyReports.create(context.workspaceId, {
    viewerAccessId: validated.viewerAccessId,
    timeEntryId: validated.timeEntryId,
    workDate: validated.workDate,
    message: validated.message,
    status: "OPEN",
  });
}
