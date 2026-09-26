// tests/unit/application/ai/get-current-month-analytics-tool.test.ts
import { describe, expect, it } from "vitest";

import { createGetCurrentMonthAnalyticsTool } from "@/application/ai/tools/get-current-month-analytics-tool";

import {
  monthlyAnalyticsFixture,
  stubCurrentMonthAnalytics,
  workspaceContext,
} from "./ai-test-helpers";

describe("createGetCurrentMonthAnalyticsTool", () => {
  it("is read-only and exposes no tenant arguments", () => {
    const tool = createGetCurrentMonthAnalyticsTool(stubCurrentMonthAnalytics());

    expect(tool.readOnly).toBe(true);
    expect(tool.argumentKeys).toEqual([]);
    expect(tool.name).toBe("get_current_month_analytics");
  });

  it("calls the analytics application port with the trusted context", async () => {
    const captured: { context?: ReturnType<typeof workspaceContext> } = {};
    const fixture = monthlyAnalyticsFixture({ totalMinutes: 45 });
    const tool = createGetCurrentMonthAnalyticsTool(
      stubCurrentMonthAnalytics(captured, fixture),
    );
    const context = workspaceContext();

    const result = await tool.execute(context, { workspaceId: "ignored" });

    expect(captured.context).toEqual(context);
    expect(result.totalMinutes).toBe(45);
    expect(result.period.startDate).toBe("2026-09-01T00:00:00.000Z");
    expect(JSON.stringify(result)).not.toContain("workspaceId");
  });
});
