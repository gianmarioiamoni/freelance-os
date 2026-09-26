// src/application/ai/grounding/answer-facts.ts
import type { AiCitation, AiGroundedFact } from "@/application/ai/ai-types";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { AiPeriodDto } from "@/application/ai/grounding/serialize";

export type GroundedAnswer = {
  text: string;
  facts: AiGroundedFact[];
  citations: AiCitation[];
};

const CONTRACT_IDENTITY_METRICS = new Set([
  "consumedMinutes",
  "remainingMinutes",
  "allocatedMinutes",
  "allocationStatus",
  "utilizationPercentage",
  "contractedMinutes",
]);

export function fact(
  metric: string,
  value: AiGroundedFact["value"],
  extras: Omit<AiGroundedFact, "metric" | "value"> = {},
): AiGroundedFact {
  return { metric, value, ...extras };
}

export function cite(
  tool: string,
  item: AiGroundedFact,
  period?: AiPeriodDto,
): AiCitation {
  const hasContractIdentity =
    item.metric.startsWith("contract") ||
    item.metric.startsWith("utilization") ||
    item.metric.startsWith("allocation") ||
    CONTRACT_IDENTITY_METRICS.has(item.metric);

  return {
    tool,
    metric: item.metric,
    value: item.value,
    currency: item.currency,
    unit: item.unit,
    period,
    clientLabel: item.label,
    contractLabel: hasContractIdentity ? item.label : undefined,
  };
}

export function moneyFacts(
  prefix: string,
  rows: ReadonlyArray<{ currency: string; published: number | null }>,
): AiGroundedFact[] {
  if (rows.length === 0) {
    return [fact(prefix, 0)];
  }
  return rows.map((row) => fact(prefix, row.published, { currency: row.currency }));
}

export function formatFact(item: AiGroundedFact): string {
  if (item.value === null) {
    return item.label
      ? `${item.metric} (${item.label}): non disponibile`
      : `${item.metric}: non disponibile`;
  }
  if (item.currency) {
    return item.label
      ? `${item.metric} (${item.label}): ${item.value} ${item.currency}`
      : `${item.metric}: ${item.value} ${item.currency}`;
  }
  if (item.unit === "minutes") {
    const duration = AnalyticsService.formatDuration(Number(item.value));
    return item.label
      ? `${item.metric} (${item.label}): ${duration}`
      : `${item.metric}: ${duration}`;
  }
  if (item.label) {
    return `${item.metric} (${item.label}): ${item.value}`;
  }
  return `${item.metric}: ${item.value}`;
}

export function finish(
  tool: string,
  facts: AiGroundedFact[],
  period?: AiPeriodDto,
): GroundedAnswer {
  return {
    text: facts.map(formatFact).join(". ") + ".",
    facts,
    citations: facts.map((item) => cite(tool, item, period)),
  };
}

export function finishWithCitations(
  facts: AiGroundedFact[],
  citations: AiCitation[],
): GroundedAnswer {
  return {
    text: facts.map(formatFact).join(". ") + ".",
    facts,
    citations,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function periodOf(value: unknown): AiPeriodDto | undefined {
  if (!isRecord(value) || !isRecord(value.period)) {
    return undefined;
  }
  const { startDate, endDate } = value.period;
  if (typeof startDate === "string" && typeof endDate === "string") {
    return { startDate, endDate };
  }
  return undefined;
}

export function moneyList(
  value: unknown,
): Array<{ currency: string; published: number | null }> {
  if (!isRecord(value) || !Array.isArray(value.byCurrency)) {
    return [];
  }
  return value.byCurrency.flatMap((row) => {
    if (!isRecord(row) || typeof row.currency !== "string") {
      return [];
    }
    const published = row.published;
    if (published !== null && typeof published !== "number") {
      return [];
    }
    return [{ currency: row.currency, published }];
  });
}

export function rowClientLabel(row: Record<string, unknown>): string | undefined {
  return typeof row.clientName === "string" && row.clientName.length > 0
    ? row.clientName
    : undefined;
}
