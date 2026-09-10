// src/infrastructure/persistence/notification-repository.ts
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type { CreateNotificationInput } from "@/domain/persistence-types";
import type { NotificationRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapNotification } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createNotificationRepository(
  db: PrismaExecutor,
): NotificationRepository {
  return {
    createNotification(workspaceId: string, input: CreateNotificationInput) {
      return withPersistenceErrors(async () =>
        mapNotification(
          await db.notification.create({
            data: {
              workspaceId,
              userId: input.userId,
              alertId: input.alertId ?? null,
              type: input.type,
              title: input.title,
              body: input.body,
            },
          }),
        ),
      );
    },

    async getNotification(workspaceId: string, notificationId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.notification.findFirst({
          where: { id: notificationId, workspaceId },
        });
        return row ? mapNotification(row) : null;
      });
    },

    listNotificationsForUser(workspaceId: string, userId: string) {
      return withPersistenceErrors(async () => {
        const rows = await db.notification.findMany({
          where: { workspaceId, userId },
          orderBy: { createdAt: "desc" },
        });
        return rows.map(mapNotification);
      });
    },

    markNotificationRead(workspaceId: string, notificationId: string, readAt: Date) {
      return withPersistenceErrors(async () => {
        const result = await db.notification.updateMany({
          where: { id: notificationId, workspaceId },
          data: { readAt },
        });

        if (result.count === 0) {
          throw new RecordNotFoundError("Notification", notificationId);
        }

        const row = await db.notification.findFirst({
          where: { id: notificationId, workspaceId },
        });

        if (!row) {
          throw new RecordNotFoundError("Notification", notificationId);
        }

        return mapNotification(row);
      });
    },
  };
}
