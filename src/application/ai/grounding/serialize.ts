// src/application/ai/grounding/serialize.ts
import { AI_TOOL_ROW_CAP } from "@/application/ai/ai-types";
import type { AnalyticsPeriod } from "@/domain/analytics-types";

export type AiPeriodDto = {
  startDate: string;
  endDate: string;
};

export function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function serializePeriod(period: AnalyticsPeriod): AiPeriodDto {
  return {
    startDate: toIsoDate(period.startDate),
    endDate: toIsoDate(period.endDate),
  };
}

export function capRows<T>(rows: readonly T[], cap = AI_TOOL_ROW_CAP): T[] {
  return rows.slice(0, cap);
}
