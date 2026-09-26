// src/application/ai/create-foundation-registry.ts
import { createAiToolRegistry, type AiToolRegistry } from "@/application/ai/tool-registry";
import {
  createGetCurrentMonthAnalyticsTool,
  type CurrentMonthAnalyticsReader,
} from "@/application/ai/tools/get-current-month-analytics-tool";
import { createRefuseTool } from "@/application/ai/tools/refuse-tool";

export function createFoundationToolRegistry(
  analytics: CurrentMonthAnalyticsReader,
): AiToolRegistry {
  return createAiToolRegistry([
    createGetCurrentMonthAnalyticsTool(analytics),
    createRefuseTool(),
  ]);
}
