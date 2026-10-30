// src/app/api/timesheet-viewer/access/[viewerAccessId]/time-entries/route.ts
import { getAuthorizedTimeEntries } from "@/application/timesheet-viewer/get-authorized-time-entries";
import { ViewerAccessNotFoundError, ViewerUnauthorizedError } from "@/domain/viewer-errors";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { isNextRedirectError } from "@/lib/next-redirect-error";
import type { NextRequest } from "next/server";

type Params = Promise<{ viewerAccessId: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params },
): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const { viewerAccessId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const contractIds = searchParams.get("contractIds")?.split(",").filter(Boolean);

    if (!startDate || !endDate) {
      return Response.json(
        { error: "startDate and endDate are required" },
        { status: 400 },
      );
    }

    const repositories = createRepositories();
    const entries = await getAuthorizedTimeEntries(
      context,
      viewerAccessId,
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        contractIds,
      },
      repositories.viewerAccess,
      repositories.timeEntries,
    );

    return Response.json({
      timeEntries: entries.map((entry) => ({
        id: entry.id,
        workDate: entry.workDate.toISOString().split("T")[0],
        durationMinutes: entry.durationMinutes,
        description: entry.description,
        contractId: entry.contractId,
        clientId: entry.clientId,
        billable: entry.billable,
      })),
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    if (error instanceof ViewerAccessNotFoundError) {
      return Response.json(
        { error: "Viewer access not found or inactive" },
        { status: 404 },
      );
    }
    if (error instanceof ViewerUnauthorizedError) {
      return Response.json(
        { error: "Unauthorized access to requested contracts" },
        { status: 403 },
      );
    }
    console.error("Failed to fetch authorized time entries:", error);
    return Response.json(
      { error: "Unable to fetch time entries" },
      { status: 500 },
    );
  }
}
