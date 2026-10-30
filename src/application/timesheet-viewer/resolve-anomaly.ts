// src/application/timesheet-viewer/resolve-anomaly.ts
import {
  parseUpdateAnomalyInput,
  type UpdateAnomalyInput,
} from "@/application/timesheet-viewer/viewer-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { AnomalyReportRecord } from "@/domain/persistence-types";
import type { AnomalyReportRepository } from "@/domain/repositories";
import { AnomalyReportNotFoundError } from "@/domain/viewer-errors";

export async function resolveAnomaly(
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

  if (report.status === "RESOLVED") {
    throw new Error("Anomaly report already resolved");
  }

  return anomalyReports.update(context.workspaceId, reportId, {
    status: "RESOLVED",
    freelanceNotes: validated.freelanceNotes,
    resolvedAt: new Date(),
  });
}
