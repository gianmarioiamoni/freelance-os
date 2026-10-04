// src/application/admin/delete-user.ts
import "server-only";

import { prisma } from "@/infrastructure/prisma/client";

import { requireAdminAuthorization } from "./admin-authorization";
import { recordAdminAction } from "./record-admin-action";
import {
  AdminSelfProtectionError,
  UserAlreadyDeletedError,
  UserNotFoundError,
} from "./user-lifecycle-errors";

function generateAnonymizedEmail(userId: string): string {
  return `deleted-user-${userId}@deleted.local`;
}

export async function deleteUser(targetUserId: string): Promise<void> {
  const admin = await requireAdminAuthorization();

  if (admin.userId === targetUserId) {
    throw new AdminSelfProtectionError("delete");
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      throw new UserNotFoundError(targetUserId);
    }

    if (user.deletedAt) {
      throw new UserAlreadyDeletedError(targetUserId);
    }

    const ownedWorkspaces = await tx.workspaceMember.findMany({
      where: {
        userId: targetUserId,
        role: "OWNER",
      },
      select: {
        workspaceId: true,
      },
    });

    for (const membership of ownedWorkspaces) {
      const ownerCount = await tx.workspaceMember.count({
        where: {
          workspaceId: membership.workspaceId,
          role: "OWNER",
        },
      });

      if (ownerCount === 1) {
        await tx.notification.deleteMany({
          where: { workspaceId: membership.workspaceId },
        });
        await tx.alert.deleteMany({
          where: { workspaceId: membership.workspaceId },
        });
        await tx.payment.deleteMany({
          where: { workspaceId: membership.workspaceId },
        });
        await tx.invoice.deleteMany({
          where: { workspaceId: membership.workspaceId },
        });
        await tx.timeEntry.deleteMany({
          where: { workspaceId: membership.workspaceId },
        });
        await tx.contract.deleteMany({
          where: { workspaceId: membership.workspaceId },
        });
        await tx.client.deleteMany({
          where: { workspaceId: membership.workspaceId },
        });
        await tx.workspaceSettings.deleteMany({
          where: { workspaceId: membership.workspaceId },
        });
        await tx.workspaceMember.deleteMany({
          where: { workspaceId: membership.workspaceId },
        });
        await tx.workspace.delete({
          where: { id: membership.workspaceId },
        });
      } else {
        await tx.notification.deleteMany({
          where: {
            workspaceId: membership.workspaceId,
            userId: targetUserId,
          },
        });
        await tx.timeEntry.deleteMany({
          where: {
            workspaceId: membership.workspaceId,
            userId: targetUserId,
          },
        });
        await tx.workspaceMember.delete({
          where: {
            workspaceId_userId: {
              workspaceId: membership.workspaceId,
              userId: targetUserId,
            },
          },
        });
      }
    }

    const otherMemberships = await tx.workspaceMember.findMany({
      where: {
        userId: targetUserId,
        role: "MEMBER",
      },
      select: {
        workspaceId: true,
      },
    });

    for (const membership of otherMemberships) {
      await tx.notification.deleteMany({
        where: {
          workspaceId: membership.workspaceId,
          userId: targetUserId,
        },
      });
      await tx.timeEntry.deleteMany({
        where: {
          workspaceId: membership.workspaceId,
          userId: targetUserId,
        },
      });
      await tx.workspaceMember.delete({
        where: {
          workspaceId_userId: {
            workspaceId: membership.workspaceId,
            userId: targetUserId,
          },
        },
      });
    }

    await tx.session.deleteMany({
      where: { userId: targetUserId },
    });

    await tx.account.deleteMany({
      where: { userId: targetUserId },
    });

    await tx.user.update({
      where: { id: targetUserId },
      data: {
        email: generateAnonymizedEmail(targetUserId),
        name: "Deleted User",
        deletedAt: new Date(),
        disabledAt: new Date(),
      },
    });

    await recordAdminAction(tx, {
      adminUserId: admin.userId,
      targetUserId,
      action: "DELETE_USER",
    });
  });
}
