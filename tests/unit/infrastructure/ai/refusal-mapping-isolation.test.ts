// tests/unit/infrastructure/ai/refusal-mapping-isolation.test.ts
import { describe, expect, it } from "vitest";

import type { AiAdapterRequest } from "@/application/ai/ai-provider-port";
import { createEvalAnthropicAiProviderAdapter } from "@/infrastructure/ai/eval-anthropic-ai-provider-adapter";
import { createEvalHttpAiProviderAdapter } from "@/infrastructure/ai/eval-http-ai-provider-adapter";

const request: AiAdapterRequest = {
  system: "system",
  user: "Quali fatture sono scadute?",
  toolDescriptors: [],
  timeoutMs: 1000,
  correlationId: "corr-isolation",
};

function openAiAdapter(body: unknown) {
  return createEvalHttpAiProviderAdapter({
    baseUrl: "https://example.test/v1",
    apiKey: "eval-only",
    modelId: "gpt-4o-mini-2024-07-18",
    fetchImpl: async () => new Response(JSON.stringify(body), { status: 200 }),
  });
}

function anthropicAdapter(body: unknown) {
  return createEvalAnthropicAiProviderAdapter({
    baseUrl: "https://example.test/v1",
    apiKey: "eval-only",
    modelId: "claude-haiku-4-5-20251001",
    fetchImpl: async () => new Response(JSON.stringify(body), { status: 200 }),
  });
}

describe("provider refusal mapping isolation", () => {
  it("maps A1 and A2 structural refusals onto the same internal outcome", async () => {
    const envelope = JSON.stringify({ refusal: "unsupported_capability" });
    const [a1, a2] = await Promise.all([
      openAiAdapter({
        choices: [{ message: { content: envelope } }],
      }).complete(request),
      anthropicAdapter({
        content: [{ type: "text", text: envelope }],
      }).complete(request),
    ]);

    expect(a1).toMatchObject({
      status: "refusal",
      refusalClass: "unsupported_capability",
    });
    expect(a2).toMatchObject({
      status: "refusal",
      refusalClass: "unsupported_capability",
    });
    expect(a1.status).toBe(a2.status);
    expect(a1.status === "refusal" && a2.status === "refusal" ? a1.refusalClass : null).toBe(
      a2.status === "refusal" ? a2.refusalClass : undefined,
    );
    expect(a1).not.toHaveProperty("message");
    expect(a2).not.toHaveProperty("message");
  });

  it("maps A1 native class and A2 text class onto the same refusal", async () => {
    const [a1, a2] = await Promise.all([
      openAiAdapter({
        choices: [{ message: { refusal: "write_forbidden", content: null } }],
      }).complete(request),
      anthropicAdapter({
        content: [{ type: "text", text: "write_forbidden" }],
      }).complete(request),
    ]);

    expect(a1).toMatchObject({ status: "refusal", refusalClass: "write_forbidden" });
    expect(a2).toMatchObject({ status: "refusal", refusalClass: "write_forbidden" });
  });

  it("maps malformed refusals from both adapters to error", async () => {
    const broken = '{"refusal":"not_a_class"}';
    const [a1, a2] = await Promise.all([
      openAiAdapter({ choices: [{ message: { content: broken } }] }).complete(request),
      anthropicAdapter({ content: [{ type: "text", text: broken }] }).complete(request),
    ]);

    expect(a1).toMatchObject({ status: "error", code: "malformed_refusal" });
    expect(a2).toMatchObject({ status: "error", code: "malformed_refusal" });
  });

  it("does not treat provider prose as a typed refusal", async () => {
    const prose = "I cannot list overdue invoices.";
    const [a1, a2] = await Promise.all([
      openAiAdapter({ choices: [{ message: { content: prose } }] }).complete(request),
      anthropicAdapter({ content: [{ type: "text", text: prose }] }).complete(request),
    ]);

    expect(a1).toMatchObject({ status: "message", message: prose });
    expect(a2).toMatchObject({ status: "message", message: prose });
  });
});
