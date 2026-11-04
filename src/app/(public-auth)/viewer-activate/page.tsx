// src/app/(public-auth)/viewer-activate/page.tsx
import { ViewerActivateForm } from "@/features/timesheet-viewer/ViewerActivateForm";
import { prisma } from "@/infrastructure/prisma/client";
import { createHash } from "crypto";
import type { JSX } from "react";

type ViewerActivatePageProps = {
  searchParams: Promise<{
    token?: string;
    email?: string;
    error?: string;
  }>;
};

export default async function ViewerActivatePage({
  searchParams,
}: ViewerActivatePageProps): Promise<JSX.Element> {
  const params = await searchParams;
  let inviteEmail: string | undefined = params.email;

  // If token provided, fetch the associated email
  if (params.token && !inviteEmail) {
    try {
      const tokenHash = createHash("sha256")
        .update(params.token)
        .digest("hex");

      const inviteToken = await prisma.viewerInviteToken.findUnique({
        where: { tokenHash },
        include: {
          viewerAccess: true,
        },
      });

      if (inviteToken?.viewerAccess) {
        inviteEmail = inviteToken.viewerAccess.email;
      }
    } catch (error) {
      console.error("Failed to fetch invite email:", error);
    }
  }

  return (
    <ViewerActivateForm
      token={params.token}
      email={inviteEmail}
      error={params.error}
    />
  );
}
