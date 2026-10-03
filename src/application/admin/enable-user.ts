// src/application/admin/enable-user.ts
import "server-only";

import { prisma } from "@/infrastructure/prisma/client";

import { requireAdminAuthorization } from "./admin-authorization";
import {
  UserDeletedError,
  UserNotDisabledError,
  UserNotFoundError,
} from "./user-lifecycle-errors";

export async function enableUser(targetUserId: string): Promise<void> {
  await requireAdminAuthorization();

  const user = await prisma.user.findUnique({
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

  await prisma.user.update({
    where: { id: targetUserId },
    data: { disabledAt: null },
  });
}
