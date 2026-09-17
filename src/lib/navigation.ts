// src/lib/navigation.ts
import {
  BarChart3,
  Bell,
  Building2,
  Clock,
  FileText,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export function buildNavigationItems(unreadAlertCount: number): NavigationItem[] {
  return [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/clients", label: "Clients", icon: Building2 },
    { href: "/contracts", label: "Contracts", icon: FileText },
    { href: "/time-tracking", label: "Time Tracking", icon: Clock },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    {
      href: "/alerts",
      label: "Alerts",
      icon: Bell,
      badge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
    },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
}

export function isNavigationItemActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
