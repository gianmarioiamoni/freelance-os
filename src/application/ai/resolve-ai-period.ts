// src/application/ai/resolve-ai-period.ts
import { AiClarificationError } from "@/application/ai/ai-errors";
import { parseOptionalString } from "@/application/ai/parse-tool-args";
import type { PeriodKindRequest } from "@/application/reporting/reporting-service";
import type { AnalyticsPeriod } from "@/domain/analytics-types";

const PERIOD_KINDS = new Set(["today", "week", "month", "year", "custom"]);

function parseIsoDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/.test(trimmed)) {
    return undefined;
  }

  const parsed = new Date(trimmed.length === 10 ? `${trimmed}T00:00:00.000Z` : trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Interprets model-visible period args into a ReportingService period request.
 * Missing period defaults to current month. Invalid args do not substitute.
 *
 * `today` and `week` are valid period kinds for existing periodized analytics
 * (the same named periods Reports already resolves). They are not a daily or
 * weekly analytics capability.
 */
export function parseAiPeriodRequest(
  args: Record<string, unknown>,
): PeriodKindRequest {
  const periodKind = parseOptionalString(args.periodKind);

  if (!periodKind) {
    if (args.startDate !== undefined || args.endDate !== undefined) {
      throw new AiClarificationError("invalid_period");
    }
    return { kind: "month" };
  }

  if (!PERIOD_KINDS.has(periodKind)) {
    throw new AiClarificationError("invalid_period");
  }

  if (periodKind !== "custom") {
    if (args.startDate !== undefined || args.endDate !== undefined) {
      throw new AiClarificationError("invalid_period");
    }
    return { kind: periodKind as Exclude<PeriodKindRequest["kind"], "custom"> };
  }

  const startDate = parseIsoDate(args.startDate);
  const endDate = parseIsoDate(args.endDate);
  if (!startDate || !endDate) {
    throw new AiClarificationError("invalid_period");
  }

  return { kind: "custom", startDate, endDate };
}

export function resolveAiPeriod(
  args: Record<string, unknown>,
  timezone: string,
  resolvePeriod: (
    request: PeriodKindRequest,
    timezone: string,
    now?: Date,
  ) => AnalyticsPeriod,
  now?: Date,
): { request: PeriodKindRequest; period: AnalyticsPeriod } {
  const request = parseAiPeriodRequest(args);
  return { request, period: resolvePeriod(request, timezone, now) };
}
