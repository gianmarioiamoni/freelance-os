// src/application/timesheet-viewer/list-viewer-access.ts
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { TimesheetViewerAccessRecord } from "@/domain/persistence-types";
import type { ViewerAccessRepository } from "@/domain/repositories";

export async function listViewerAccess(
  context: WorkspaceContext,
  viewerAccess: ViewerAccessRepository,
): Promise<TimesheetViewerAccessRecord[]> {
  return viewerAccess.listForWorkspace(context.workspaceId);
}
