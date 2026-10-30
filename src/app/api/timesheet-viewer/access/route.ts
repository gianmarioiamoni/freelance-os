// src/app/api/timesheet-viewer/access/route.ts
import { listViewerAccess } from "@/application/timesheet-viewer/list-viewer-access";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { isNextRedirectError } from "@/lib/next-redirect-error";

export async function GET(): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const repositories = createRepositories();
    
    const viewers = await listViewerAccess(context, repositories.viewerAccess);

    return Response.json({
      viewers: viewers.map((v) => ({
        id: v.id,
        email: v.email,
        status: v.status,
        userId: v.userId,
        createdAt: v.createdAt.toISOString(),
        revokedAt: v.revokedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Failed to list viewer access:", error);
    return Response.json(
      { error: "Unable to load viewer access" },
      { status: 500 },
    );
  }
}
