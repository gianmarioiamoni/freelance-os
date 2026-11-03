// src/application/timesheet-viewer/acknowledge-anomaly.ts
import {
  parseUpdateAnomalyInput,
  type UpdateAnomalyInput,
} from "@/application/timesheet-viewer/viewer-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { AnomalyReportRecord } from "@/domain/persistence-types";
import type {
  AnomalyReportRepository,
  ContractRepository,
  TimeEntryRepository,
  ViewerAccessRepository,
  WorkspaceRepository,
} from "@/domain/repositories";
import { AnomalyReportNotFoundError } from "@/domain/viewer-errors";
import { deliverAnomalyStatusNotificationEmail } from "@/infrastructure/email/resend-anomaly-status-notification";

type AcknowledgeAnomalyRepositories = {
  anomalyReports: AnomalyReportRepository;
  viewerAccess: ViewerAccessRepository;
  timeEntries: TimeEntryRepository;
  contracts: ContractRepository;
  workspaces: WorkspaceRepository;
};

export async function acknowledgeAnomaly(
  context: WorkspaceContext,
  reportId: string,
  input: UpdateAnomalyInput,
  repositories: AcknowledgeAnomalyRepositories,
): Promise<AnomalyReportRecord> {
  const validated = parseUpdateAnomalyInput(input);

  const report = await repositories.anomalyReports.getById(
    context.workspaceId,
    reportId,
  );
  if (!report) {
    throw new AnomalyReportNotFoundError();
  }

  if (report.status !== "OPEN") {
    throw new Error("Anomaly report must be OPEN to acknowledge");
  }

  // Update status
  const updatedReport = await repositories.anomalyReports.update(
    context.workspaceId,
    reportId,
    {
      status: "ACKNOWLEDGED",
      freelanceNotes: validated.freelanceNotes,
      acknowledgedAt: new Date(),
    },
  );

  // Send email notification to viewer (non-blocking)
  try {
    const viewer = await repositories.viewerAccess.getById(
      context.workspaceId,
      report.viewerAccessId,
    );

    if (viewer) {
      const workspace = await repositories.workspaces.getWorkspaceById(
        context.workspaceId,
      );

      let engagement = "Unknown";
      if (report.timeEntryId) {
        const timeEntry = await repositories.timeEntries.getTimeEntry(
          context.workspaceId,
          report.timeEntryId,
        );
        if (timeEntry) {
          const contract = await repositories.contracts.getContract(
            context.workspaceId,
            timeEntry.contractId,
          );
          engagement = contract?.reference || "Unknown";
        }
      }

      await deliverAnomalyStatusNotificationEmail({
        viewerEmail: viewer.email,
        workspaceName: workspace?.name || "FreelanceOS Workspace",
        workDate: report.workDate,
        engagement,
        anomalyMessage: report.message,
        newStatus: "ACKNOWLEDGED",
        freelanceNotes: validated.freelanceNotes,
      });
    }
  } catch (error) {
    console.error(
      `Failed to send anomaly acknowledgment email for report ${reportId}:`,
      error,
    );
    // Non-blocking: report already updated
  }

  return updatedReport;
}
