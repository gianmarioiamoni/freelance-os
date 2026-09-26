// src/infrastructure/ai/eval-anthropic-ai-provider-adapter.ts
import type {
  AiAdapterRequest,
  AiAdapterResult,
  AiProviderAdapter,
  AiToolCall,
} from "@/application/ai/ai-provider-port";
import { providerArgumentSchema } from "@/application/ai/provider-period-schema";

export type EvalAnthropicProviderOptions = {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  providerId?: string;
  fetchImpl?: typeof fetch;
};

type AnthropicContentBlock = {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
};

type AnthropicMessageResponse = {
  content?: AnthropicContentBlock[];
  usage?: { input_tokens?: number; output_tokens?: number };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Eval-only Anthropic Messages adapter.
 * Maps client `tool_use` onto the certified port. Never import from the production resolver.
 * Do not attach Anthropic server tools.
 */
export function createEvalAnthropicAiProviderAdapter(
  options: EvalAnthropicProviderOptions,
): AiProviderAdapter {
  const providerId = options.providerId ?? "eval-anthropic";
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async complete(request: AiAdapterRequest): Promise<AiAdapterResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), request.timeoutMs);

      try {
        const response = await fetchImpl(`${options.baseUrl.replace(/\/$/, "")}/messages`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            "x-api-key": options.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: options.modelId,
            max_tokens: 1024,
            temperature: 0,
            system: request.system,
            messages: [{ role: "user", content: request.user }],
            tools: request.toolDescriptors.map((tool) => ({
              name: tool.name,
              description: tool.description,
              input_schema: providerArgumentSchema(tool.argumentKeys),
            })),
          }),
        });

        if (!response.ok) {
          return { status: "error", code: `http_${response.status}`, providerId, modelId: options.modelId };
        }

        const payload = (await response.json()) as AnthropicMessageResponse;
        const usage = {
          inputTokens: payload.usage?.input_tokens,
          outputTokens: payload.usage?.output_tokens,
        };
        const blocks = payload.content ?? [];
        const toolCalls: AiToolCall[] = blocks
          .filter((block) => block.type === "tool_use" && typeof block.name === "string" && block.name.length > 0)
          .map((block) => ({
            name: block.name ?? "",
            args: block.input ?? {},
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

        const text = blocks
          .filter((block) => block.type === "text" && typeof block.text === "string")
          .map((block) => block.text?.trim() ?? "")
          .filter((part) => part.length > 0)
          .join("\n")
          .trim();

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
        return { status: "error", code: "eval_anthropic_error", providerId, modelId: options.modelId };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
