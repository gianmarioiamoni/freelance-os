// src/application/timesheet-viewer/report-time-entry-anomaly.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { AnomalyReportRecord } from "@/domain/persistence-types";
import type {
  AnomalyReportRepository,
  ContractRepository,
  TimeEntryRepository,
  ViewerAccessRepository,
  WorkspaceMemberRepository,
  WorkspaceRepository,
} from "@/domain/repositories";
import {
  ViewerAccessNotFoundError,
  ViewerUnauthorizedError,
} from "@/domain/viewer-errors";
import { deliverAnomalyNotificationEmail } from "@/infrastructure/email/resend-anomaly-notification";
import { prisma } from "@/infrastructure/prisma/client";

export type ReportTimeEntryAnomalyInput = {
  viewerAccessId: string;
  timeEntryId: string;
  message: string;
};

type ReportAnomalyRepositories = {
  viewerAccess: ViewerAccessRepository;
  timeEntries: TimeEntryRepository;
  contracts: ContractRepository;
  anomalyReports: AnomalyReportRepository;
  workspaceMembers: WorkspaceMemberRepository;
  workspaces: WorkspaceRepository;
};

export async function reportTimeEntryAnomaly(
  context: WorkspaceContext,
  input: ReportTimeEntryAnomalyInput,
  repositories: ReportAnomalyRepositories,
): Promise<AnomalyReportRecord> {
  // 1. Verify viewer access exists and is ACTIVE
  const viewer = await repositories.viewerAccess.getById(
    context.workspaceId,
    input.viewerAccessId,
  );
  if (!viewer || viewer.status !== "ACTIVE") {
    throw new ViewerAccessNotFoundError();
  }

  // 2. Get time entry and verify it belongs to workspace
  const timeEntry = await repositories.timeEntries.getTimeEntry(
    context.workspaceId,
    input.timeEntryId,
  );
  if (!timeEntry) {
    throw new Error("Time entry not found");
  }

  // 3. Verify viewer has access to this contract
  const authorizedContracts =
    await repositories.viewerAccess.listAuthorizedContracts(
      context.workspaceId,
      input.viewerAccessId,
    );

  const hasAccess = authorizedContracts.some(
    (ac) => ac.contractId === timeEntry.contractId,
  );

  if (!hasAccess) {
    throw new ViewerUnauthorizedError();
  }

  // 4. Get contract for engagement name
  const contract = await repositories.contracts.getContract(
    context.workspaceId,
    timeEntry.contractId,
  );
  const engagementName = contract?.reference || "Unknown";

  // 5. Persist anomaly report BEFORE sending email
  const anomalyReport = await repositories.anomalyReports.create(
    context.workspaceId,
    {
      viewerAccessId: input.viewerAccessId,
      timeEntryId: input.timeEntryId,
      workDate: timeEntry.workDate,
      message: input.message,
      status: "OPEN",
    },
  );

  // 6. Get workspace owner
  const workspaceMembers =
    await repositories.workspaceMembers.listMembers(context.workspaceId);
  const ownerMember = workspaceMembers.find((m) => m.role === "OWNER");

  if (!ownerMember) {
    console.warn(
      `No owner found for workspace ${context.workspaceId}. Anomaly report ${anomalyReport.id} persisted but email not sent.`,
    );
    return anomalyReport;
  }

  // 7. Get owner email from Better Auth User table
  const ownerUser = await prisma.user.findUnique({
    where: { id: ownerMember.userId },
    select: { email: true },
  });

  if (!ownerUser) {
    console.warn(
      `Owner user ${ownerMember.userId} not found. Anomaly report ${anomalyReport.id} persisted but email not sent.`,
    );
    return anomalyReport;
  }

  // 8. Get workspace name
  const workspace = await repositories.workspaces.getWorkspaceById(
    context.workspaceId,
  );
  const workspaceName = workspace?.name || "FreelanceOS Workspace";

  // 9. Send email notification (non-blocking failure)
  try {
    await deliverAnomalyNotificationEmail({
      freelancerEmail: ownerUser.email,
      workspaceName,
      viewerEmail: viewer.email,
      workDate: timeEntry.workDate,
      engagement: engagementName,
      timeEntryDescription: timeEntry.description,
      anomalyMessage: input.message,
    });
  } catch (error) {
    console.error(
      `Failed to send anomaly notification email for report ${anomalyReport.id}:`,
      error,
    );
    // Report already persisted, so we don't throw
  }

  return anomalyReport;
}
