// src/application/ai/log-ai-request.ts
import type { AiOutcome, AiRefusalClass, AiSurface, AiUsage } from "@/application/ai/ai-types";

export type AiRequestLog = {
  correlationId: string;
  workspaceId: string;
  userId: string;
  surface: AiSurface;
  selectedTools: string[];
  latencyMs: number;
  providerId: string;
  modelId: string;
  outcome: AiOutcome;
  refusalClass?: AiRefusalClass;
  usage?: AiUsage;
};

export function logAiRequest(entry: AiRequestLog): void {
  console.info(
    `[ai-request] correlationId=${entry.correlationId} workspaceId=${entry.workspaceId} userId=${entry.userId} surface=${entry.surface} selectedTools=${entry.selectedTools.join(",") || "-"} latencyMs=${entry.latencyMs} providerId=${entry.providerId} modelId=${entry.modelId} outcome=${entry.outcome}${entry.refusalClass ? ` refusalClass=${entry.refusalClass}` : ""}${entry.usage ? ` inputTokens=${entry.usage.inputTokens ?? "-"} outputTokens=${entry.usage.outputTokens ?? "-"}` : ""}`,
  );
}
