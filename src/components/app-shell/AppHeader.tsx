// src/components/app-shell/AppHeader.tsx
import { MobileNav } from "@/components/app-shell/MobileNav";
import type { JSX } from "react";

export function AppHeader(): JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-4">
        <MobileNav />
        <p className="text-sm font-semibold tracking-tight">FreelanceOS</p>
      </div>
    </header>
  );
}
