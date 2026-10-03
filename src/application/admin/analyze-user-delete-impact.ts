// src/application/admin/analyze-user-delete-impact.ts
import "server-only";

import { prisma } from "@/infrastructure/prisma/client";

import { requireAdminAuthorization } from "./admin-authorization";
import { AdminSelfProtectionError, UserNotFoundError } from "./user-lifecycle-errors";

export type WorkspaceImpact = {
  workspaceId: string;
  workspaceName: string;
  isSoleOwner: boolean;
  willBeDeleted: boolean;
};

export type DeleteImpactAnalysis = {
  targetUserId: string;
  targetUserEmail: string;
  workspaces: WorkspaceImpact[];
  canDelete: boolean;
  reason?: string;
};

export async function analyzeUserDeleteImpact(
  targetUserId: string,
): Promise<DeleteImpactAnalysis> {
  const admin = await requireAdminAuthorization();

  if (admin.userId === targetUserId) {
    throw new AdminSelfProtectionError("delete");
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, deletedAt: true },
  });

  if (!user) {
    throw new UserNotFoundError(targetUserId);
  }

  const ownedWorkspaces = await prisma.workspaceMember.findMany({
    where: {
      userId: targetUserId,
      role: "OWNER",
    },
    select: {
      workspaceId: true,
      workspace: {
        select: {
          name: true,
        },
      },
    },
  });

  const workspaceImpacts: WorkspaceImpact[] = await Promise.all(
    ownedWorkspaces.map(async (membership) => {
      const ownerCount = await prisma.workspaceMember.count({
        where: {
          workspaceId: membership.workspaceId,
          role: "OWNER",
        },
      });

      const isSoleOwner = ownerCount === 1;

      return {
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        isSoleOwner,
        willBeDeleted: isSoleOwner,
      };
    }),
  );

  return {
    targetUserId,
    targetUserEmail: user.email,
    workspaces: workspaceImpacts,
    canDelete: true,
  };
}
