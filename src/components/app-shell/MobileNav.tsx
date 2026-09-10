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

export function MobileNav(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
        >
          <Menu aria-hidden="true" />
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
          <AppNav onNavigate={() => setIsOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
