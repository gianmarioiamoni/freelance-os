// src/application/timesheet-viewer/viewer-access-guard.ts
import type { ViewerAccessRepository } from "@/domain/repositories";
import { ViewerAccessNotFoundError, ViewerUnauthorizedError } from "@/domain/viewer-errors";

export async function requireViewerAccess(
  sessionUserId: string,
  workspaceId: string,
  viewerAccessId: string,
  viewerAccessRepo: ViewerAccessRepository,
  sessionEmail?: string,
): Promise<void> {
  const viewerAccess = await viewerAccessRepo.getById(
    workspaceId,
    viewerAccessId,
  );

  if (!viewerAccess || viewerAccess.status !== "ACTIVE") {
    throw new ViewerAccessNotFoundError();
  }

  // Check userId match first
  if (viewerAccess.userId === sessionUserId) {
    return;
  }

  // Fallback: check if email matches (for userId mismatch scenarios)
  if (sessionEmail && viewerAccess.email.toLowerCase() === sessionEmail.toLowerCase()) {
    // Email matches but userId doesn't - allow access
    // Note: In a future enhancement, we could update the userId in the record here
    return;
  }

  throw new ViewerUnauthorizedError();
}
