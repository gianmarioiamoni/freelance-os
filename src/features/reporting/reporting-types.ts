// src/features/reporting/reporting-types.ts

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
 */
export function periodHref(kind: ReportPeriodParam["kind"], start?: string, end?: string): string {
  if (kind === "custom" && start && end) {
    return `/reports?period=custom&start=${start}&end=${end}`;
  }
  return `/reports?period=${kind}`;
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
