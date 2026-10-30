// src/app/api/timesheet-viewer/anomalies/route.ts
import { createAnomalyReport } from "@/application/timesheet-viewer/create-anomaly-report";
import { InvalidViewerInputError, ViewerAccessNotFoundError } from "@/domain/viewer-errors";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { isNextRedirectError } from "@/lib/next-redirect-error";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const body = await request.json();

    const repositories = createRepositories();
    const report = await createAnomalyReport(
      context,
      body,
      repositories.viewerAccess,
      repositories.anomalyReports,
    );

    return Response.json({
      id: report.id,
      viewerAccessId: report.viewerAccessId,
      workDate: report.workDate.toISOString(),
      message: report.message,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    if (error instanceof ViewerAccessNotFoundError) {
      return Response.json({ error: "Viewer not found" }, { status: 404 });
    }
    if (error instanceof InvalidViewerInputError) {
      return Response.json(
        { error: `Invalid input: ${error.field}` },
        { status: 400 },
      );
    }
    console.error("Failed to create anomaly report:", error);
    return Response.json(
      { error: "Unable to create anomaly report" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const url = new URL(request.url);
    const viewerAccessId = url.searchParams.get("viewerAccessId");
    const statusParam = url.searchParams.get("status");

    const repositories = createRepositories();

    if (viewerAccessId) {
      const reports = await repositories.anomalyReports.listForViewerAccess(
        context.workspaceId,
        viewerAccessId,
        statusParam as "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | undefined,
      );

      return Response.json({
        reports: reports.map((r) => ({
          id: r.id,
          viewerAccessId: r.viewerAccessId,
          timeEntryId: r.timeEntryId,
          workDate: r.workDate.toISOString(),
          message: r.message,
          status: r.status,
          freelanceNotes: r.freelanceNotes,
          createdAt: r.createdAt.toISOString(),
          acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
          resolvedAt: r.resolvedAt?.toISOString() ?? null,
        })),
      });
    }

    const allReports = await repositories.anomalyReports.listForWorkspace(
      context.workspaceId,
      statusParam as "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | undefined,
    );

    return Response.json({
      reports: allReports.map((r) => ({
        id: r.id,
        viewerAccessId: r.viewerAccessId,
        timeEntryId: r.timeEntryId,
        workDate: r.workDate.toISOString(),
        message: r.message,
        status: r.status,
        freelanceNotes: r.freelanceNotes,
        createdAt: r.createdAt.toISOString(),
        acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Failed to list anomaly reports:", error);
    return Response.json(
      { error: "Unable to load anomaly reports" },
      { status: 500 },
    );
  }
}
