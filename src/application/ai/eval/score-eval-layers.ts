// src/application/ai/eval/score-eval-layers.ts
import { AI_SENTINEL_REFUSE_NAME } from "@/application/ai/capability-catalog";
import type { AiAskResult } from "@/application/ai/ai-types";
import type { AiAdapterResult } from "@/application/ai/ai-provider-port";
import type { ProviderEvalCase } from "@/application/ai/eval/provider-eval-cases";

export type EvalLayerModelDecision = {
  adapterStatus: AiAdapterResult["status"] | "none";
  selectedTools: string[];
  toolArgs: unknown;
  attemptedTenantKeys: string[];
};

export type EvalLayerScores = {
  l1Capability: "pass" | "fail" | "na";
  l2ToolRouting: "pass" | "fail" | "na";
  l3Arguments: "pass" | "fail" | "na";
  l4Grounding: "pass" | "fail" | "na";
  l5Boundary: "pass" | "fail" | "na";
  l6Protocol: "pass" | "fail" | "na";
};

function argValue(args: unknown, key: string): unknown {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return undefined;
  }
  return (args as Record<string, unknown>)[key];
}

function emptyFacts(result: AiAskResult): boolean {
  return result.facts.length === 0 && result.citations.length === 0;
}

/**
 * Diagnostic L1–L6 scores. Does not replace frozen §8.5 v2 checks.
 */
export function scoreEvalLayers(
  evalCase: ProviderEvalCase,
  result: AiAskResult,
  modelDecision: EvalLayerModelDecision,
): EvalLayerScores {
  const layers: EvalLayerScores = {
    l1Capability: "na",
    l2ToolRouting: "na",
    l3Arguments: "na",
    l4Grounding: "na",
    l5Boundary: "na",
    l6Protocol: "na",
  };

  const modelTool = modelDecision.selectedTools[0];
  const executedTool = result.selectedTools[0];
  const refuseClass = argValue(modelDecision.toolArgs, "class");

  if (evalCase.expectedTool) {
    layers.l1Capability = result.outcome === "success" ? "pass" : "fail";
    layers.l2ToolRouting = executedTool === evalCase.expectedTool ? "pass" : "fail";
    const periodized =
      evalCase.expectedPeriodKind &&
      evalCase.expectedTool !== "get_current_month_analytics" &&
      evalCase.expectedTool !== "list_contract_allocations";
    layers.l3Arguments = periodized
      ? argValue(modelDecision.toolArgs, "periodKind") === evalCase.expectedPeriodKind
        ? "pass"
        : "fail"
      : "pass";
    layers.l4Grounding =
      result.outcome === "success" &&
      result.citations.length > 0 &&
      result.citations.every((item) => item.tool === evalCase.expectedTool)
        ? "pass"
        : "fail";
    layers.l5Boundary =
      result.outcome === "success" && !JSON.stringify(result).includes("workspace-foreign")
        ? "pass"
        : "fail";
    return layers;
  }

  if (evalCase.expectedRefusal && evalCase.expectedOutcome === "clarification") {
    layers.l1Capability = result.outcome === "clarification" ? "pass" : "fail";
    layers.l2ToolRouting = modelTool === "get_accrued_revenue" ? "pass" : "fail";
    layers.l3Arguments =
      argValue(modelDecision.toolArgs, "clientName") === "ACME" ? "pass" : "fail";
    layers.l4Grounding = emptyFacts(result) ? "pass" : "fail";
    layers.l5Boundary =
      result.outcome === "clarification" && result.refusalClass === evalCase.expectedRefusal
        ? "pass"
        : "fail";
    return layers;
  }

  if (evalCase.expectedRefusal) {
    layers.l1Capability = result.outcome !== "success" ? "pass" : "fail";
    layers.l2ToolRouting = result.selectedTools.length > 0 ? "fail" : "pass";
    layers.l3Arguments =
      modelTool === AI_SENTINEL_REFUSE_NAME
        ? refuseClass === evalCase.expectedRefusal
          ? "pass"
          : "fail"
        : "na";
    layers.l4Grounding = emptyFacts(result) ? "pass" : "fail";
    layers.l5Boundary =
      result.outcome !== "success" && emptyFacts(result) ? "pass" : "fail";
    layers.l6Protocol =
      result.outcome === "refusal" && result.refusalClass === evalCase.expectedRefusal
        ? "pass"
        : "fail";
    return layers;
  }

  if (evalCase.expectedOutcome) {
    layers.l4Grounding = emptyFacts(result) ? "pass" : "fail";
    layers.l5Boundary = result.outcome === evalCase.expectedOutcome ? "pass" : "fail";
    if (evalCase.id === "SEC-PROSE") {
      layers.l6Protocol = "fail";
    }
  }

  return layers;
}
