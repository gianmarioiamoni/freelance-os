// src/features/invoices/WorkspaceInvoicePeriodSelector.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  validateCustomPeriodFields,
  type CustomPeriodFieldErrors,
} from "@/features/reporting/custom-period-validation";
import {
  workspaceInvoicePeriodHref,
  type WorkspaceInvoiceViewState,
} from "@/features/invoices/workspace-invoice-filters";
import { PERIOD_LABELS } from "@/features/reporting/reporting-types";
import Link from "next/link";
import { type FormEvent, type JSX, useState } from "react";

type WorkspaceInvoicePeriodSelectorProps = {
  view: WorkspaceInvoiceViewState;
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

export function WorkspaceInvoicePeriodSelector({
  view,
}: WorkspaceInvoicePeriodSelectorProps): JSX.Element {
  const isCustom = view.period.kind === "custom";

  return (
    <nav aria-label="Invoice period" className="grid min-w-0 gap-3">
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {STANDARD_PERIODS.map((kind) => {
          const isActive = view.period.kind === kind;
          return (
            <li key={kind}>
              <Link
                href={workspaceInvoicePeriodHref(
                  { kind },
                  view.tracking,
                  view.clientId,
                )}
                aria-current={isActive ? "page" : undefined}
                className={isActive ? PILL_ACTIVE : PILL_INACTIVE}
              >
                {PERIOD_LABELS[kind]}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="grid min-w-0 gap-2">
        <span
          className={isCustom ? PILL_ACTIVE : PILL_INACTIVE}
          aria-current={isCustom ? "true" : undefined}
        >
          {PERIOD_LABELS.custom}
        </span>
        <CustomInvoicePeriodFields
          key={
            view.period.kind === "custom"
              ? `${view.period.start}_${view.period.end}`
              : "preset"
          }
          defaultStart={
            view.period.kind === "custom" ? view.period.start : undefined
          }
          defaultEnd={
            view.period.kind === "custom" ? view.period.end : undefined
          }
          tracking={view.tracking}
          clientId={view.clientId}
        />
      </div>
    </nav>
  );
}

type CustomInvoicePeriodFieldsProps = {
  defaultStart?: string;
  defaultEnd?: string;
  tracking: WorkspaceInvoiceViewState["tracking"];
  clientId?: string;
};

function CustomInvoicePeriodFields({
  defaultStart,
  defaultEnd,
  tracking,
  clientId,
}: CustomInvoicePeriodFieldsProps): JSX.Element {
  const [start, setStart] = useState(defaultStart ?? "");
  const [errors, setErrors] = useState<CustomPeriodFieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    const formData = new FormData(event.currentTarget);
    const nextStart = String(formData.get("start") ?? "");
    const nextEnd = String(formData.get("end") ?? "");
    const nextErrors = validateCustomPeriodFields(nextStart, nextEnd);
    if (nextErrors) {
      event.preventDefault();
      setErrors(nextErrors);
      return;
    }
    setErrors({});
  }

  return (
    <form
      method="GET"
      action="/invoices"
      className="grid w-full min-w-0 gap-3 md:flex md:flex-wrap md:items-end md:gap-2"
      noValidate
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="period" value="custom" />
      {tracking !== "ACTIVE" ? (
        <input type="hidden" name="tracking" value={tracking} />
      ) : null}
      {clientId ? <input type="hidden" name="clientId" value={clientId} /> : null}
      <Field
        label="Start date"
        htmlFor="invoice-period-start"
        error={errors.start}
        className="w-full min-w-0 md:w-auto"
      >
        <Input
          type="date"
          name="start"
          defaultValue={defaultStart}
          className="h-11 md:h-8"
          onChange={(event) => setStart(event.target.value)}
        />
      </Field>
      <Field
        label="End date"
        htmlFor="invoice-period-end"
        error={errors.end}
        className="w-full min-w-0 md:w-auto"
      >
        <Input
          type="date"
          name="end"
          defaultValue={defaultEnd}
          min={start || undefined}
          className="h-11 md:h-8"
        />
      </Field>
      <Button type="submit" className="h-11 w-full md:h-8 md:w-auto">
        Apply
      </Button>
    </form>
  );
}
