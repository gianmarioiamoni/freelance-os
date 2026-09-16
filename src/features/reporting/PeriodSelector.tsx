// src/features/reporting/PeriodSelector.tsx
import Link from "next/link";
import type { JSX } from "react";
import { PERIOD_LABELS, periodHref, type ReportPeriodParam } from "./reporting-types";

type PeriodSelectorProps = {
  current: ReportPeriodParam;
};

const STANDARD_PERIODS: Array<"today" | "week" | "month" | "year"> = [
  "today",
  "week",
  "month",
  "year",
];

export function PeriodSelector({ current }: PeriodSelectorProps): JSX.Element {
  return (
    <nav aria-label="Report period">
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {STANDARD_PERIODS.map((kind) => {
          const isActive = current.kind === kind;
          return (
            <li key={kind}>
              <Link
                href={periodHref(kind)}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground"
                    : "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80"
                }
              >
                {PERIOD_LABELS[kind]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
