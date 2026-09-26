// src/application/ai/ai-types.ts

export type AiSurface = "dashboard" | "reports";

export type AiRefusalClass =
  | "unsupported_capability"
  | "write_forbidden"
  | "ambiguous_entity"
  | "unknown_entity"
  | "invalid_period"
  | "provider_unavailable"
  | "injection";

export type AiOutcome =
  | "success"
  | "clarification"
  | "refusal"
  | "unavailable"
  | "timeout"
  | "error";

export type AiUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type AiGroundedFact = {
  metric: string;
  value: string | number | boolean | null;
  currency?: string;
  unit?: string;
  label?: string;
};

export type AiCitation = {
  tool: string;
  metric: string;
  value: string | number | boolean | null;
  currency?: string;
  unit?: string;
  period?: { startDate: string; endDate: string };
  clientLabel?: string;
  contractLabel?: string;
};

export type AiAskInput = {
  question: string;
  surface: AiSurface;
};

export type AiAskResult = {
  outcome: AiOutcome;
  refusalClass?: AiRefusalClass;
  text: string;
  facts: AiGroundedFact[];
  citations: AiCitation[];
  selectedTools: string[];
  correlationId: string;
  latencyMs: number;
  providerId: string;
  modelId: string;
  usage?: AiUsage;
};

export const FORBIDDEN_TOOL_ARG_KEYS = [
  "workspaceId",
  "userId",
  "role",
] as const;

export const AI_QUESTION_MAX_LENGTH = 2000;
export const AI_ADAPTER_TIMEOUT_MS = 8_000;
export const AI_TOOL_ROW_CAP = 50;
export const AI_SURFACES = ["dashboard", "reports"] as const;
