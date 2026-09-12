// src/components/app-shell/AppHeader.tsx
import { MobileNav } from "@/components/app-shell/MobileNav";
import { SignOutButton } from "@/features/auth/SignOutButton";
import type { JSX } from "react";

type AppHeaderProps = {
  accountLabel: string;
  workspaceName: string;
};

export function AppHeader({
  accountLabel,
  workspaceName,
}: AppHeaderProps): JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-4">
        <MobileNav />
        <p className="shrink-0 text-sm font-semibold tracking-tight">
          FreelanceOS
        </p>
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
