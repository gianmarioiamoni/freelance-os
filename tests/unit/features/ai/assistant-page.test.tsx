// @vitest-environment jsdom
// tests/unit/features/ai/assistant-page.test.tsx
import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AiAskResult } from "@/application/ai/ai-types";
import AssistantPage from "@/app/(app)/assistant/page";
import { AiOutcomePanel } from "@/components/ai/AiOutcomePanel";
import { visibleGuidedPrompts } from "@/features/ai/guided-prompt-catalog";

vi.mock("@/features/ai/ask-workspace-question-action", () => ({
  askWorkspaceQuestionAction: vi.fn(),
}));

function baseResult(
  overrides: Partial<AiAskResult> & Pick<AiAskResult, "outcome">,
): AiAskResult {
  return {
    refusalClass: undefined,
    text: "",
    facts: [],
    citations: [],
    selectedTools: [],
    correlationId: "corr-1",
    latencyMs: 1,
    providerId: "test",
    modelId: "test-model",
    ...overrides,
  };
}

describe("AI Assistant page", () => {
  it("renders heading, description, ask box, and prompt suggestions", () => {
    render(<AssistantPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "AI Assistant" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ask questions about this workspace's available analytics data, such as revenue, hours, and contracts.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Ask about your analytics",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Question")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask" })).toBeInTheDocument();

    for (const prompt of visibleGuidedPrompts()) {
      expect(
        screen.getByRole("button", { name: prompt.text }),
      ).toBeInTheDocument();
    }
  });

  it("reuses the existing AI ask surface without a second AI client path", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/(app)/assistant/page.tsx"),
      "utf8",
    );

    expect(source).toContain('AnalyticsAskBox surface="reports"');
    expect(source).toContain("@/components/ai/AnalyticsAskBox");
    expect(source).not.toMatch(/workspaceId|membership/);
    expect(source).not.toMatch(/askWorkspaceQuestion\(/);
    expect(source).not.toMatch(/surface=["']assistant["']/);
  });

  it("renders existing AI outcome states through AiOutcomePanel", () => {
    const { rerender } = render(
      <AiOutcomePanel
        result={baseResult({
          outcome: "success",
          text: "Accrued this month is stable.",
          facts: [{ metric: "accruedRevenue", value: 100, currency: "EUR" }],
        })}
      />,
    );

    expect(screen.getByLabelText("AI answer")).toHaveTextContent(
      "Accrued this month is stable.",
    );

    rerender(
      <AiOutcomePanel
        result={baseResult({
          outcome: "unavailable",
          refusalClass: "provider_unavailable",
        })}
      />,
    );
    expect(screen.getByText("AI analytics unavailable")).toBeInTheDocument();

    rerender(
      <AiOutcomePanel
        result={baseResult({
          outcome: "clarification",
          refusalClass: "invalid_period",
        })}
      />,
    );
    expect(screen.getByText("Clarification needed")).toBeInTheDocument();

    rerender(
      <AiOutcomePanel
        result={baseResult({
          outcome: "refusal",
          refusalClass: "unsupported_capability",
        })}
      />,
    );
    expect(screen.getByText("Not supported")).toBeInTheDocument();

    rerender(
      <AiOutcomePanel
        result={baseResult({ outcome: "error" })}
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
