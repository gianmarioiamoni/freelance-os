// src/app/api/timesheet-viewer/access/[viewerAccessId]/revoke/route.ts
import { revokeViewer } from "@/application/timesheet-viewer/revoke-viewer";
import {
  InvalidViewerStatusTransitionError,
  ViewerAccessNotFoundError,
} from "@/domain/viewer-errors";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { isNextRedirectError } from "@/lib/next-redirect-error";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ viewerAccessId: string }> },
): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const { viewerAccessId } = await params;

    const repositories = createRepositories();
    const revoked = await revokeViewer(context, viewerAccessId, repositories);

    return Response.json({
      id: revoked.id,
      status: revoked.status,
      revokedAt: revoked.revokedAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    if (error instanceof ViewerAccessNotFoundError) {
      return Response.json({ error: "Viewer not found" }, { status: 404 });
    }
    if (error instanceof InvalidViewerStatusTransitionError) {
      return Response.json(
        { error: "Viewer already revoked" },
        { status: 400 },
      );
    }
    console.error("Failed to revoke viewer:", error);
    return Response.json(
      { error: "Unable to revoke viewer" },
      { status: 500 },
    );
  }
}
