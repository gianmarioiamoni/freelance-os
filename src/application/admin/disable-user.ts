// src/application/admin/disable-user.ts
import "server-only";

import { prisma } from "@/infrastructure/prisma/client";

import { requireAdminAuthorization } from "./admin-authorization";
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

  const user = await prisma.user.findUnique({
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

  await prisma.user.update({
    where: { id: targetUserId },
    data: { disabledAt: new Date() },
  });
}
