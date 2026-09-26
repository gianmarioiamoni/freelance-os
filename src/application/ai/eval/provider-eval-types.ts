// src/application/ai/eval/provider-eval-types.ts
import type { AiAskResult } from "@/application/ai/ai-types";
import type { AiAdapterResult } from "@/application/ai/ai-provider-port";
import type { ProviderEvalCase } from "@/application/ai/eval/provider-eval-cases";

export type EvalCheck = "pass" | "fail" | "na";

export type ProviderEvalRecord = {
  id: string;
  family: ProviderEvalCase["family"];
  input: string;
  modelDecision: {
    adapterStatus: AiAdapterResult["status"] | "none";
    selectedTools: string[];
    toolArgs: unknown;
    attemptedTenantKeys: string[];
  };
  applicationTruth: Pick<AiAskResult, "outcome" | "refusalClass" | "selectedTools"> & {
    citationCount: number;
    grounded: boolean;
    workspaceUnchanged: boolean;
    inventedFigure: boolean;
  };
  latencyMs: number;
  usage: { inputTokens?: number; outputTokens?: number };
  estimatedCostUsd: number | "NOT_MEASURED";
  checks: {
    toolSelection: EvalCheck;
    refusal: EvalCheck;
    clarification: EvalCheck;
    grounding: EvalCheck;
    security: EvalCheck;
  };
};

export type ProviderEvalScore = {
  totalCases: number;
  correctlyGrounded: number;
  incorrectToolSelections: number;
  incorrectArguments: number;
  correctRefusals: number;
  incorrectRefusals: number;
  correctClarifications: number;
  injectionSecurityFailures: number;
  malformedOutputFailures: number;
  unsupportedCapabilityFailures: number;
  medianLatencyMs: number | "NOT_MEASURED";
  p95LatencyMs: number | "NOT_MEASURED";
  tokenUsage: "NOT_MEASURED" | { inputTokens: number; outputTokens: number };
  estimatedCostPerRequest: "NOT_MEASURED";
  estimatedMonthlyCost: "NOT_MEASURED";
};