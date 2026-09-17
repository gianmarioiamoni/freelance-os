// src/features/notifications/NotificationCard.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import type { NotificationRecord } from "@/domain/persistence-types";
import { markNotificationReadAction } from "@/features/notifications/mark-notification-read-action";
import type { JSX } from "react";
import { useActionState } from "react";

type NotificationCardProps = {
  notification: NotificationRecord;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function NotificationCard({
  notification,
}: NotificationCardProps): JSX.Element {
  const isUnread = notification.readAt === null;

  const boundAction = markNotificationReadAction.bind(null, notification.id);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <Card
      size="sm"
      aria-label={`${isUnread ? "Unread notification: " : ""}${notification.title}`}
      className={isUnread ? "border-l-4 border-l-primary" : undefined}
    >
      <CardHeader>
        <CardTitle>
          <span
            className={isUnread ? "font-semibold" : "font-normal"}
            aria-describedby={`notification-body-${notification.id}`}
          >
            {notification.title}
          </span>
        </CardTitle>
        <CardDescription>
          <time dateTime={new Date(notification.createdAt).toISOString()}>
            {formatDate(notification.createdAt)}
          </time>
        </CardDescription>
        {isUnread && (
          <CardAction>
            <form action={formAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={isPending}
                aria-label="Mark as read"
              >
                {isPending ? "Marking…" : "Mark as read"}
              </Button>
            </form>
            {state?.error ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {state.error}
              </p>
            ) : null}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <p
          id={`notification-body-${notification.id}`}
          className={isUnread ? "text-sm" : "text-sm text-muted-foreground"}
        >
          {notification.body}
        </p>
        {notification.readAt !== null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Read{" "}
            <time dateTime={new Date(notification.readAt).toISOString()}>
              {formatDate(notification.readAt)}
            </time>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
