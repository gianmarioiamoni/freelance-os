import { deleteViewer } from "@/application/timesheet-viewer/delete-viewer";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ viewerAccessId: string }> },
): Promise<Response> {
  const { viewerAccessId } = await context.params;
  const workspaceContext = await getCurrentWorkspaceContext();
  const repositories = createRepositories();

  try {
    await deleteViewer(workspaceContext, viewerAccessId, repositories);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete viewer:", error);
    return NextResponse.json(
      { error: "Failed to delete viewer access" },
      { status: 500 },
    );
  }
}
