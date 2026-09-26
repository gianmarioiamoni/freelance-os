// tests/unit/application/ai/parse-ai-question.test.ts
import { describe, expect, it } from "vitest";

import { InvalidAiQuestionError } from "@/application/ai/ai-errors";
import { parseAiQuestion } from "@/application/ai/parse-ai-question";

describe("parseAiQuestion", () => {
  it("trims a valid question", () => {
    expect(parseAiQuestion("  Come sto andando questo mese?  ")).toBe(
      "Come sto andando questo mese?",
    );
  });

  it("rejects empty and oversized questions", () => {
    expect(() => parseAiQuestion("   ")).toThrow(InvalidAiQuestionError);
    expect(() => parseAiQuestion("x".repeat(2001))).toThrow(InvalidAiQuestionError);
  });
});
