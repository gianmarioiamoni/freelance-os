// src/features/landing/Wordmark.tsx
import { cn } from "@/lib/utils";
import { BrandMark } from "@/features/landing/BrandMark";
import Link from "next/link";
import type { JSX } from "react";

type WordmarkProps = {
  href?: string;
};

export function Wordmark({ href }: WordmarkProps): JSX.Element {
  const className = "inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight";

  if (!href) {
    return (
      <p className={className}>
        <BrandMark />
        FreelanceOS
      </p>
    );
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
      <BrandMark />
      FreelanceOS
    </Link>
  );
}
