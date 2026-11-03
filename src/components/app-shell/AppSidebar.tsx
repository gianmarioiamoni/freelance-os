// src/components/app-shell/AppSidebar.tsx
import { AppNav } from "@/components/app-shell/AppNav";
import type { JSX } from "react";

type AppSidebarProps = {
  unreadAlertCount: number;
  unreadAnomalyCount: number;
  isAdmin: boolean;
};

export function AppSidebar({
  unreadAlertCount,
  unreadAnomalyCount,
  isAdmin,
}: AppSidebarProps): JSX.Element {
  return (
    <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r bg-sidebar md:block">
      <nav aria-label="Application" className="p-3">
        <AppNav
          unreadAlertCount={unreadAlertCount}
          unreadAnomalyCount={unreadAnomalyCount}
          isAdmin={isAdmin}
        />
      </nav>
    </aside>
  );
}
