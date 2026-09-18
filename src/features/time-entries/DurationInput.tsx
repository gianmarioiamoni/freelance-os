// src/features/time-entries/DurationInput.tsx
"use client";

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
  const hintId = `${hoursName}-hint`;
  const errorId = `${hoursName}-error`;
  const describedBy = error ? `${hintId} ${errorId}` : hintId;

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">Duration</legend>
      <div className="flex items-end gap-2">
        <div className="grid flex-1 gap-1">
          <label htmlFor={hoursName} className="text-sm">
            Hours
          </label>
          <Input
            id={hoursName}
            name={hoursName}
            type="text"
            inputMode="numeric"
            placeholder="Hours"
            defaultValue={defaultHours}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="text-center"
          />
        </div>
        <span className="pb-2 text-muted-foreground" aria-hidden="true">
          :
        </span>
        <div className="grid flex-1 gap-1">
          <label htmlFor={minutesName} className="text-sm">
            Minutes
          </label>
          <Input
            id={minutesName}
            name={minutesName}
            type="text"
            inputMode="numeric"
            placeholder="Minutes"
            defaultValue={defaultMinutes}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="text-center"
          />
        </div>
      </div>
      <p id={hintId} className="muted">
        Enter hours and minutes in the two boxes (for example 2 hours and 30
        minutes).
      </p>
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
