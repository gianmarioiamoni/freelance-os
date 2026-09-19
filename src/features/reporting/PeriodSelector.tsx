// src/features/reporting/PeriodSelector.tsx
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <form method="GET" action="/reports" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="period" value="custom" />
          <Field label="Start date" htmlFor="report-period-start">
            <Input
              type="date"
              name="start"
              defaultValue={isCustom ? current.start : undefined}
            />
          </Field>
          <Field label="End date" htmlFor="report-period-end">
            <Input
              type="date"
              name="end"
              defaultValue={isCustom ? current.end : undefined}
            />
          </Field>
          <Button type="submit">Apply</Button>
        </form>
      </div>
    </nav>
  );
}
