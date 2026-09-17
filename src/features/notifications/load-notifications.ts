// src/features/notifications/load-notifications.ts
import type { NotificationRecord } from "@/domain/persistence-types";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";

export async function loadNotificationsForCurrentUser(): Promise<NotificationRecord[]> {
  const context = await getCurrentWorkspaceContext();
  const { notifications } = createRepositories();

  return notifications.listNotificationsForUser(context.workspaceId, context.userId);
}
