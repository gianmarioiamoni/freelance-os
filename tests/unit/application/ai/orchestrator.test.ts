// tests/unit/application/ai/orchestrator.test.ts
import { describe, expect, it, vi } from "vitest";

import { createFoundationToolRegistry } from "@/application/ai/create-foundation-registry";
import { askWorkspaceQuestion } from "@/application/ai/orchestrator";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import { createMockAiProviderAdapter } from "@/infrastructure/ai/mock-ai-provider-adapter";
import { createNullAiProviderAdapter } from "@/infrastructure/ai/null-ai-provider-adapter";

import {
  membersLookingUp,
  owningMembers,
  stubCurrentMonthAnalytics,
  workspaceContext,
} from "./ai-test-helpers";

function ask(
  overrides: {
    question?: string;
    surface?: "dashboard" | "reports";
    adapter?: ReturnType<typeof createMockAiProviderAdapter>;
    context?: ReturnType<typeof workspaceContext>;
    members?: ReturnType<typeof owningMembers>;
    analytics?: ReturnType<typeof stubCurrentMonthAnalytics>;
    captured?: { context?: ReturnType<typeof workspaceContext> };
  } = {},
) {
  const captured = overrides.captured ?? {};
  const context = overrides.context ?? workspaceContext();
  const analytics = overrides.analytics ?? stubCurrentMonthAnalytics(captured);

  return askWorkspaceQuestion(
    {
      question: overrides.question ?? "Come sto andando questo mese?",
      surface: overrides.surface ?? "dashboard",
      context,
    },
    {
      adapter:
        overrides.adapter ??
        createMockAiProviderAdapter({
          script: {
            type: "tool_calls",
            calls: [{ name: "get_current_month_analytics", args: {} }],
          },
        }),
      registry: createFoundationToolRegistry(analytics),
      members: overrides.members ?? owningMembers(context),
      createCorrelationId: () => "corr-test",
      log: () => undefined,
    },
  );
}

