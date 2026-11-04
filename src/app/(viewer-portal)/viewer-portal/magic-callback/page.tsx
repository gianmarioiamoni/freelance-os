// src/app/(viewer-portal)/viewer-portal/magic-callback/page.tsx
import { redirect } from "next/navigation";
import type { JSX } from "react";

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
import { ErrorState } from "@/components/states/ErrorState";

type MagicCallbackPageProps = {
  searchParams: Promise<{
    ctx?: string;
  }>;
};

export default async function MagicCallbackPage({
  searchParams,
}: MagicCallbackPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const contextId = params.ctx;

  if (!contextId) {
    return <ErrorState message="Invalid activation link" />;
  }

  try {
    // Verify session
    const session = await auth.api.getSession();

    if (!session?.user?.id || !session.user.email) {
      return <ErrorState message="Authentication required" />;
    }

    // Retrieve temporary context
    const context = await prisma.verification.findFirst({
      where: {
        identifier: `viewer-context:${contextId}`,
      },
    });

    if (!context) {
      return <ErrorState message="Invalid or expired activation link" />;
    }

    const now = new Date();
    if (context.expiresAt < now) {
      await prisma.verification.delete({ where: { id: context.id } });
      return <ErrorState message="This activation link has expired" />;
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
      return <ErrorState message="Invalid activation token" />;
    }

    if (error instanceof ViewerTokenExpiredError) {
      return <ErrorState message="This invitation has expired" />;
    }

    if (error instanceof ViewerTokenAlreadyAcceptedError) {
      return <ErrorState message="This invitation has already been used" />;
    }

    if (error instanceof ViewerAccessNotFoundError) {
      return <ErrorState message="Viewer access not found" />;
    }

    if (error instanceof InvalidViewerStatusTransitionError) {
      return (
        <ErrorState message="Viewer access is not in a valid state for activation" />
      );
    }

    console.error("Failed to complete viewer activation:", error);
    return <ErrorState message="Unable to activate viewer access" />;
  }
}
