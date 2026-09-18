// src/features/landing/Wordmark.tsx
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { JSX } from "react";

type WordmarkProps = {
  href?: string;
};

export function Wordmark({ href }: WordmarkProps): JSX.Element {
  const mark = (
    <span className="inline-flex rounded-md bg-foreground px-2 py-1 text-sm font-semibold tracking-tight text-background">
      FreelanceOS
    </span>
  );

  if (!href) {
    return mark;
  }

  return (
    <Link
      href={href}
      className={cn(
        "rounded-md outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {mark}
    </Link>
  );
}
