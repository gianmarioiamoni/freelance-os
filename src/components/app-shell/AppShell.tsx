// src/components/app-shell/AppShell.tsx
import { AppHeader } from "@/components/app-shell/AppHeader";
import { AppSidebar } from "@/components/app-shell/AppSidebar";
import type { JSX, ReactNode } from "react";

type AppShellProps = {
  accountLabel: string;
  children: ReactNode;
  workspaceName: string;
  unreadAlertCount: number;
};

export function AppShell({
  accountLabel,
  children,
  workspaceName,
  unreadAlertCount,
}: AppShellProps): JSX.Element {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <AppHeader accountLabel={accountLabel} workspaceName={workspaceName} unreadAlertCount={unreadAlertCount} />
      <div className="flex min-w-0 flex-1">
        <AppSidebar unreadAlertCount={unreadAlertCount} />
        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
