// src/features/notifications/mark-notification-read-action.ts
"use server";

import { RecordNotFoundError } from "@/domain/persistence-errors";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { revalidatePath } from "next/cache";

export type MarkNotificationReadActionState = {
  error: string;
} | null;

export async function markNotificationReadAction(
  notificationId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _previousState: MarkNotificationReadActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<MarkNotificationReadActionState> {
  const context = await getCurrentWorkspaceContext();
  const { notifications } = createRepositories();

  // Verify ownership: getNotification is scoped to workspaceId
  const notification = await notifications.getNotification(
    context.workspaceId,
    notificationId,
  );

  if (!notification) {
    return { error: "Notification not found." };
  }

  // Ownership check: notification must belong to the authenticated user
  if (notification.userId !== context.userId) {
    return { error: "Not authorized." };
  }

  // Already read — idempotent, no error
  if (notification.readAt !== null) {
    return null;
  }

  try {
    await notifications.markNotificationRead(
      context.workspaceId,
      notificationId,
      new Date(),
    );
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return { error: "Notification not found." };
    }
    return { error: "Unable to mark notification as read." };
  }

  revalidatePath("/alerts");
  return null;
}
