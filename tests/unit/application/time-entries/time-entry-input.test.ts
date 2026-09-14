// tests/unit/application/time-entries/time-entry-input.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";

import {
  validateDuration,
  validateTimeEntryInput,
  validateUpdateTimeEntryInput,
} from "@/application/time-entries/time-entry-input";
import { InvalidDurationError, InvalidTimeEntryInputError } from "@/domain/time-entry-errors";
import type { RecordTimeEntryInput, UpdateTimeEntryInput } from "@/domain/persistence-types";

describe("validateDuration", () => {
  it("accepts valid durations", () => {
    expect(() => validateDuration(1)).not.toThrow();
    expect(() => validateDuration(60)).not.toThrow();
    expect(() => validateDuration(480)).not.toThrow(); // 8 hours
    expect(() => validateDuration(1440)).not.toThrow(); // 24 hours
  });

  it("rejects zero duration", () => {
    expect(() => validateDuration(0)).toThrow(InvalidDurationError);
  });

  it("rejects negative duration", () => {
    expect(() => validateDuration(-1)).toThrow(InvalidDurationError);
  });

  it("rejects over 24 hours", () => {
    expect(() => validateDuration(1441)).toThrow(InvalidDurationError);
  });

  it("rejects non-integer duration", () => {
    expect(() => validateDuration(30.5)).toThrow(InvalidDurationError);
  });
});

describe("validateTimeEntryInput", () => {
  it("accepts valid complete input", () => {
    const input: Partial<RecordTimeEntryInput> = {
      userId: "user-1",
      clientId: "client-1",
      contractId: "contract-1",
      workDate: new Date("2024-01-15T00:00:00.000Z"),
      durationMinutes: 120,
      description: "Development work",
      billable: true,
    };

    expect(() => validateTimeEntryInput(input)).not.toThrow();
  });

  it("accepts null description", () => {
    const input: Partial<RecordTimeEntryInput> = {
      durationMinutes: 120,
      description: null,
      billable: true,
    };

    expect(() => validateTimeEntryInput(input)).not.toThrow();
  });

  it("accepts undefined description", () => {
    const input: Partial<RecordTimeEntryInput> = {
      durationMinutes: 120,
      billable: true,
    };

    expect(() => validateTimeEntryInput(input)).not.toThrow();
  });

  it("rejects invalid work date", () => {
    const input = {
      durationMinutes: 120,
      workDate: "2024-01-15", // String instead of Date
      billable: true,
    };

    expect(() => validateTimeEntryInput(input as any)).toThrow(InvalidTimeEntryInputError);
  });

  it("rejects invalid billable flag", () => {
    const input = {
      durationMinutes: 120,
      billable: "true", // String instead of boolean
    };

    expect(() => validateTimeEntryInput(input as any)).toThrow(InvalidTimeEntryInputError);
  });

  it("rejects non-string description", () => {
    const input = {
      durationMinutes: 120,
      description: 123, // Number instead of string
      billable: true,
    };

    expect(() => validateTimeEntryInput(input as any)).toThrow(InvalidTimeEntryInputError);
  });

  it("rejects invalid duration", () => {
    const input: Partial<RecordTimeEntryInput> = {
      durationMinutes: 0,
      billable: true,
    };

    expect(() => validateTimeEntryInput(input)).toThrow(InvalidDurationError);
  });
});

describe("validateUpdateTimeEntryInput", () => {
  it("accepts valid update input", () => {
    const input: UpdateTimeEntryInput = {
      durationMinutes: 180,
      description: "Updated work",
      billable: false,
    };

    expect(() => validateUpdateTimeEntryInput(input)).not.toThrow();
  });

  it("accepts partial update input", () => {
    const input: UpdateTimeEntryInput = {
      durationMinutes: 180,
    };

    expect(() => validateUpdateTimeEntryInput(input)).not.toThrow();
  });

  it("accepts null description in update", () => {
    const input: UpdateTimeEntryInput = {
      description: null,
    };

    expect(() => validateUpdateTimeEntryInput(input)).not.toThrow();
  });

  it("rejects invalid duration in update", () => {
    const input: UpdateTimeEntryInput = {
      durationMinutes: -1,
    };

    expect(() => validateUpdateTimeEntryInput(input)).toThrow(InvalidDurationError);
  });

  it("rejects invalid billable flag in update", () => {
    const input = {
      billable: "false", // String instead of boolean
    };

    expect(() => validateUpdateTimeEntryInput(input as any)).toThrow(InvalidTimeEntryInputError);
  });

  it("rejects non-string description in update", () => {
    const input = {
      description: 456, // Number instead of string
    };

    expect(() => validateUpdateTimeEntryInput(input as any)).toThrow(InvalidTimeEntryInputError);
  });
});