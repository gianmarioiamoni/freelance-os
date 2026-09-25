// src/application/analytics/analytics-filter.ts
import type { AnalyticsFilter } from "@/domain/analytics-types";

/**
 * Treats empty/whitespace IDs as unset. Does not validate UUID format —
 * URL parsing owns that convention; application IDs may be test doubles.
 */
export function normalizeAnalyticsFilter(
  filter?: AnalyticsFilter,
): AnalyticsFilter | undefined {
  if (!filter) {
    return undefined;
  }

  const clientId = filter.clientId?.trim() || undefined;
  const contractId = filter.contractId?.trim() || undefined;

  if (!clientId && !contractId) {
    return undefined;
  }

  return {
    ...(clientId ? { clientId } : {}),
    ...(contractId ? { contractId } : {}),
  };
}

export function optionalAnalyticsFilter(
  filter?: AnalyticsFilter,
): [] | [AnalyticsFilter] {
  const normalized = normalizeAnalyticsFilter(filter);
  return normalized ? [normalized] : [];
}
