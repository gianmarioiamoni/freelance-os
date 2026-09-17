// src/components/app-shell/AppNav.tsx
"use client";

import { cn } from "@/lib/utils";
import { buildNavigationItems, isNavigationItemActive } from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { JSX } from "react";

type AppNavProps = {
  onNavigate?: () => void;
  unreadAlertCount?: number;
};

export function AppNav({ onNavigate, unreadAlertCount = 0 }: AppNavProps): JSX.Element {
  const pathname = usePathname();
  const navigationItems = buildNavigationItems(unreadAlertCount);

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
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  aria-label={`${item.badge} unread`}
                  className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-semibold leading-none text-destructive-foreground"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
