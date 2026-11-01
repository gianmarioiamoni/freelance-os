// src/app/api/viewer-portal/activate/route.ts
import { activateViewer } from "@/application/timesheet-viewer/activate-viewer";
import { auth } from "@/infrastructure/auth/auth";
import { runInTransaction } from "@/infrastructure/persistence/create-repositories";
import {
  InvalidViewerStatusTransitionError,
  ViewerAccessNotFoundError,
  ViewerTokenAlreadyAcceptedError,
  ViewerTokenExpiredError,
  ViewerTokenNotFoundError,
} from "@/domain/viewer-errors";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to activate viewer access" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid activation token" },
        { status: 400 },
      );
    }

    const result = await activateViewer(
      { plainToken: token, userId: session.user.id },
      { runInTransaction },
    );

    return NextResponse.json({
      success: true,
      viewerAccessId: result.viewerAccess.id,
    });
  } catch (error) {
    if (error instanceof ViewerTokenNotFoundError) {
      return NextResponse.json(
        { error: "Invalid activation token" },
        { status: 400 },
      );
    }

    if (error instanceof ViewerTokenExpiredError) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 },
      );
    }

    if (error instanceof ViewerTokenAlreadyAcceptedError) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 },
      );
    }

    if (error instanceof ViewerAccessNotFoundError) {
      return NextResponse.json(
        { error: "Viewer access not found" },
        { status: 404 },
      );
    }

    if (error instanceof InvalidViewerStatusTransitionError) {
      return NextResponse.json(
        { error: "Viewer access is not in a valid state for activation" },
        { status: 400 },
      );
    }

    console.error("Failed to activate viewer:", error);
    return NextResponse.json(
      { error: "Unable to activate viewer access" },
      { status: 500 },
    );
  }
}
