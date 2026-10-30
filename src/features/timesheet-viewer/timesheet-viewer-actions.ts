// src/features/timesheet-viewer/timesheet-viewer-actions.ts
"use server";

import { inviteViewer } from "@/application/timesheet-viewer/invite-viewer";
import { revokeViewer } from "@/application/timesheet-viewer/revoke-viewer";
import { deleteViewer } from "@/application/timesheet-viewer/delete-viewer";
import { authorizeContract } from "@/application/timesheet-viewer/authorize-contract";
import { revokeContractAccess } from "@/application/timesheet-viewer/revoke-contract-access";
import { createAnomalyReport } from "@/application/timesheet-viewer/create-anomaly-report";
import { acknowledgeAnomaly } from "@/application/timesheet-viewer/acknowledge-anomaly";
import { resolveAnomaly } from "@/application/timesheet-viewer/resolve-anomaly";
import { InvalidViewerInputError } from "@/domain/viewer-errors";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { revalidatePath } from "next/cache";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

export async function inviteViewerAction(
  email: string,
  tokenExpiryHours?: number,
): Promise<ActionResult<{ viewerAccessId: string }>> {
  try {
    const context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();

    const result = await inviteViewer(
      context,
      { email, tokenExpiryHours },
      repositories,
    );

    // NOTE: plainToken is NOT returned to client for security.
    // Email integration will handle token delivery (see Application Service TODO).

    revalidatePath("/timesheet-viewer");
    
    return {
      success: true,
      data: {
        viewerAccessId: result.viewerAccess.id,
      },
    };
  } catch (error) {
    if (error instanceof InvalidViewerInputError) {
      return {
        success: false,
        error: `Invalid ${error.field}`,
        field: error.field,
      };
    }
    console.error("Failed to invite viewer:", error);
    return { success: false, error: "Unable to invite viewer" };
  }
}

export async function revokeViewerAction(
  viewerAccessId: string,
): Promise<ActionResult> {
  try {
    const context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();

    await revokeViewer(context, viewerAccessId, repositories);

    revalidatePath("/timesheet-viewer");
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to revoke viewer:", error);
    return { success: false, error: "Unable to revoke viewer" };
  }
}

export async function deleteViewerAction(
  viewerAccessId: string,
): Promise<ActionResult> {
  try {
    const context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();

    await deleteViewer(context, viewerAccessId, repositories);

    revalidatePath("/timesheet-viewer");
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete viewer:", error);
    return { success: false, error: "Unable to delete viewer" };
  }
}

export async function authorizeContractAction(
  viewerAccessId: string,
  contractId: string,
  displayLabel?: string,
): Promise<ActionResult> {
  try {
    const context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();

    await authorizeContract(
      context,
      { viewerAccessId, contractId, displayLabel },
      repositories.viewerAccess,
      repositories.contracts,
    );

    revalidatePath("/timesheet-viewer");
    
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof InvalidViewerInputError) {
      return {
        success: false,
        error: `Invalid ${error.field}`,
        field: error.field,
      };
    }
    console.error("Failed to authorize contract:", error);
    return { success: false, error: "Unable to authorize contract" };
  }
}

export async function revokeContractAccessAction(
  viewerAccessId: string,
  contractId: string,
): Promise<ActionResult> {
  try {
    const context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();

    await revokeContractAccess(
      context,
      viewerAccessId,
      contractId,
      repositories.viewerAccess,
    );

    revalidatePath("/timesheet-viewer");
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to revoke contract access:", error);
    return { success: false, error: "Unable to revoke contract access" };
  }
}

export async function createAnomalyReportAction(
  viewerAccessId: string,
  workDate: Date,
  message: string,
  timeEntryId?: string,
): Promise<ActionResult> {
  try {
    const context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();

    await createAnomalyReport(
      context,
      { viewerAccessId, workDate, message, timeEntryId },
      repositories.viewerAccess,
      repositories.anomalyReports,
    );

    revalidatePath("/timesheet-viewer");
    
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof InvalidViewerInputError) {
      return {
        success: false,
        error: `Invalid ${error.field}`,
        field: error.field,
      };
    }
    console.error("Failed to create anomaly report:", error);
    return { success: false, error: "Unable to create anomaly report" };
  }
}

export async function acknowledgeAnomalyAction(
  reportId: string,
  freelanceNotes?: string,
): Promise<ActionResult> {
  try {
    const context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();

    await acknowledgeAnomaly(
      context,
      reportId,
      { freelanceNotes },
      repositories.anomalyReports,
    );

    revalidatePath("/timesheet-viewer");
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to acknowledge anomaly:", error);
    return { success: false, error: "Unable to acknowledge anomaly" };
  }
}

export async function resolveAnomalyAction(
  reportId: string,
  freelanceNotes?: string,
): Promise<ActionResult> {
  try {
    const context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();

    await resolveAnomaly(
      context,
      reportId,
      { freelanceNotes },
      repositories.anomalyReports,
    );

    revalidatePath("/timesheet-viewer");
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to resolve anomaly:", error);
    return { success: false, error: "Unable to resolve anomaly" };
  }
}
