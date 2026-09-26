// tests/unit/application/ai/analytics-isolation.test.ts
import { describe, expect, it } from "vitest";

import { createAnalyticsToolRegistry } from "@/application/ai/create-analytics-registry";
import { askWorkspaceQuestion } from "@/application/ai/orchestrator";
import { createMockAiProviderAdapter } from "@/infrastructure/ai/mock-ai-provider-adapter";

import {
  owningMembers,
  revenueFixture,
  stubAnalyticsServices,
  workspaceContext,
} from "./ai-test-helpers";

describe("workspace isolation", () => {
  it("returns only the trusted workspace figures when the model selects another workspace", async () => {
    const owned = workspaceContext();
    const captured: { context?: ReturnType<typeof workspaceContext> } = {};
    const services = stubAnalyticsServices(
      {
        getAccruedRevenue: async (context) => {
          captured.context = context;
          const published = context.workspaceId === "workspace-owned" ? 160 : 99999;
          return revenueFixture(
            {
              startDate: new Date("2026-09-01T00:00:00.000Z"),
              endDate: new Date("2026-09-26T00:00:00.000Z"),
            },
            published,
          );
        },
      },
      captured,
    );

    const result = await askWorkspaceQuestion(
      { question: "Quanto ho maturato questo mese?", surface: "reports", context: owned },
      {
        adapter: createMockAiProviderAdapter({
          script: {
            type: "tool_calls",
            calls: [
              {
                name: "get_accrued_revenue",
                args: {
                  periodKind: "month",
                  workspaceId: "workspace-foreign",
                },
              },
            ],
          },
        }),
        registry: createAnalyticsToolRegistry(services),
        members: owningMembers(owned),
        log: () => undefined,
      },
    );

    expect(result.outcome).toBe("success");
    expect(captured.context?.workspaceId).toBe("workspace-owned");
    expect(result.citations.some((citation) => citation.value === 160)).toBe(true);
    expect(result.citations.some((citation) => citation.value === 99999)).toBe(false);
    expect(JSON.stringify(result)).not.toContain("workspace-foreign");
  });
});
