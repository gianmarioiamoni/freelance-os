// src/features/notifications/NotificationList.tsx
import { EmptyState } from "@/components/states/EmptyState";
import type { NotificationRecord } from "@/domain/persistence-types";
import { NotificationCard } from "@/features/notifications/NotificationCard";
import type { JSX } from "react";

type NotificationListProps = {
  notifications: NotificationRecord[];
};

export function NotificationList({
  notifications,
}: NotificationListProps): JSX.Element {
  if (notifications.length === 0) {
    return (
      <EmptyState
        title="No notifications"
        description="Notifications will appear here when contract thresholds are reached."
      />
    );
  }

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  return (
    <section aria-label="Notifications">
      {unreadCount > 0 && (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
        </p>
      )}
      <ol className="flex flex-col gap-3" aria-label="Notification list">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <NotificationCard notification={notification} />
          </li>
        ))}
      </ol>
    </section>
  );
}
