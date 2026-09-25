// src/features/reporting/reporting-types.ts
import { getTodayInTimezone } from "@/lib/analytics-periods";

/**
 * Calendar year for annual reporting, derived from Workspace.timezone.
 * Do not use process-local getFullYear() for this authority.
 */
export function getReportingCalendarYear(
  timezone: string,
  now: Date = new Date(),
): number {
  return getTodayInTimezone(timezone, now).year;
}

/**
 * Validated period kind accepted by the reports page.
 * Mirrors ReportingPeriodKind kinds; custom carries ISO date strings from URL.
 */
export type ReportPeriodParam =
  | { kind: "today" }
  | { kind: "week" }
  | { kind: "month" }
  | { kind: "year" }
  | { kind: "custom"; start: string; end: string };

const ENTITY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Optional Client/Contract view-state from /reports URL params.
 * Empty or invalid IDs are treated as unset (same fail-open as invalid period).
 */
export type ReportEntityFilterParam = {
  clientId?: string;
  contractId?: string;
};

/**
 * Parses Client/Contract report filters from URL search params.
 * Missing, empty, or non-UUID values are ignored (no entity filter).
 */
export function parseReportEntityFilterParam(params: {
  clientId?: string;
  contractId?: string;
}): ReportEntityFilterParam {
  const clientId = parseOptionalEntityId(params.clientId);
  const contractId = parseOptionalEntityId(params.contractId);
  return {
    ...(clientId ? { clientId } : {}),
    ...(contractId ? { contractId } : {}),
  };
}

function parseOptionalEntityId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || !ENTITY_ID_PATTERN.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

/**
 * Parses and validates the report period from URL search params.
 * Falls back to "month" when params are absent or invalid.
 * Dates are validated as ISO date strings (YYYY-MM-DD).
 */
export function parseReportPeriodParam(params: {
  period?: string;
  start?: string;
  end?: string;
}): ReportPeriodParam {
  const VALID_KINDS = new Set(["today", "week", "month", "year", "custom"]);
  const { period, start, end } = params;

  if (!period || !VALID_KINDS.has(period)) {
    return { kind: "month" };
  }

  if (period === "custom") {
    if (!start || !end || !isValidISODate(start) || !isValidISODate(end)) {
      return { kind: "month" };
    }
    if (start > end) {
      return { kind: "month" };
    }
    return { kind: "custom", start, end };
  }

  return { kind: period as "today" | "week" | "month" | "year" };
}

/** Validates a string as a YYYY-MM-DD date (rejects NaN dates). */
function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00.000Z");
  return !isNaN(d.getTime());
}

/**
 * Converts a ReportPeriodParam to its ReportingPeriodKind (for ReportingService).
 */
export function toReportingPeriodKind(param: ReportPeriodParam): import("@/domain/analytics-types").ReportingPeriodKind {
  if (param.kind === "custom") {
    return {
      kind: "custom",
      startDate: new Date(param.start + "T00:00:00.000Z"),
      endDate: new Date(param.end + "T00:00:00.000Z"),
    };
  }
  return { kind: param.kind };
}

/**
 * Returns the href for a period selector link.
 * Optional Client/Contract filters are appended in a fixed order:
 * period, start, end, clientId, contractId.
 */
export function periodHref(
  kind: ReportPeriodParam["kind"],
  start?: string,
  end?: string,
  filter?: ReportEntityFilterParam,
): string {
  const base =
    kind === "custom" && start && end
      ? `/reports?period=custom&start=${start}&end=${end}`
      : `/reports?period=${kind}`;
  return appendEntityFilterParams(base, filter);
}

/**
 * Serializes the current report period plus optional entity filters.
 * Delegates to `periodHref` — not a second query-param system.
 */
export function periodHrefFromState(
  period: ReportPeriodParam,
  filter?: ReportEntityFilterParam,
): string {
  if (period.kind === "custom") {
    return periodHref(period.kind, period.start, period.end, filter);
  }
  return periodHref(period.kind, undefined, undefined, filter);
}

function appendEntityFilterParams(
  href: string,
  filter?: ReportEntityFilterParam,
): string {
  if (!filter) {
    return href;
  }

  let result = href;
  if (filter.clientId) {
    result += `&clientId=${filter.clientId}`;
  }
  if (filter.contractId) {
    result += `&contractId=${filter.contractId}`;
  }
  return result;
}

/**
 * Human-readable label for a period kind.
 */
export const PERIOD_LABELS: Record<"today" | "week" | "month" | "year" | "custom", string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom Range",
};
