// src/features/time-entries/DurationInput.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Input } from "@/components/ui/input";
import type { JSX } from "react";

type DurationInputProps = {
  hoursName: string;
  minutesName: string;
  defaultHours?: string;
  defaultMinutes?: string;
  error?: string;
  disabled?: boolean;
};

export function DurationInput({
  hoursName,
  minutesName,
  defaultHours = "",
  defaultMinutes = "",
  error,
  disabled = false,
}: DurationInputProps): JSX.Element {
  return (
    <Field
      label="Duration"
      htmlFor={hoursName}
      hint="Enter time as hours:minutes (e.g., 2:30 for 2 hours 30 minutes)"
      error={error}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            id={hoursName}
            name={hoursName}
            type="text"
            inputMode="numeric"
            placeholder="Hours"
            defaultValue={defaultHours}
            disabled={disabled}
            className="text-center"
          />
        </div>
        <span className="text-muted-foreground">:</span>
        <div className="flex-1">
          <Input
            name={minutesName}
            type="text"
            inputMode="numeric"
            placeholder="Minutes"
            defaultValue={defaultMinutes}
            disabled={disabled}
            className="text-center"
          />
        </div>
      </div>
    </Field>
  );
}