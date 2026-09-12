// src/features/clients/client-status.ts
import type { ClientStatus } from "@/domain/persistence-types";

export function formatClientStatus(status: ClientStatus): string {
  if (status === "ARCHIVED") {
    return "Archived";
  }

  return "Active";
}

export function displayOptionalText(value: string | null): string {
  if (value === null || value.length === 0) {
    return "Not provided";
  }

  return value;
}
