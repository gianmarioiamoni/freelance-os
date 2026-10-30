// src/app/api/timesheet-viewer/anomalies/[reportId]/acknowledge/route.ts
import { acknowledgeAnomaly } from "@/application/timesheet-viewer/acknowledge-anomaly";
import { AnomalyReportNotFoundError } from "@/domain/viewer-errors";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { isNextRedirectError } from "@/lib/next-redirect-error";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const { reportId } = await params;
    const body = await request.json();

    const repositories = createRepositories();
    const report = await acknowledgeAnomaly(
      context,
      reportId,
      body,
      repositories.anomalyReports,
    );

    return Response.json({
      id: report.id,
      status: report.status,
      freelanceNotes: report.freelanceNotes,
      acknowledgedAt: report.acknowledgedAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    if (error instanceof AnomalyReportNotFoundError) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes("must be OPEN")) {
      return Response.json(
        { error: "Report must be OPEN to acknowledge" },
        { status: 400 },
      );
    }
    console.error("Failed to acknowledge anomaly:", error);
    return Response.json(
      { error: "Unable to acknowledge anomaly" },
      { status: 500 },
    );
  }
}