describe("askWorkspaceQuestion", () => {
  it("executes an allow-listed read and cites the tool result", async () => {
    const captured: { context?: ReturnType<typeof workspaceContext> } = {};
    const result = await ask({ captured });

    expect(result.outcome).toBe("success");
    expect(result.selectedTools).toEqual(["get_current_month_analytics"]);
    expect(result.citations[0]?.tool).toBe("get_current_month_analytics");
    expect(result.citations.some((citation) => citation.metric === "accrued" && citation.value === 160)).toBe(true);
    expect(captured.context).toEqual(workspaceContext());
  });

  it("does not treat ungrounded provider prose as success", async () => {
    const result = await ask({
      adapter: createMockAiProviderAdapter({
        script: { type: "message", message: "Hai maturato 99999 EUR questo mese." },
      }),
    });

    expect(result.outcome).toBe("error");
    expect(result.selectedTools).toEqual([]);
    expect(result.citations).toEqual([]);
    expect(result.text).not.toContain("99999");
  });

  it("maps a tool failure to a generic error without leaking internals", async () => {
    const result = await ask({
      analytics: {
        async getCurrentMonthAnalytics() {
          throw new Error("PrismaClientKnownRequestError at analytics-repository.ts:88");
        },
      },
    });

    expect(result.outcome).toBe("error");
    expect(result.text).toBe("");
    expect(JSON.stringify(result)).not.toContain("Prisma");
    expect(JSON.stringify(result)).not.toContain("analytics-repository");
  });

  it("ignores a provider-supplied workspaceId and keeps the session workspace", async () => {
    const captured: { context?: ReturnType<typeof workspaceContext> } = {};
    const context = workspaceContext();

    await ask({
      captured,
      context,
      adapter: createMockAiProviderAdapter({
        script: {
          type: "tool_calls",
          calls: [
            {
              name: "get_current_month_analytics",
              args: { workspaceId: "workspace-foreign", userId: "other" },
            },
          ],
        },
      }),
    });

    expect(captured.context?.workspaceId).toBe("workspace-owned");
    expect(captured.context?.userId).toBe("user-1");
  });

  it("refuses an unknown tool name", async () => {
    const result = await ask({
      adapter: createMockAiProviderAdapter({
        script: { type: "tool_calls", calls: [{ name: "execute_sql", args: {} }] },
      }),
    });

    expect(result.outcome).toBe("refusal");
    expect(result.refusalClass).toBe("unsupported_capability");
    expect(result.selectedTools).toEqual([]);
  });

  it("returns unavailable for the null provider", async () => {
    const result = await ask({ adapter: createNullAiProviderAdapter() });

    expect(result.outcome).toBe("unavailable");
    expect(result.refusalClass).toBe("provider_unavailable");
  });

  it("returns timeout and error from the adapter without throwing", async () => {
    await expect(
      ask({ adapter: createMockAiProviderAdapter({ script: { type: "timeout" } }) }),
    ).resolves.toMatchObject({ outcome: "timeout" });

    await expect(
      ask({ adapter: createMockAiProviderAdapter({ script: { type: "error", code: "5xx" } }) }),
    ).resolves.toMatchObject({ outcome: "error" });
  });

  it("treats malformed provider output as an error", async () => {
    const result = await ask({
      adapter: createMockAiProviderAdapter({ script: { type: "message", message: "{" } }),
    });

    expect(result.outcome).toBe("error");
    expect(result.selectedTools).toEqual([]);
  });

  it("honors a first-class adapter refusal without turning it into success", async () => {
    const result = await ask({
      adapter: createMockAiProviderAdapter({
        script: { type: "refusal", refusalClass: "unsupported_capability" },
      }),
    });

    expect(result).toMatchObject({
      outcome: "refusal",
      refusalClass: "unsupported_capability",
    });
    expect(result.text).toBe("");
    expect(result.facts).toEqual([]);
    expect(result.citations).toEqual([]);
    expect(result.selectedTools).toEqual([]);
  });

  it("maps a malformed refusal to error, distinct from typed refusal", async () => {
    const result = await ask({
      adapter: createMockAiProviderAdapter({
        script: { type: "message", message: JSON.stringify({ refusal: "not_a_class" }) },
      }),
    });

    expect(result.outcome).toBe("error");
    expect(result.refusalClass).toBeUndefined();
    expect(result.selectedTools).toEqual([]);
  });

  it("honors a JSON refusal envelope mapped by the adapter", async () => {
    const result = await ask({
      adapter: createMockAiProviderAdapter({
        script: { type: "message", message: JSON.stringify({ refusal: "write_forbidden" }) },
      }),
    });

    expect(result).toMatchObject({ outcome: "refusal", refusalClass: "write_forbidden" });
    expect(result.facts).toEqual([]);
  });

  it("executes a JSON-plan tool call from a message adapter", async () => {
    const result = await ask({
      adapter: createMockAiProviderAdapter({
        script: {
          type: "message",
          message: JSON.stringify({
            toolCalls: [{ name: "get_current_month_analytics", args: {} }],
          }),
        },
      }),
    });

    expect(result.outcome).toBe("success");
    expect(result.selectedTools).toEqual(["get_current_month_analytics"]);
  });

  it("fails closed when membership is missing", async () => {
    await expect(
      ask({ members: membersLookingUp(() => null) }),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
  });

  it("does not map a tool authorization failure to an AI success or generic error", async () => {
    await expect(
      ask({
        analytics: {
          async getCurrentMonthAnalytics() {
            throw new UnauthorizedWorkspaceAccessError();
          },
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
  });

  it("rejects an invalid surface at the entry boundary", async () => {
    const result = await ask({ surface: "assistant" as "dashboard" });

    expect(result.outcome).toBe("error");
    expect(result.selectedTools).toEqual([]);
  });

  it("does not log the user question", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await askWorkspaceQuestion(
      {
        question: "secret financial question",
        surface: "reports",
        context: workspaceContext(),
      },
      {
        adapter: createNullAiProviderAdapter(),
        registry: createFoundationToolRegistry(stubCurrentMonthAnalytics()),
        members: owningMembers(),
        createCorrelationId: () => "corr-log",
      },
    );

    expect(info.mock.calls.join(" ")).not.toContain("secret financial question");
    info.mockRestore();
  });
});
