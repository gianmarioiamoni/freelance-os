// src/app/api/viewer-portal/dashboard/[viewerAccessId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getViewerDashboard } from "@/application/timesheet-viewer/get-viewer-dashboard";
import { requireViewerAccess } from "@/application/timesheet-viewer/viewer-access-guard";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ viewerAccessId: string }> },
) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { viewerAccessId } = await context.params;
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId");
    const month = parseInt(url.searchParams.get("month") || "", 10);
    const year = parseInt(url.searchParams.get("year") || "", 10);

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspaceId", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }

    // Validate month and year
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json(
        { error: "Invalid month or year", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }

    const repositories = createRepositories();

    // Guard: verify viewer access authorization
    await requireViewerAccess(
      session.user.id,
      workspaceId,
      viewerAccessId,
      repositories.viewerAccess,
    );

    const dashboardData = await getViewerDashboard(
      workspaceId,
      viewerAccessId,
      month,
      year,
      repositories,
    );

    return NextResponse.json(dashboardData);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.constructor.name === "ViewerAccessNotFoundError" ||
        error.constructor.name === "ViewerUnauthorizedError")
    ) {
      return NextResponse.json(
        { error: error.message, code: error.constructor.name },
        { status: 403 },
      );
    }

    console.error("Viewer dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
