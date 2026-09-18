// src/app/(app)/alerts/page.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { ErrorState } from "@/components/states/ErrorState";
import { loadNotificationsForCurrentUser } from "@/features/notifications/load-notifications";
import { NotificationList } from "@/features/notifications/NotificationList";
import type { JSX } from "react";

export default async function AlertsPage(): Promise<JSX.Element> {
  let notifications;

  try {
    notifications = await loadNotificationsForCurrentUser();
  } catch {
    return (
      <section className="max-w-2xl">
        <PageHeader
          title="Alerts"
          description="In-app notifications for contract alerts."
        />
        <PageContent>
          <ErrorState message="Unable to load alerts. Please try again later." />
        </PageContent>
      </section>
    );
  }

  return (
    <section className="max-w-2xl">
        <PageHeader
          title="Alerts"
          description="In-app notifications for contract alerts."
        />
      <PageContent>
        <NotificationList notifications={notifications} />
      </PageContent>
    </section>
  );
}
