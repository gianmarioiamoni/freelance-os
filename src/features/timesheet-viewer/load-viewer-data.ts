// src/features/timesheet-viewer/load-viewer-data.ts
import "server-only";

import { listViewerAccess } from "@/application/timesheet-viewer/list-viewer-access";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";

export type ViewerAccessData = {
  id: string;
  email: string;
  status: string;
  userId: string | null;
  createdAt: Date;
  revokedAt: Date | null;
};

export async function loadViewerAccess(
  context: WorkspaceContext,
): Promise<ViewerAccessData[]> {
  const repositories = createRepositories();
  return listViewerAccess(context, repositories.viewerAccess);
}

export async function loadAuthorizedContracts(
  context: WorkspaceContext,
  viewerAccessId: string,
) {
  const repositories = createRepositories();
  return repositories.viewerAccess.listAuthorizedContracts(
    context.workspaceId,
    viewerAccessId,
  );
}

export async function loadAnomalyReports(
  context: WorkspaceContext,
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED",
) {
  const repositories = createRepositories();
  return repositories.anomalyReports.listForWorkspace(context.workspaceId, status);
}
