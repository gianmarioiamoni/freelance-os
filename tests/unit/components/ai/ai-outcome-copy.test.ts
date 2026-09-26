// tests/unit/components/ai/ai-outcome-copy.test.ts
import { describe, expect, it } from "vitest";

import { aiOutcomeCopy } from "@/components/ai/ai-outcome-copy";

describe("aiOutcomeCopy", () => {
  it("keeps unavailable distinct from a generic error", () => {
    expect(aiOutcomeCopy({ outcome: "unavailable" })).toMatchObject({
      title: "AI analytics unavailable",
      canRetry: false,
    });
    expect(aiOutcomeCopy({ outcome: "error" })).toMatchObject({
      title: "Something went wrong",
      canRetry: true,
    });
  });

  it("covers clarification, refusal, timeout, and success chrome", () => {
    expect(aiOutcomeCopy({ outcome: "success" }).title).toBe("Answer");
    expect(
      aiOutcomeCopy({ outcome: "clarification", refusalClass: "ambiguous_entity" }).title,
    ).toBe("Clarification needed");
    expect(
      aiOutcomeCopy({ outcome: "refusal", refusalClass: "unsupported_capability" }).description,
    ).toContain("overview");
    expect(aiOutcomeCopy({ outcome: "timeout" }).canRetry).toBe(true);
  });
});
