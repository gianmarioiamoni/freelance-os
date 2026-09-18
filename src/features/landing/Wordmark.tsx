// src/features/landing/Wordmark.tsx
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { JSX } from "react";

type WordmarkProps = {
  href?: string;
};

export function Wordmark({ href }: WordmarkProps): JSX.Element {
  const className = "shrink-0 text-sm font-semibold tracking-tight";

  if (!href) {
    return <p className={className}>FreelanceOS</p>;
  }

  return (
    <Link
      href={href}
      className={cn(
        className,
        "outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      FreelanceOS
    </Link>
  );
}
