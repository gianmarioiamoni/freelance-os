// src/app/api/timesheet-viewer/invite/route.ts
import { inviteViewer } from "@/application/timesheet-viewer/invite-viewer";
import { InvalidViewerInputError } from "@/domain/viewer-errors";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { isNextRedirectError } from "@/lib/next-redirect-error";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const body = await request.json();

    const repositories = createRepositories();
    const result = await inviteViewer(context, body, repositories);

    // NOTE: plainToken is NOT returned in API response for security.
    // It must be sent via email service integration (see Application Service TODO).
    return Response.json({
      viewerAccess: {
        id: result.viewerAccess.id,
        email: result.viewerAccess.email,
        status: result.viewerAccess.status,
        createdAt: result.viewerAccess.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    if (error instanceof InvalidViewerInputError) {
      return Response.json(
        { error: `Invalid input: ${error.field}` },
        { status: 400 },
      );
    }
    console.error("Failed to invite viewer:", error);
    return Response.json(
      { error: "Unable to invite viewer" },
      { status: 500 },
    );
  }
}
