// src/application/alerts/alert-dedup-key.ts
import type { AlertType } from "@/domain/persistence-types";

const PREFIX: Record<Extract<AlertType, "CONTRACT_WARNING" | "CONTRACT_EXCEEDED">, string> = {
  CONTRACT_WARNING: "cw",
  CONTRACT_EXCEEDED: "ce",
};

/**
 * Builds a deterministic deduplication key for contract alerts.
 *
 * Format: "{prefix}:{workspaceId}:{contractId}:{periodStart}"
 *
 * Keys are stable within a period; one key = one alert occurrence.
 * Re-trigger (after resolution) creates a new alert with the same base key
 * plus a timestamp suffix to avoid the unique constraint.
 *
 * CAPACITY_WARNING / CAPACITY_EXCEEDED are deferred (PD-106-001).
 */
export function buildContractAlertDedupKey(
  type: Extract<AlertType, "CONTRACT_WARNING" | "CONTRACT_EXCEEDED">,
  workspaceId: string,
  contractId: string,
  periodStart: Date,
): string {
  const prefix = PREFIX[type];
  const periodStr = periodStart.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${prefix}:${workspaceId}:${contractId}:${periodStr}`;
}

/**
 * Builds the re-trigger deduplication key when a resolved alert key must be reused.
 * Appends a timestamp suffix to produce a new unique key for the same condition.
 */
export function buildRetriggerDedupKey(
  type: Extract<AlertType, "CONTRACT_WARNING" | "CONTRACT_EXCEEDED">,
  workspaceId: string,
  contractId: string,
  periodStart: Date,
  createdAt: Date,
): string {
  const base = buildContractAlertDedupKey(type, workspaceId, contractId, periodStart);
  const suffix = createdAt.getTime().toString();
  return `${base}:${suffix}`;
}

const PAYMENT_PREFIX: Record<
  Extract<AlertType, "PAYMENT_PARTIAL" | "PAYMENT_OVERDUE" | "PAYMENT_MISMATCH">,
  string
> = {
  PAYMENT_PARTIAL: "pp",
  PAYMENT_OVERDUE: "po",
  PAYMENT_MISMATCH: "pm",
};

/**
 * Deterministic invoice-scoped key.
 * Format: "{prefix}:{workspaceId}:{invoiceId}"
 * Re-trigger appends a timestamp suffix, same convention as contract alerts.
 */
export function buildPaymentAlertDedupKey(
  type: Extract<AlertType, "PAYMENT_PARTIAL" | "PAYMENT_OVERDUE" | "PAYMENT_MISMATCH">,
  workspaceId: string,
  invoiceId: string,
): string {
  return `${PAYMENT_PREFIX[type]}:${workspaceId}:${invoiceId}`;
}

export function buildPaymentRetriggerDedupKey(
  type: Extract<AlertType, "PAYMENT_PARTIAL" | "PAYMENT_OVERDUE" | "PAYMENT_MISMATCH">,
  workspaceId: string,
  invoiceId: string,
  createdAt: Date,
): string {
  return `${buildPaymentAlertDedupKey(type, workspaceId, invoiceId)}:${createdAt.getTime()}`;
}

const ALLOCATION_PREFIX: Record<
  Extract<AlertType, "ALLOCATION_WARNING" | "ALLOCATION_EXCEEDED">,
  string
> = {
  ALLOCATION_WARNING: "aw",
  ALLOCATION_EXCEEDED: "ae",
};

/**
 * Contract-scoped, period-less key.
 * Format: "{prefix}:{workspaceId}:{contractId}"
 */
export function buildAllocationAlertDedupKey(
  type: Extract<AlertType, "ALLOCATION_WARNING" | "ALLOCATION_EXCEEDED">,
  workspaceId: string,
  contractId: string,
): string {
  return `${ALLOCATION_PREFIX[type]}:${workspaceId}:${contractId}`;
}

export function buildAllocationRetriggerDedupKey(
  type: Extract<AlertType, "ALLOCATION_WARNING" | "ALLOCATION_EXCEEDED">,
  workspaceId: string,
  contractId: string,
  createdAt: Date,
): string {
  return `${buildAllocationAlertDedupKey(type, workspaceId, contractId)}:${createdAt.getTime()}`;
}
