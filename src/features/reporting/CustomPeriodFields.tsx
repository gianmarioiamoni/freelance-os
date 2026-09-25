// src/features/reporting/CustomPeriodFields.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  validateCustomPeriodFields,
  type CustomPeriodFieldErrors,
} from "@/features/reporting/custom-period-validation";
import type { ReportEntityFilterParam } from "@/features/reporting/reporting-types";
import { type FormEvent, type JSX, useState } from "react";

type CustomPeriodFieldsProps = {
  defaultStart?: string;
  defaultEnd?: string;
  filter?: ReportEntityFilterParam;
};

export function CustomPeriodFields({
  defaultStart,
  defaultEnd,
  filter,
}: CustomPeriodFieldsProps): JSX.Element {
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
      action="/reports"
      className="grid w-full min-w-0 gap-3 md:flex md:flex-wrap md:items-end md:gap-2"
      noValidate
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="period" value="custom" />
      <Field
        label="Start date"
        htmlFor="report-period-start"
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
        htmlFor="report-period-end"
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
      {filter?.clientId ? (
        <input type="hidden" name="clientId" value={filter.clientId} />
      ) : null}
      {filter?.contractId ? (
        <input type="hidden" name="contractId" value={filter.contractId} />
      ) : null}
      <Button type="submit" className="h-11 w-full md:h-8 md:w-auto">
        Apply
      </Button>
    </form>
  );
}
