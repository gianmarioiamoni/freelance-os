import "server-only";

import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { ViewerAccessRepository } from "@/domain/repositories";

export async function deleteViewer(
  context: WorkspaceContext,
  viewerAccessId: string,
  repositories: { viewerAccess: ViewerAccessRepository },
): Promise<void> {
  const viewer = await repositories.viewerAccess.getById(
    context.workspaceId,
    viewerAccessId,
  );

  if (!viewer) {
    throw new Error("Viewer access not found");
  }

  await repositories.viewerAccess.delete(context.workspaceId, viewerAccessId);
}
