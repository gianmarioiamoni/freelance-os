// src/application/admin/record-admin-action.ts
import "server-only";

import type { AdminActionType, Prisma } from "@prisma/client";

export type AuditedAdminAction = Extract<
  AdminActionType,
  "DISABLE_USER" | "ENABLE_USER" | "DELETE_USER"
>;

export async function recordAdminAction(
  tx: Prisma.TransactionClient,
  input: {
    adminUserId: string;
    targetUserId: string;
    action: AuditedAdminAction;
  },
): Promise<void> {
  await tx.adminAction.create({
    data: {
      adminUserId: input.adminUserId,
      targetUserId: input.targetUserId,
      action: input.action,
    },
  });
}
