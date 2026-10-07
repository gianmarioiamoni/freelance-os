// tests/unit/components/ai/ai-ask-box-boundary.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI ask-box client boundary", () => {
  it("does not send workspace identity from the browser", () => {
    const files = [
      "src/components/ai/AnalyticsAskBox.tsx",
      "src/components/ai/GuidedPromptList.tsx",
      "src/components/ai/AiOutcomePanel.tsx",
      "src/features/ai/create-ask-action-input.ts",
      "src/app/(app)/assistant/page.tsx",
    ];

    for (const filePath of files) {
      expect(source(filePath), filePath).not.toMatch(/workspaceId|membership/);
      expect(source(filePath), filePath).not.toMatch(/["']role["']\s*:/);
    }

    const askBox = source("src/components/ai/AnalyticsAskBox.tsx");
    expect(askBox).toContain("askWorkspaceQuestionAction");
    expect(askBox).toContain("createAskActionInput");
    expect(askBox).toContain('htmlFor={questionId}');
    expect(askBox).toContain("Asking…");
    expect(askBox).toContain("disabled={isSubmitting}");
  });

  it("renders structured E02 fields and does not display raw provider prose", () => {
    const panel = source("src/components/ai/AiOutcomePanel.tsx");
    expect(panel).toContain("result.text");
    expect(panel).toContain("result.facts");
    expect(panel).not.toMatch(/providerMessage|rawProse|adapter\.message/);
    expect(panel).toContain("formatFactForDisplay");
    expect(panel).toContain("formatMetricLabel");
  });
});
