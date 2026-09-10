// src/components/app-shell/AppSidebar.tsx
import { AppNav } from "@/components/app-shell/AppNav";
import type { JSX } from "react";

export function AppSidebar(): JSX.Element {
  return (
    <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r bg-sidebar md:block">
      <nav aria-label="Application" className="p-3">
        <AppNav />
      </nav>
    </aside>
  );
}
