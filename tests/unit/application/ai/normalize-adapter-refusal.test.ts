// tests/unit/application/ai/normalize-adapter-refusal.test.ts
import { describe, expect, it } from "vitest";

import {
  mapAdapterTextOutcome,
  normalizeRefusalCandidate,
} from "@/application/ai/normalize-adapter-refusal";

describe("normalizeRefusalCandidate", () => {
  it("accepts a controlled class and a class-only envelope", () => {
    expect(normalizeRefusalCandidate("unsupported_capability")).toEqual({
      kind: "refusal",
      refusalClass: "unsupported_capability",
    });
    expect(normalizeRefusalCandidate({ refusal: "write_forbidden" })).toEqual({
      kind: "refusal",
      refusalClass: "write_forbidden",
    });
    expect(normalizeRefusalCandidate(JSON.stringify({ refusal: "injection" }))).toEqual({
      kind: "refusal",
      refusalClass: "injection",
    });
  });

  it("treats unknown classes, extra keys, and broken refusal JSON as malformed", () => {
    expect(normalizeRefusalCandidate({ refusal: "not_a_class" })).toEqual({
      kind: "malformed_refusal",
    });
    expect(
      normalizeRefusalCandidate({ refusal: "unsupported_capability", amount: 99999 }),
    ).toEqual({ kind: "malformed_refusal" });
    expect(normalizeRefusalCandidate('{ "refusal": ')).toEqual({ kind: "malformed_refusal" });
  });

  it("does not parse prose as a refusal", () => {
    expect(normalizeRefusalCandidate("I cannot answer overdue invoices.")).toEqual({
      kind: "not_refusal",
    });
    expect(normalizeRefusalCandidate("Hai maturato 99999 EUR.")).toEqual({
      kind: "not_refusal",
    });
  });
});

describe("mapAdapterTextOutcome", () => {
  const meta = { providerId: "eval", modelId: "fixture" };

  it("maps a structural refusal without carrying facts", () => {
    expect(mapAdapterTextOutcome('{"refusal":"unsupported_capability"}', meta)).toEqual({
      status: "refusal",
      refusalClass: "unsupported_capability",
      providerId: "eval",
      modelId: "fixture",
    });
    expect(mapAdapterTextOutcome('{"refusal":"unsupported_capability"}', meta)).not.toHaveProperty(
      "message",
    );
  });

  it("maps a malformed refusal to error, not success", () => {
    expect(mapAdapterTextOutcome('{"refusal":"nope"}', meta)).toEqual({
      status: "error",
      code: "malformed_refusal",
      providerId: "eval",
      modelId: "fixture",
    });
  });

  it("leaves unstructured prose as a message", () => {
    expect(mapAdapterTextOutcome("Hai maturato 99999 EUR.", meta)).toMatchObject({
      status: "message",
      message: "Hai maturato 99999 EUR.",
    });
  });
});
