// src/application/admin/enable-user.ts
import "server-only";

import { prisma } from "@/infrastructure/prisma/client";

import { requireAdminAuthorization } from "./admin-authorization";
import { recordAdminAction } from "./record-admin-action";
import {
  UserDeletedError,
  UserNotDisabledError,
  UserNotFoundError,
} from "./user-lifecycle-errors";

export async function enableUser(targetUserId: string): Promise<void> {
  const admin = await requireAdminAuthorization();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, disabledAt: true, deletedAt: true },
    });

    if (!user) {
      throw new UserNotFoundError(targetUserId);
    }

    if (user.deletedAt) {
      throw new UserDeletedError(targetUserId);
    }

    if (!user.disabledAt) {
      throw new UserNotDisabledError(targetUserId);
    }

    await tx.user.update({
      where: { id: targetUserId },
      data: { disabledAt: null },
    });

    await recordAdminAction(tx, {
      adminUserId: admin.userId,
      targetUserId,
      action: "ENABLE_USER",
    });
  });
}
