// src/components/app-shell/AppNav.tsx
"use client";

import { cn } from "@/lib/utils";
import { isNavigationItemActive, navigationItems } from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { JSX } from "react";

type AppNavProps = {
  onNavigate?: () => void;
};

export function AppNav({ onNavigate }: AppNavProps): JSX.Element {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {navigationItems.map((item) => {
        const isActive = isNavigationItemActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/80",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
