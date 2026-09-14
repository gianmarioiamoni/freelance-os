// src/features/time-entries/time-entry-form-state.ts
import type { TimeEntryInputField } from "@/domain/time-entry-errors";

export type TimeEntryFormValues = {
  clientId: string;
  contractId: string;
  workDate: string;
  durationHours: string;
  durationMinutes: string;
  description: string;
  billable: boolean;
};

export type TimeEntryFormActionState = {
  error: string;
  field?: TimeEntryInputField;
  values: TimeEntryFormValues;
} | null;

export type TimeEntryFormAction = (
  previousState: TimeEntryFormActionState,
  formData: FormData,
) => Promise<TimeEntryFormActionState>;

export const EMPTY_TIME_ENTRY_FORM_VALUES: TimeEntryFormValues = {
  clientId: "",
  contractId: "",
  workDate: new Date().toISOString().split("T")[0], // Today
  durationHours: "",
  durationMinutes: "",
  description: "",
  billable: true,
};

export const TIME_ENTRY_FIELD_ERROR_MESSAGES: Record<TimeEntryInputField, string> = {
  clientId: "Select a client.",
  contractId: "Select a contract.",
  workDate: "Enter a valid work date.",
  durationMinutes: "Duration must be between 1 minute and 24 hours.",
  description: "Description is too long.",
  billable: "Select billable status.",
};

export const TIME_ENTRY_ARCHIVED_CLIENT_ERROR = "Cannot create time entries for archived clients.";
export const TIME_ENTRY_CONTRACT_NOT_VALID_ERROR = "Contract is not valid for the selected work date.";
export const TIME_ENTRY_NOT_FOUND_ERROR = "Time entry not found.";
export const TIME_ENTRY_FOREIGN_RESOURCE_ERROR = "Time entry does not belong to your workspace.";

export function readTimeEntryFormValues(formData: FormData): TimeEntryFormValues {
  return {
    clientId: formData.get("clientId")?.toString() ?? "",
    contractId: formData.get("contractId")?.toString() ?? "",
    workDate: formData.get("workDate")?.toString() ?? "",
    durationHours: formData.get("durationHours")?.toString() ?? "",
    durationMinutes: formData.get("durationMinutes")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    billable: formData.get("billable") === "true",
  };
}

export function parseDurationFromForm(hours: string, minutes: string): number {
  const hoursNum = parseInt(hours) || 0;
  const minutesNum = parseInt(minutes) || 0;
  return hoursNum * 60 + minutesNum;
}

export function formatDurationToHoursMinutes(durationMinutes: number): { hours: string; minutes: string } {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return {
    hours: hours.toString(),
    minutes: minutes.toString(),
  };
}