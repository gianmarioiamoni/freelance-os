// tests/unit/application/ai/parse-provider-envelope.test.ts
import { describe, expect, it } from "vitest";

import { parseProviderEnvelope } from "@/application/ai/parse-provider-envelope";

describe("parseProviderEnvelope", () => {
  it("parses a JSON tool plan", () => {
    expect(
      parseProviderEnvelope(
        JSON.stringify({ toolCalls: [{ name: "get_current_month_analytics", args: {} }] }),
      ),
    ).toEqual({
      kind: "tool_calls",
      toolCalls: [{ name: "get_current_month_analytics", args: {} }],
    });
  });

  it("parses a refusal envelope", () => {
    expect(parseProviderEnvelope(JSON.stringify({ refusal: "write_forbidden" }))).toEqual({
      kind: "refusal",
      refusalClass: "write_forbidden",
    });
  });

  it("treats a refusal envelope with facts as malformed", () => {
    expect(
      parseProviderEnvelope(JSON.stringify({ refusal: "unsupported_capability", amount: 99999 })),
    ).toEqual({ kind: "malformed" });
  });

  it("treats empty output as malformed", () => {
    expect(parseProviderEnvelope("")).toEqual({ kind: "malformed" });
    expect(parseProviderEnvelope("{")).toEqual({ kind: "malformed" });
  });

  it("treats non-JSON prose as a message candidate", () => {
    expect(parseProviderEnvelope("plain text")).toEqual({
      kind: "message",
      message: "plain text",
    });
  });
});
