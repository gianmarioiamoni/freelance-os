// src/application/time-entries/time-entry-input.ts
import type { RecordTimeEntryInput, UpdateTimeEntryInput } from "@/domain/persistence-types";
import { InvalidDurationError, InvalidTimeEntryInputError } from "@/domain/time-entry-errors";

export function validateDuration(durationMinutes: number): void {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    throw new InvalidDurationError();
  }
}

export function validateTimeEntryInput(input: Partial<RecordTimeEntryInput>): void {
  if (input.durationMinutes !== undefined) {
    validateDuration(input.durationMinutes);
  }

  if (input.workDate && !(input.workDate instanceof Date)) {
    throw new InvalidTimeEntryInputError("workDate");
  }

  if (input.billable !== undefined && typeof input.billable !== "boolean") {
    throw new InvalidTimeEntryInputError("billable");
  }

  if (input.description !== undefined && input.description !== null && typeof input.description !== "string") {
    throw new InvalidTimeEntryInputError("description");
  }
}

export function validateUpdateTimeEntryInput(input: UpdateTimeEntryInput): void {
  if (input.durationMinutes !== undefined) {
    validateDuration(input.durationMinutes);
  }

  if (input.billable !== undefined && typeof input.billable !== "boolean") {
    throw new InvalidTimeEntryInputError("billable");
  }

  if (input.description !== undefined && input.description !== null && typeof input.description !== "string") {
    throw new InvalidTimeEntryInputError("description");
  }
}