// src/features/reporting/PeriodSelector.tsx
import { CustomPeriodFields } from "@/features/reporting/CustomPeriodFields";
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

const PILL_ACTIVE =
  "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground";
const PILL_INACTIVE =
  "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80";

export function PeriodSelector({ current }: PeriodSelectorProps): JSX.Element {
  const isCustom = current.kind === "custom";

  return (
    <nav aria-label="Report period" className="grid gap-3">
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {STANDARD_PERIODS.map((kind) => {
          const isActive = current.kind === kind;
          return (
            <li key={kind}>
              <Link
                href={periodHref(kind)}
                aria-current={isActive ? "page" : undefined}
                className={isActive ? PILL_ACTIVE : PILL_INACTIVE}
              >
                {PERIOD_LABELS[kind]}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-2">
        <span
          className={isCustom ? PILL_ACTIVE : PILL_INACTIVE}
          aria-current={isCustom ? "true" : undefined}
        >
          {PERIOD_LABELS.custom}
        </span>
        <CustomPeriodFields
          key={isCustom ? `${current.start}_${current.end}` : "preset"}
          defaultStart={isCustom ? current.start : undefined}
          defaultEnd={isCustom ? current.end : undefined}
        />
      </div>
    </nav>
  );
}
