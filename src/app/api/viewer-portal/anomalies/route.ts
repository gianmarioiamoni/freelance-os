// src/app/api/viewer-portal/anomalies/route.ts
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { reportTimeEntryAnomaly } from "@/application/timesheet-viewer/report-time-entry-anomaly";
import { requireViewerAccess } from "@/application/timesheet-viewer/viewer-access-guard";
import {
  ViewerAccessNotFoundError,
  ViewerUnauthorizedError,
} from "@/domain/viewer-errors";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, viewerAccessId, timeEntryId, message } = body;

    if (!workspaceId || !viewerAccessId || !timeEntryId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters" },
        { status: 400 },
      );
    }

    const repositories = createRepositories();

    // Verify viewer access authorization
    await requireViewerAccess(
      session.user.id,
      workspaceId,
      viewerAccessId,
      repositories.viewerAccess,
      session.user.email,
    );

    // Report the anomaly
    const anomalyReport = await reportTimeEntryAnomaly(
      { workspaceId, userId: session.user.id, role: "MEMBER", timezone: "UTC" },
      {
        viewerAccessId,
        timeEntryId,
        message: message.trim(),
      },
      {
        viewerAccess: repositories.viewerAccess,
        timeEntries: repositories.timeEntries,
        contracts: repositories.contracts,
        anomalyReports: repositories.anomalyReports,
        workspaceMembers: repositories.members,
        workspaces: repositories.workspaces,
      },
    );

    return NextResponse.json({ success: true, reportId: anomalyReport.id });
  } catch (error) {
    if (
      error instanceof ViewerAccessNotFoundError ||
      error instanceof ViewerUnauthorizedError
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Failed to report anomaly:", error);
    return NextResponse.json(
      { error: "Unable to report anomaly" },
      { status: 500 },
    );
  }
}
