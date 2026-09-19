// src/features/reporting/CustomPeriodFields.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  validateCustomPeriodFields,
  type CustomPeriodFieldErrors,
} from "@/features/reporting/custom-period-validation";
import { type FormEvent, type JSX, useState } from "react";

type CustomPeriodFieldsProps = {
  defaultStart?: string;
  defaultEnd?: string;
};

export function CustomPeriodFields({
  defaultStart,
  defaultEnd,
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
      className="flex flex-wrap items-end gap-2"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="period" value="custom" />
      <Field label="Start date" htmlFor="report-period-start" error={errors.start}>
        <Input
          type="date"
          name="start"
          defaultValue={defaultStart}
          onChange={(event) => setStart(event.target.value)}
        />
      </Field>
      <Field label="End date" htmlFor="report-period-end" error={errors.end}>
        <Input
          type="date"
          name="end"
          defaultValue={defaultEnd}
          min={start || undefined}
        />
      </Field>
      <Button type="submit">Apply</Button>
    </form>
  );
}
