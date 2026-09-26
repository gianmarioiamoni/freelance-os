import { writeFileSync } from "node:fs";

import { AI_ADAPTER_TIMEOUT_MS } from "@/application/ai/ai-types";
import { PROVIDER_EVAL_CASES } from "@/application/ai/eval/provider-eval-cases";
import { scoreProviderEval } from "@/application/ai/eval/score-provider-eval";
import type { AiAdapterResult, AiProviderAdapter } from "@/application/ai/ai-provider-port";
import { resolveAskProviderAdapter } from "@/features/ai/resolve-ask-provider-adapter";
import { createEvalAnthropicAiProviderAdapter } from "@/infrastructure/ai/eval-anthropic-ai-provider-adapter";

import { runProviderEvalCase } from "../tests/unit/application/ai/run-provider-eval";

const A2_MODEL = "claude-haiku-4-5-20251001";
const A2_BASE_URL = "https://api.anthropic.com/v1";
const A2_INPUT_USD_PER_M = 1;
const A2_OUTPUT_USD_PER_M = 5;

function costUsd(input?: number, output?: number): number | "NOT_MEASURED" {
  if (input === undefined && output === undefined) {
    return "NOT_MEASURED";
  }
  return ((input ?? 0) * A2_INPUT_USD_PER_M + (output ?? 0) * A2_OUTPUT_USD_PER_M) / 1_000_000;
}

function isAnthropicEvalKey(value: string): boolean {
  return value.startsWith("sk-ant-");
}

async function main(): Promise<void> {
  const enabled = process.env.AI_EVAL_ENABLED;
  const baseUrl = process.env.AI_EVAL_BASE_URL;
  const modelId = process.env.AI_EVAL_MODEL;
  const apiKey = process.env.AI_EVAL_API_KEY;
  const e2eMock = process.env.AI_E2E_MOCK;

  if (enabled !== "true") {
    throw new Error("AI_EVAL_ENABLED must be true");
  }
  if (e2eMock === "true") {
    throw new Error("AI_E2E_MOCK must be unset for live evaluation");
  }
  if (baseUrl !== A2_BASE_URL) {
    throw new Error("AI_EVAL_BASE_URL must be the A2 Anthropic Messages endpoint");
  }
  if (modelId !== A2_MODEL) {
    throw new Error("AI_EVAL_MODEL must be claude-haiku-4-5-20251001");
  }
  if (!apiKey) {
    throw new Error("AI_EVAL_API_KEY is missing");
  }
  if (!isAnthropicEvalKey(apiKey)) {
    throw new Error("AI_EVAL_API_KEY is not an Anthropic eval key");
  }
  if (AI_ADAPTER_TIMEOUT_MS !== 8_000) {
    throw new Error("timeout must remain 8s");
  }

  const production = await resolveAskProviderAdapter({}).complete({
    system: "preflight",
    user: "preflight",
    toolDescriptors: [],
    timeoutMs: 1000,
    correlationId: "preflight",
  });
  if (production.status !== "unavailable" || production.providerId !== "null") {
    throw new Error("production resolver is not Null");
  }

  const messagesByCase = new Map<string, string>();
  const inner = createEvalAnthropicAiProviderAdapter({
    baseUrl,
    apiKey,
    modelId,
    providerId: "anthropic",
  });
  const live: AiProviderAdapter = {
    async complete(request) {
      const result: AiAdapterResult = await inner.complete(request);
      if (result.status === "message") {
        messagesByCase.set(request.user, result.message);
      }
      return result;
    },
  };

  const records = [];
  for (const evalCase of PROVIDER_EVAL_CASES) {
    const record = await runProviderEvalCase(evalCase, live);
    record.estimatedCostUsd = costUsd(record.usage.inputTokens, record.usage.outputTokens);
    records.push(record);
    console.log(
      JSON.stringify({
        id: record.id,
        family: record.family,
        live: evalCase.family === "canonical" && evalCase.id !== "RF-09",
        adapter: record.modelDecision.adapterStatus,
        modelTools: record.modelDecision.selectedTools,
        args: record.modelDecision.toolArgs,
        tenantKeys: record.modelDecision.attemptedTenantKeys,
        outcome: record.applicationTruth.outcome,
        refusal: record.applicationTruth.refusalClass,
        appTools: record.applicationTruth.selectedTools,
        grounded: record.applicationTruth.grounded,
        workspaceUnchanged: record.applicationTruth.workspaceUnchanged,
        invented: record.applicationTruth.inventedFigure,
        citations: record.applicationTruth.citationCount,
        checks: record.checks,
        latencyMs: record.latencyMs,
        usage: record.usage,
        costUsd: record.estimatedCostUsd,
        hasMessage: messagesByCase.has(evalCase.question),
      }),
    );
  }

  const liveRecords = records.filter(
    (record) => record.family === "canonical" && record.id !== "RF-09",
  );
  const payload = {
    executedAt: new Date().toISOString(),
    provider: "anthropic",
    modelId,
    timeoutMs: AI_ADAPTER_TIMEOUT_MS,
    productionResolver: { status: production.status, providerId: production.providerId },
    all: scoreProviderEval(records),
    liveCanonical: scoreProviderEval(liveRecords),
    liveCostUsd: liveRecords.reduce((sum, record) => {
      return sum + (typeof record.estimatedCostUsd === "number" ? record.estimatedCostUsd : 0);
    }, 0),
    records: records.map((record) => ({
      id: record.id,
      family: record.family,
      input: record.input,
      modelDecision: record.modelDecision,
      applicationTruth: record.applicationTruth,
      checks: record.checks,
      latencyMs: record.latencyMs,
      usage: record.usage,
      estimatedCostUsd: record.estimatedCostUsd,
      modelMessage: messagesByCase.get(record.input),
    })),
  };

  writeFileSync("/tmp/a2-live-eval.json", JSON.stringify(payload, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "eval failed";
  console.error(message);
  process.exitCode = 1;
});
