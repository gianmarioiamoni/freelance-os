// src/components/app-shell/MobileNav.tsx
"use client";

import { AppNav } from "@/components/app-shell/AppNav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";
import type { JSX } from "react";

type MobileNavProps = {
  unreadAlertCount: number;
};

export function MobileNav({ unreadAlertCount }: MobileNavProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative md:hidden"
          aria-label={
            unreadAlertCount > 0
              ? `Open navigation, ${unreadAlertCount} unread alerts`
              : "Open navigation"
          }
        >
          <Menu aria-hidden="true" />
          {unreadAlertCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-semibold leading-none text-destructive-foreground"
            >
              {unreadAlertCount > 99 ? "99+" : unreadAlertCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
        <SheetHeader>
          <SheetTitle>FreelanceOS</SheetTitle>
          <SheetDescription className="sr-only">
            Application sections
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Application" className="px-3 pb-6">
          <AppNav onNavigate={() => setIsOpen(false)} unreadAlertCount={unreadAlertCount} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
