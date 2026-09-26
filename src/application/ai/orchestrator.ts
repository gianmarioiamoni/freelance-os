// src/application/ai/orchestrator.ts
import { buildAiSystemInstructions } from "@/application/ai/ai-capability-boundary";
import { InvalidAiQuestionError } from "@/application/ai/ai-errors";
import type { AiProviderAdapter } from "@/application/ai/ai-provider-port";
import {
  AI_ADAPTER_TIMEOUT_MS,
  type AiAskInput,
  type AiAskResult,
} from "@/application/ai/ai-types";
import { assembleGroundedAnswer } from "@/application/ai/grounding/assemble-grounded-answer";
import { logAiRequest } from "@/application/ai/log-ai-request";
import { mapRefuseToolCall } from "@/application/ai/map-refuse-tool";
import { mapToolFailure } from "@/application/ai/map-tool-failure";
import { isAiRefusalClass } from "@/application/ai/normalize-adapter-refusal";
import { parseAiQuestion } from "@/application/ai/parse-ai-question";
import { parseAiSurface } from "@/application/ai/parse-ai-surface";
import { parseProviderEnvelope } from "@/application/ai/parse-provider-envelope";
import { requireAiMembership } from "@/application/ai/require-ai-membership";
import { sanitizeToolArgs } from "@/application/ai/sanitize-tool-args";
import type { AiToolRegistry } from "@/application/ai/tool-registry";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import type { WorkspaceMemberRepository } from "@/domain/repositories";

const SYSTEM_INSTRUCTIONS = buildAiSystemInstructions();

export type AiOrchestratorDeps = {
  adapter: AiProviderAdapter;
  registry: AiToolRegistry;
  members: WorkspaceMemberRepository;
  now?: () => number;
  createCorrelationId?: () => string;
  log?: typeof logAiRequest;
};

export type AiOrchestratorRequest = AiAskInput & {
  context: WorkspaceContext;
};

function emptyAnswer(): Pick<AiAskResult, "text" | "facts" | "citations" | "selectedTools"> {
  return { text: "", facts: [], citations: [], selectedTools: [] };
}

export async function askWorkspaceQuestion(
  request: AiOrchestratorRequest,
  deps: AiOrchestratorDeps,
): Promise<AiAskResult> {
  const started = (deps.now ?? Date.now)();
  const correlationId = deps.createCorrelationId?.() ?? crypto.randomUUID();
  const log = deps.log ?? logAiRequest;

  await requireAiMembership(request.context, deps.members);

  let question: string;
  try {
    question = parseAiQuestion(request.question);
    parseAiSurface(request.surface);
  } catch (error) {
    if (error instanceof InvalidAiQuestionError) {
      return finish(
        {
          outcome: "error",
          ...emptyAnswer(),
          correlationId,
          latencyMs: (deps.now ?? Date.now)() - started,
          providerId: "none",
          modelId: "none",
        },
        request,
        log,
      );
    }
    throw error;
  }

  const adapterResult = await deps.adapter.complete({
    system: SYSTEM_INSTRUCTIONS,
    user: question,
    toolDescriptors: deps.registry.descriptors(),
    timeoutMs: AI_ADAPTER_TIMEOUT_MS,
    correlationId,
  });

  const base = {
    correlationId,
    latencyMs: (deps.now ?? Date.now)() - started,
    providerId: adapterResult.providerId,
    modelId: adapterResult.modelId,
    usage: "usage" in adapterResult ? adapterResult.usage : undefined,
  };

  if (adapterResult.status === "unavailable") {
    return finish(
      {
        ...base,
        outcome: "unavailable",
        refusalClass: "provider_unavailable",
        ...emptyAnswer(),
      },
      request,
      log,
    );
  }

  if (adapterResult.status === "timeout") {
    return finish(
      { ...base, outcome: "timeout", ...emptyAnswer() },
      request,
      log,
    );
  }

  if (adapterResult.status === "error") {
    return finish({ ...base, outcome: "error", ...emptyAnswer() }, request, log);
  }

  if (adapterResult.status === "refusal") {
    if (!isAiRefusalClass(adapterResult.refusalClass)) {
      return finish({ ...base, outcome: "error", ...emptyAnswer() }, request, log);
    }
    return finish(
      {
        ...base,
        outcome: "refusal",
        refusalClass: adapterResult.refusalClass,
        ...emptyAnswer(),
      },
      request,
      log,
    );
  }

  const interpreted =
    adapterResult.status === "tool_calls"
      ? { kind: "tool_calls" as const, toolCalls: adapterResult.toolCalls }
      : parseProviderEnvelope(adapterResult.message);

  if (interpreted.kind === "malformed") {
    return finish({ ...base, outcome: "error", ...emptyAnswer() }, request, log);
  }

  if (interpreted.kind === "refusal") {
    return finish(
      {
        ...base,
        outcome: "refusal",
        refusalClass: interpreted.refusalClass,
        ...emptyAnswer(),
      },
      request,
      log,
    );
  }

  if (interpreted.kind === "message") {
    return finish({ ...base, outcome: "error", ...emptyAnswer() }, request, log);
  }

  if (interpreted.toolCalls.length !== 1) {
    return finish({ ...base, outcome: "error", ...emptyAnswer() }, request, log);
  }

  const [call] = interpreted.toolCalls;
  const tool = deps.registry.get(call.name);
  if (!tool) {
    return finish(
      {
        ...base,
        outcome: "refusal",
        refusalClass: "unsupported_capability",
        ...emptyAnswer(),
      },
      request,
      log,
    );
  }

  const sanitized = sanitizeToolArgs(call.args, tool.argumentKeys);

  const refuse = mapRefuseToolCall(tool.name, sanitized.args);
  if (refuse.kind === "error") {
    return finish({ ...base, outcome: "error", ...emptyAnswer() }, request, log);
  }
  if (refuse.kind === "refusal") {
    return finish(
      {
        ...base,
        outcome: "refusal",
        refusalClass: refuse.refusalClass,
        ...emptyAnswer(),
      },
      request,
      log,
    );
  }

  try {
    const result = await tool.execute(request.context, sanitized.args);
    const grounded = assembleGroundedAnswer(tool.name, result);
    return finish(
      {
        ...base,
        outcome: "success",
        text: grounded.text,
        facts: grounded.facts,
        citations: grounded.citations,
        selectedTools: [tool.name],
      },
      request,
      log,
    );
  } catch (error) {
    const mapped = mapToolFailure(error);
    if (mapped.kind === "authorization") {
      throw error instanceof UnauthorizedWorkspaceAccessError
        ? error
        : new UnauthorizedWorkspaceAccessError();
    }

    if (mapped.kind === "clarification") {
      return finish(
        {
          ...base,
          outcome: "clarification",
          refusalClass: mapped.refusalClass,
          ...emptyAnswer(),
        },
        request,
        log,
      );
    }

    return finish({ ...base, outcome: "error", ...emptyAnswer() }, request, log);
  }
}

function finish(
  result: AiAskResult,
  request: AiOrchestratorRequest,
  log: typeof logAiRequest,
): AiAskResult {
  log({
    correlationId: result.correlationId,
    workspaceId: request.context.workspaceId,
    userId: request.context.userId,
    surface: request.surface,
    selectedTools: result.selectedTools,
    latencyMs: result.latencyMs,
    providerId: result.providerId,
    modelId: result.modelId,
    outcome: result.outcome,
    refusalClass: result.refusalClass,
    usage: result.usage,
  });
  return result;
}
