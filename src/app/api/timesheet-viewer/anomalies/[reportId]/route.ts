// src/app/api/timesheet-viewer/anomalies/[reportId]/route.ts
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await getCurrentWorkspaceContext();
    const { reportId } = await params;
    const repositories = createRepositories();

    // Verify the anomaly exists and belongs to this workspace
    const anomaly = await repositories.anomalyReports.getById(
      context.workspaceId,
      reportId,
    );

    if (!anomaly) {
      return NextResponse.json(
        { error: "Anomaly report not found" },
        { status: 404 },
      );
    }

    // Only allow deletion of RESOLVED anomalies
    if (anomaly.status !== "RESOLVED") {
      return NextResponse.json(
        { error: "Only resolved anomalies can be deleted" },
        { status: 400 },
      );
    }

    // Delete the anomaly
    await repositories.anomalyReports.delete(context.workspaceId, reportId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting anomaly report:", error);
    return NextResponse.json(
      { error: "Failed to delete anomaly report" },
      { status: 500 },
    );
  }
}
