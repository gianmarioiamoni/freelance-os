// src/app/api/timesheet-viewer/access/[viewerAccessId]/contracts/[contractId]/route.ts
import { revokeContractAccess } from "@/application/timesheet-viewer/revoke-contract-access";
import { ViewerAccessNotFoundError } from "@/domain/viewer-errors";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { isNextRedirectError } from "@/lib/next-redirect-error";

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ viewerAccessId: string; contractId: string }>;
  },
): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const { viewerAccessId, contractId } = await params;

    const repositories = createRepositories();
    await revokeContractAccess(
      context,
      viewerAccessId,
      contractId,
      repositories.viewerAccess,
    );

    return Response.json({ success: true });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    if (error instanceof ViewerAccessNotFoundError) {
      return Response.json({ error: "Viewer not found" }, { status: 404 });
    }
    console.error("Failed to revoke contract access:", error);
    return Response.json(
      { error: "Unable to revoke contract access" },
      { status: 500 },
    );
  }
}
