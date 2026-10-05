import { cn } from "@/lib/utils";
import type { JSX } from "react";

type BrandMarkProps = {
  className?: string;
};

/** A compact operations ledger: one workspace, three active workstreams. */
export function BrandMark({ className }: BrandMarkProps): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("size-4 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M7 7.5h6.5M7 12h10M7 16.5h7"
        stroke="var(--background)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="17" cy="7.5" r="1" fill="var(--background)" />
    </svg>
  );
}
