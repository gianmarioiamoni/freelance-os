// src/components/app-shell/AppHeader.tsx
import { DEFAULT_AUTHENTICATED_PATH } from "@/application/auth/route-access";
import { MobileNav } from "@/components/app-shell/MobileNav";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { Wordmark } from "@/features/landing/Wordmark";
import type { JSX } from "react";

type AppHeaderProps = {
  accountLabel: string;
  workspaceName: string;
  unreadAlertCount: number;
};

export function AppHeader({
  accountLabel,
  workspaceName,
  unreadAlertCount,
}: AppHeaderProps): JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-4">
        <MobileNav unreadAlertCount={unreadAlertCount} />
        <Wordmark href={DEFAULT_AUTHENTICATED_PATH} />
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          {workspaceName}
        </p>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <p className="min-w-0 truncate text-sm">{accountLabel}</p>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
