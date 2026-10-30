// src/application/timesheet-viewer/viewer-access-guard.ts
import type { ViewerAccessRepository } from "@/domain/repositories";
import { ViewerAccessNotFoundError, ViewerUnauthorizedError } from "@/domain/viewer-errors";

export async function requireViewerAccess(
  sessionUserId: string,
  workspaceId: string,
  viewerAccessId: string,
  viewerAccessRepo: ViewerAccessRepository,
): Promise<void> {
  const viewerAccess = await viewerAccessRepo.getById(
    workspaceId,
    viewerAccessId,
  );

  if (!viewerAccess || viewerAccess.status !== "ACTIVE") {
    throw new ViewerAccessNotFoundError();
  }

  if (viewerAccess.userId !== sessionUserId) {
    throw new ViewerUnauthorizedError();
  }
}
