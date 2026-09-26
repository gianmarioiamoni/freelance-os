// src/application/ai/parse-tool-args.ts
import { AiClarificationError } from "@/application/ai/ai-errors";
import type { ClientStatus, InvoiceTrackingFilter } from "@/domain/persistence-types";

export function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseRequiredString(
  value: unknown,
  clarificationClass: "unknown_entity" | "invalid_period" = "unknown_entity",
): string {
  const parsed = parseOptionalString(value);
  if (!parsed) {
    throw new AiClarificationError(clarificationClass);
  }
  return parsed;
}

export function parseOptionalYear(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d{4}$/.test(value.trim())) {
    return Number(value.trim());
  }

  return undefined;
}

export function parseOptionalClientStatus(value: unknown): ClientStatus | undefined {
  if (value === "ACTIVE" || value === "ARCHIVED") {
    return value;
  }
  return undefined;
}

export function parseOptionalTrackingFilter(
  value: unknown,
): InvoiceTrackingFilter | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === "ACTIVE" || value === "VOID" || value === "ALL") {
    return value;
  }

  throw new AiClarificationError("unknown_entity");
}
