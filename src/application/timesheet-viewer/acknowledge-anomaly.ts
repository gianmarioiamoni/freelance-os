// src/application/timesheet-viewer/acknowledge-anomaly.ts
import {
  parseUpdateAnomalyInput,
  type UpdateAnomalyInput,
} from "@/application/timesheet-viewer/viewer-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { AnomalyReportRecord } from "@/domain/persistence-types";
import type { AnomalyReportRepository } from "@/domain/repositories";
import { AnomalyReportNotFoundError } from "@/domain/viewer-errors";

export async function acknowledgeAnomaly(
  context: WorkspaceContext,
  reportId: string,
  input: UpdateAnomalyInput,
  anomalyReports: AnomalyReportRepository,
): Promise<AnomalyReportRecord> {
  const validated = parseUpdateAnomalyInput(input);

  const report = await anomalyReports.getById(context.workspaceId, reportId);
  if (!report) {
    throw new AnomalyReportNotFoundError();
  }

  if (report.status !== "OPEN") {
    throw new Error("Anomaly report must be OPEN to acknowledge");
  }

  return anomalyReports.update(context.workspaceId, reportId, {
    status: "ACKNOWLEDGED",
    freelanceNotes: validated.freelanceNotes,
    acknowledgedAt: new Date(),
  });
}
