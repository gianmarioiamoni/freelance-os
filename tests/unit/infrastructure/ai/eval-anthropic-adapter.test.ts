// tests/unit/infrastructure/ai/eval-anthropic-adapter.test.ts
import { describe, expect, it } from "vitest";

import { createEvalAnthropicAiProviderAdapter } from "@/infrastructure/ai/eval-anthropic-ai-provider-adapter";

const request = {
  system: "Select at most one allow-listed read tool, or refuse.",
  user: "Come sto andando questo mese?",
  toolDescriptors: [
    { name: "get_current_month_analytics", description: "Current month", argumentKeys: [] },
  ],
  timeoutMs: 1000,
  correlationId: "corr-eval",
};

describe("createEvalAnthropicAiProviderAdapter", () => {
  it("maps Messages tool_use onto the certified adapter port", async () => {
    const adapter = createEvalAnthropicAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "claude-haiku-4-5-20251001",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            content: [
              {
                type: "tool_use",
                name: "get_current_month_analytics",
                input: {},
              },
            ],
            usage: { input_tokens: 120, output_tokens: 20 },
          }),
          { status: 200 },
        ),
    });

    await expect(adapter.complete(request)).resolves.toMatchObject({
      status: "tool_calls",
      providerId: "eval-anthropic",
      modelId: "claude-haiku-4-5-20251001",
      toolCalls: [{ name: "get_current_month_analytics", args: {} }],
      usage: { inputTokens: 120, outputTokens: 20 },
    });
  });

  it("maps HTTP failure and abort onto structured adapter results", async () => {
    const httpError = createEvalAnthropicAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "claude-haiku-4-5-20251001",
      fetchImpl: async () => new Response("no", { status: 503 }),
    });
    await expect(httpError.complete(request)).resolves.toMatchObject({
      status: "error",
      code: "http_503",
    });

    const timeout = createEvalAnthropicAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "claude-haiku-4-5-20251001",
      fetchImpl: async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      },
    });
    await expect(timeout.complete(request)).resolves.toMatchObject({ status: "timeout" });
  });

  it("does not send workspace identity or server tools", async () => {
    let url = "";
    let headers: HeadersInit | undefined;
    let body = "";
    const adapter = createEvalAnthropicAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "claude-haiku-4-5-20251001",
      fetchImpl: async (input, init) => {
        url = String(input);
        headers = init?.headers;
        body = String(init?.body ?? "");
        return new Response(JSON.stringify({ content: [{ type: "text", text: "no" }] }), {
          status: 200,
        });
      },
    });

    await adapter.complete(request);
    expect(url).toBe("https://example.test/v1/messages");
    expect(JSON.stringify(headers)).toMatch(/anthropic-version/);
    expect(body).not.toMatch(/workspaceId|userId|"OWNER"/);
    expect(body).not.toMatch(/corr-eval/);
    expect(body).not.toMatch(/web_search|code_execution|server_tool/);
    expect(body).toMatch(/get_current_month_analytics/);
    expect(body).toMatch(/input_schema/);
  });

  it("serializes periodKind as the application period enum", async () => {
    let body = "";
    const adapter = createEvalAnthropicAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "claude-haiku-4-5-20251001",
      fetchImpl: async (_url, init) => {
        body = String(init?.body ?? "");
        return new Response(JSON.stringify({ content: [{ type: "text", text: "no" }] }), {
          status: 200,
        });
      },
    });

    await adapter.complete({
      ...request,
      toolDescriptors: [
        {
          name: "get_forecast_revenue",
          description: "Forecast Revenue for a certified current period. Null when the period is not current.",
          argumentKeys: ["periodKind", "startDate", "endDate", "clientId"],
        },
      ],
    });

    const payload = JSON.parse(body) as {
      tools: Array<{
        input_schema: {
          properties: { periodKind?: { type: string; enum?: string[] } };
          allOf?: unknown[];
        };
      }>;
    };
    const parameters = payload.tools[0]?.input_schema;

    expect(parameters?.properties.periodKind?.enum).toEqual([
      "today",
      "week",
      "month",
      "year",
      "custom",
    ]);
    expect(parameters?.properties.periodKind?.enum).not.toContain("current");
    expect(parameters?.allOf).toBeUndefined();
  });
});
