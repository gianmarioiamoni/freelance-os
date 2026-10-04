// src/application/admin/disable-user.ts
import "server-only";

import { prisma } from "@/infrastructure/prisma/client";

import { requireAdminAuthorization } from "./admin-authorization";
import { recordAdminAction } from "./record-admin-action";
import {
  AdminSelfProtectionError,
  UserAlreadyDeletedError,
  UserAlreadyDisabledError,
  UserNotFoundError,
} from "./user-lifecycle-errors";

export async function disableUser(targetUserId: string): Promise<void> {
  const admin = await requireAdminAuthorization();

  if (admin.userId === targetUserId) {
    throw new AdminSelfProtectionError("disable");
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, disabledAt: true, deletedAt: true },
    });

    if (!user) {
      throw new UserNotFoundError(targetUserId);
    }

    if (user.deletedAt) {
      throw new UserAlreadyDeletedError(targetUserId);
    }

    if (user.disabledAt) {
      throw new UserAlreadyDisabledError(targetUserId);
    }

    await tx.user.update({
      where: { id: targetUserId },
      data: { disabledAt: new Date() },
    });

    await tx.session.deleteMany({
      where: { userId: targetUserId },
    });

    await recordAdminAction(tx, {
      adminUserId: admin.userId,
      targetUserId,
      action: "DISABLE_USER",
    });
  });
}
