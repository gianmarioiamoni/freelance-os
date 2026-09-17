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
