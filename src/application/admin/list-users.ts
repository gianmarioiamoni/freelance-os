// src/application/admin/list-users.ts
import "server-only";

import { prisma } from "@/infrastructure/prisma/client";

import { requireAdminAuthorization } from "./admin-authorization";

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  disabledAt: Date | null;
  deletedAt: Date | null;
  isAdmin: boolean;
};

export async function listUsers(): Promise<AdminUserListItem[]> {
  const admin = await requireAdminAuthorization();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      disabledAt: true,
      deletedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map((user) => ({
    ...user,
    isAdmin: user.id === admin.userId,
  }));
}
