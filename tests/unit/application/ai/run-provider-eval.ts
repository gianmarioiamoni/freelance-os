// tests/unit/application/ai/run-provider-eval.ts
import { FORBIDDEN_TOOL_ARG_KEYS } from "@/application/ai/ai-types";
import type { AiAdapterResult, AiProviderAdapter } from "@/application/ai/ai-provider-port";
import { createAnalyticsToolRegistry } from "@/application/ai/create-analytics-registry";
import type { ProviderEvalCase } from "@/application/ai/eval/provider-eval-cases";
import type { ProviderEvalRecord } from "@/application/ai/eval/provider-eval-types";
import { scoreEvalCase } from "@/application/ai/eval/score-eval-case";
import { scoreEvalLayers } from "@/application/ai/eval/score-eval-layers";
import {
  scriptForAnalyticsEvalCase,
  scriptForBoundaryEvalCase,
} from "@/application/ai/eval/scripted-eval-adapter";
import { askWorkspaceQuestion } from "@/application/ai/orchestrator";
import { createMockAiProviderAdapter } from "@/infrastructure/ai/mock-ai-provider-adapter";
import { createNullAiProviderAdapter } from "@/infrastructure/ai/null-ai-provider-adapter";

import {
  clientRecord,
  owningMembers,
  stubAnalyticsServices,
  workspaceContext,
} from "./ai-test-helpers";

function tenantKeysFrom(args: unknown): string[] {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return [];
  }
  return Object.keys(args).filter((key) =>
    (FORBIDDEN_TOOL_ARG_KEYS as readonly string[]).includes(key),
  );
}

export function adapterForEvalCase(
  evalCase: ProviderEvalCase,
  live?: AiProviderAdapter,
): AiProviderAdapter {
  if (live && evalCase.family === "canonical" && evalCase.id !== "RF-09") {
    return live;
  }
  if (evalCase.id === "RF-09") {
    return createNullAiProviderAdapter();
  }
  if (evalCase.family === "boundary") {
    return createMockAiProviderAdapter({ script: scriptForBoundaryEvalCase(evalCase.id) });
  }
  return createMockAiProviderAdapter({ script: scriptForAnalyticsEvalCase(evalCase.id) });
}

export async function runProviderEvalCase(
  evalCase: ProviderEvalCase,
  live?: AiProviderAdapter,
): Promise<ProviderEvalRecord> {
  const context = workspaceContext();
  const captured: { context?: ReturnType<typeof workspaceContext>; periodKind?: string } = {};
  const defaults = stubAnalyticsServices({}, captured);
  const services = stubAnalyticsServices(
    {
      resolvePeriod: (request, timezone, now) => {
        captured.periodKind = request.kind;
        return defaults.resolvePeriod(request, timezone, now);
      },
      listClients: async () => [
        clientRecord(),
        clientRecord({ id: "client-a", companyName: "ACME" }),
        clientRecord({ id: "client-b", companyName: "ACME" }),
      ],
      getForecastRevenue: async (_context, period) => {
        if (period.startDate.getUTCFullYear() === 2025) {
          return null;
        }
        return {
          period,
          timezone: "Europe/Rome",
          elapsedPeriod: 26,
          totalPeriod: 26,
          byCurrency: [{ currency: "EUR", unrounded: 160, published: 160 }],
          byContract: [],
        };
      },
    },
    captured,
  );

  let lastResult: AiAdapterResult | undefined;
  const adapter: AiProviderAdapter = {
    async complete(request) {
      lastResult = await adapterForEvalCase(evalCase, live).complete(request);
      return lastResult;
    },
  };

  const started = Date.now();
  const result = await askWorkspaceQuestion(
    { question: evalCase.question, surface: "dashboard", context },
    {
      adapter,
      registry: createAnalyticsToolRegistry(services),
      members: owningMembers(context),
      createCorrelationId: () => `eval-${evalCase.id}`,
      log: () => undefined,
    },
  );

  const firstCall = lastResult && lastResult.status === "tool_calls" ? lastResult.toolCalls[0] : undefined;
  const serialized = JSON.stringify(result);

  return {
    id: evalCase.id,
    family: evalCase.family,
    input: evalCase.question,
    modelDecision: {
      adapterStatus: lastResult?.status ?? "none",
      selectedTools:
        lastResult && lastResult.status === "tool_calls"
          ? lastResult.toolCalls.map((call) => call.name)
          : [],
      toolArgs: firstCall?.args,
      attemptedTenantKeys: tenantKeysFrom(firstCall?.args),
    },
    applicationTruth: {
      outcome: result.outcome,
      refusalClass: result.refusalClass,
      selectedTools: result.selectedTools,
      citationCount: result.citations.length,
      grounded: result.outcome === "success" && result.citations.length > 0,
      workspaceUnchanged:
        captured.context === undefined || captured.context.workspaceId === context.workspaceId,
      inventedFigure: serialized.includes("99999"),
    },
    latencyMs: Date.now() - started,
    usage: lastResult && "usage" in lastResult && lastResult.usage ? lastResult.usage : {},
    estimatedCostUsd: "NOT_MEASURED",
    checks: scoreEvalCase(evalCase, result),
    layers: scoreEvalLayers(evalCase, result, {
      adapterStatus: lastResult?.status ?? "none",
      selectedTools:
        lastResult && lastResult.status === "tool_calls"
          ? lastResult.toolCalls.map((call) => call.name)
          : [],
      toolArgs: firstCall?.args,
      attemptedTenantKeys: tenantKeysFrom(firstCall?.args),
    }),
  };
}