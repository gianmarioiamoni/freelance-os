// tests/unit/infrastructure/ai/eval-http-adapter.test.ts
import { describe, expect, it } from "vitest";

import { createEvalHttpAiProviderAdapter } from "@/infrastructure/ai/eval-http-ai-provider-adapter";

const request = {
  system: "Select at most one allow-listed read tool, or refuse.",
  user: "Come sto andando questo mese?",
  toolDescriptors: [
    { name: "get_current_month_analytics", description: "Current month", argumentKeys: [] },
  ],
  timeoutMs: 1000,
  correlationId: "corr-eval",
};

describe("createEvalHttpAiProviderAdapter", () => {
  it("maps native tool_calls onto the certified adapter port", async () => {
    const adapter = createEvalHttpAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "gpt-4o-mini-2024-07-18",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  tool_calls: [
                    {
                      function: {
                        name: "get_current_month_analytics",
                        arguments: "{}",
                      },
                    },
                  ],
                },
              },
            ],
            usage: { prompt_tokens: 120, completion_tokens: 20 },
          }),
          { status: 200 },
        ),
    });

    await expect(adapter.complete(request)).resolves.toMatchObject({
      status: "tool_calls",
      providerId: "eval-http",
      modelId: "gpt-4o-mini-2024-07-18",
      toolCalls: [{ name: "get_current_month_analytics", args: {} }],
      usage: { inputTokens: 120, outputTokens: 20 },
    });
  });

  it("maps HTTP failure and abort onto structured adapter results", async () => {
    const httpError = createEvalHttpAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "gpt-4o-mini-2024-07-18",
      fetchImpl: async () => new Response("no", { status: 503 }),
    });
    await expect(httpError.complete(request)).resolves.toMatchObject({
      status: "error",
      code: "http_503",
    });

    const timeout = createEvalHttpAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "gpt-4o-mini-2024-07-18",
      fetchImpl: async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      },
    });
    await expect(timeout.complete(request)).resolves.toMatchObject({ status: "timeout" });
  });

  it("does not send workspace identity in the provider payload", async () => {
    let body = "";
    const adapter = createEvalHttpAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "gpt-4o-mini-2024-07-18",
      fetchImpl: async (_url, init) => {
        body = String(init?.body ?? "");
        return new Response(JSON.stringify({ choices: [{ message: { content: "no" } }] }), {
          status: 200,
        });
      },
    });

    await adapter.complete(request);
    expect(body).not.toMatch(/workspaceId|userId|"OWNER"/);
    expect(body).not.toMatch(/corr-eval/);
    expect(body).toMatch(/get_current_month_analytics/);
  });

  it("serializes periodKind as the application period enum", async () => {
    let body = "";
    const adapter = createEvalHttpAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "gpt-4o-mini-2024-07-18",
      fetchImpl: async (_url, init) => {
        body = String(init?.body ?? "");
        return new Response(JSON.stringify({ choices: [{ message: { content: "no" } }] }), {
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
        function: {
          parameters: {
            properties: { periodKind?: { type: string; enum?: string[] } };
            allOf?: unknown[];
          };
        };
      }>;
    };
    const parameters = payload.tools[0]?.function.parameters;

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

  it("maps a structural refusal onto the certified refusal status", async () => {
    const adapter = createEvalHttpAiProviderAdapter({
      baseUrl: "https://example.test/v1",
      apiKey: "eval-only",
      modelId: "gpt-4o-mini-2024-07-18",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              { message: { content: JSON.stringify({ refusal: "write_forbidden" }) } },
            ],
          }),
          { status: 200 },
        ),
    });

    await expect(adapter.complete(request)).resolves.toMatchObject({
      status: "refusal",
      refusalClass: "write_forbidden",
    });
  });
});
