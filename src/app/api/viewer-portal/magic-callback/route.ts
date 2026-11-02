// src/app/api/viewer-portal/magic-callback/route.ts
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/prisma/client";
import { activateViewer } from "@/application/timesheet-viewer/activate-viewer";
import { runInTransaction } from "@/infrastructure/persistence/create-repositories";
import {
  ViewerTokenNotFoundError,
  ViewerTokenExpiredError,
  ViewerTokenAlreadyAcceptedError,
  ViewerAccessNotFoundError,
  InvalidViewerStatusTransitionError,
} from "@/domain/viewer-errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const contextId = url.searchParams.get("ctx");

    if (!contextId) {
      return NextResponse.json(
        { error: "Invalid callback" },
        { status: 400 },
      );
    }

    // Verify session
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Retrieve temporary context
    const context = await prisma.verification.findFirst({
      where: {
        identifier: `viewer-context:${contextId}`,
      },
    });

    if (!context) {
      return NextResponse.json(
        { error: "Invalid or expired activation link" },
        { status: 400 },
      );
    }

    const now = new Date();
    if (context.expiresAt < now) {
      await prisma.verification.delete({ where: { id: context.id } });
      return NextResponse.json(
        { error: "This activation link has expired" },
        { status: 400 },
      );
    }

    const viewerInviteToken = context.value;

    // Activate viewer
    const result = await activateViewer(
      { plainToken: viewerInviteToken, userId: session.user.id },
      { runInTransaction },
    );

    // Cleanup temporary context
    await prisma.verification.delete({ where: { id: context.id } });

    // Redirect to viewer dashboard
    redirect(
      `/viewer-dashboard?workspaceId=${result.viewerAccess.workspaceId}&viewerAccessId=${result.viewerAccess.id}`,
    );
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

    console.error("Failed to complete viewer activation:", error);
    return NextResponse.json(
      { error: "Unable to activate viewer access" },
      { status: 500 },
    );
  }
}
