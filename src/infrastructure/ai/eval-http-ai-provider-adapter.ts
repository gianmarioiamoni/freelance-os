// src/infrastructure/ai/eval-http-ai-provider-adapter.ts
import type {
  AiAdapterRequest,
  AiAdapterResult,
  AiProviderAdapter,
  AiToolCall,
} from "@/application/ai/ai-provider-port";

export const AI_EVAL_ENABLED_ENV = "AI_EVAL_ENABLED";

export type EvalHttpProviderOptions = {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  providerId?: string;
  fetchImpl?: typeof fetch;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseArgs(raw: string | undefined): unknown {
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Eval-only OpenAI-compatible HTTP adapter.
 * Never import this from the production Server Action resolver.
 */
export function createEvalHttpAiProviderAdapter(
  options: EvalHttpProviderOptions,
): AiProviderAdapter {
  const providerId = options.providerId ?? "eval-http";
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async complete(request: AiAdapterRequest): Promise<AiAdapterResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), request.timeoutMs);

      try {
        const response = await fetchImpl(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({
            model: options.modelId,
            temperature: 0,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.user },
            ],
            tools: request.toolDescriptors.map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                  type: "object",
                  additionalProperties: false,
                  properties: Object.fromEntries(
                    tool.argumentKeys.map((key) => [key, { type: "string" }]),
                  ),
                },
              },
            })),
          }),
        });

        if (!response.ok) {
          return { status: "error", code: `http_${response.status}`, providerId, modelId: options.modelId };
        }

        const payload = (await response.json()) as ChatCompletionResponse;
        const usage = {
          inputTokens: payload.usage?.prompt_tokens,
          outputTokens: payload.usage?.completion_tokens,
        };
        const message = payload.choices?.[0]?.message;
        const rawCalls = message?.tool_calls ?? [];
        const toolCalls: AiToolCall[] = rawCalls
          .filter((call) => typeof call.function?.name === "string" && call.function.name.length > 0)
          .map((call) => ({
            name: call.function?.name ?? "",
            args: parseArgs(call.function?.arguments),
          }));

        if (toolCalls.length > 0) {
          return {
            status: "tool_calls",
            toolCalls,
            usage,
            providerId,
            modelId: options.modelId,
          };
        }

        const text = message?.content?.trim() ?? "";
        return {
          status: "message",
          message: text,
          usage,
          providerId,
          modelId: options.modelId,
        };
      } catch (error) {
        if (isRecord(error) && error.name === "AbortError") {
          return { status: "timeout", providerId, modelId: options.modelId };
        }
        return { status: "error", code: "eval_http_error", providerId, modelId: options.modelId };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}