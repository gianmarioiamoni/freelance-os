// tests/unit/features/ai/create-ask-action-input.test.ts
import { describe, expect, it } from "vitest";

import { createAskActionInput } from "@/features/ai/create-ask-action-input";

describe("createAskActionInput", () => {
  it("sends only the question and surface through the Server Action boundary", () => {
    const input = createAskActionInput("Come sto andando questo mese?", "dashboard");

    expect(input).toEqual({
      question: "Come sto andando questo mese?",
      surface: "dashboard",
    });
    expect(Object.keys(input)).toEqual(["question", "surface"]);
    expect(input).not.toHaveProperty("workspaceId");
    expect(input).not.toHaveProperty("membership");
    expect(input).not.toHaveProperty("role");
  });
});
