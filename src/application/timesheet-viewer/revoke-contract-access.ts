// src/application/timesheet-viewer/revoke-contract-access.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { ViewerAccessRepository } from "@/domain/repositories";
import { ViewerAccessNotFoundError } from "@/domain/viewer-errors";

export async function revokeContractAccess(
  context: WorkspaceContext,
  viewerAccessId: string,
  contractId: string,
  viewerAccess: ViewerAccessRepository,
): Promise<void> {
  const viewer = await viewerAccess.getById(
    context.workspaceId,
    viewerAccessId,
  );
  if (!viewer) {
    throw new ViewerAccessNotFoundError();
  }

  // Can revoke for PENDING or ACTIVE status (not REVOKED)
  if (viewer.status === "REVOKED") {
    throw new ViewerAccessNotFoundError();
  }

  await viewerAccess.revokeContractAuthorization(
    context.workspaceId,
    viewerAccessId,
    contractId,
  );
}
