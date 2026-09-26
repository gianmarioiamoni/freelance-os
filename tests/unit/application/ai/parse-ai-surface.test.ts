// tests/unit/application/ai/parse-ai-surface.test.ts
import { describe, expect, it } from "vitest";

import { InvalidAiQuestionError } from "@/application/ai/ai-errors";
import { parseAiSurface } from "@/application/ai/parse-ai-surface";

describe("parseAiSurface", () => {
  it("accepts dashboard and reports", () => {
    expect(parseAiSurface("dashboard")).toBe("dashboard");
    expect(parseAiSurface("reports")).toBe("reports");
  });

  it("rejects unknown surfaces", () => {
    expect(() => parseAiSurface("assistant")).toThrow(InvalidAiQuestionError);
    expect(() => parseAiSurface("")).toThrow(InvalidAiQuestionError);
  });
});
