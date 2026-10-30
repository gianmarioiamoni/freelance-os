// src/application/timesheet-viewer/revoke-viewer.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { TimesheetViewerAccessRecord } from "@/domain/persistence-types";
import type { PersistenceRepositories } from "@/domain/repositories";
import {
  InvalidViewerStatusTransitionError,
  ViewerAccessNotFoundError,
} from "@/domain/viewer-errors";

export async function revokeViewer(
  context: WorkspaceContext,
  viewerAccessId: string,
  repositories: PersistenceRepositories,
): Promise<TimesheetViewerAccessRecord> {
  const viewerAccess = await repositories.viewerAccess.getById(
    context.workspaceId,
    viewerAccessId,
  );

  if (!viewerAccess) {
    throw new ViewerAccessNotFoundError();
  }

  if (viewerAccess.status === "REVOKED") {
    throw new InvalidViewerStatusTransitionError(
      viewerAccess.status,
      "REVOKED",
    );
  }

  // Can only revoke ACTIVE viewers (who have userId set)
  // PENDING viewers should have their tokens invalidated and be left as-is or deleted
  if (viewerAccess.status === "PENDING") {
    throw new InvalidViewerStatusTransitionError(
      viewerAccess.status,
      "REVOKED",
    );
  }

  // Invalidate all pending tokens for this viewer access
  await repositories.viewerTokens.invalidateAllForViewerAccess(
    context.workspaceId,
    viewerAccessId,
  );

  return repositories.viewerAccess.revoke(context.workspaceId, viewerAccessId);
}
