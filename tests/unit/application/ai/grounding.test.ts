// tests/unit/application/ai/grounding.test.ts
import { describe, expect, it } from "vitest";

import { assembleGroundedAnswer } from "@/application/ai/grounding/assemble-grounded-answer";

describe("assembleGroundedAnswer", () => {
  it("takes numeric values from the tool DTO only", () => {
    const answer = assembleGroundedAnswer("get_accrued_revenue", {
      period: {
        startDate: "2026-09-01T00:00:00.000Z",
        endDate: "2026-09-26T00:00:00.000Z",
      },
      byCurrency: [{ currency: "EUR", published: 160 }],
      inventedTotal: 99999,
    });

    expect(answer.citations.every((citation) => citation.value !== 99999)).toBe(true);
    expect(answer.citations.some((citation) => citation.metric === "accrued" && citation.value === 160)).toBe(true);
    expect(answer.text).toContain("160");
    expect(answer.text).not.toContain("99999");
  });

  it("does not let model prose fields become citations", () => {
    const answer = assembleGroundedAnswer("get_forecast_revenue", {
      period: {
        startDate: "2025-01-01T00:00:00.000Z",
        endDate: "2025-01-31T00:00:00.000Z",
      },
      unavailable: true,
      message: "Forecast is 88000 EUR",
    });

    expect(answer.citations).toEqual([
      expect.objectContaining({ tool: "get_forecast_revenue", metric: "forecast", value: null }),
    ]);
    expect(answer.text).not.toContain("88000");
  });

  it("omits workspace identifiers from citations and text", () => {
    const answer = assembleGroundedAnswer("get_current_month_analytics", {
      period: {
        startDate: "2026-09-01T00:00:00.000Z",
        endDate: "2026-09-26T00:00:00.000Z",
      },
      totalMinutes: 120,
      billableMinutes: 120,
      workspaceId: "workspace-owned",
      accrued: { byCurrency: [{ currency: "EUR", published: 160 }] },
      expected: { byCurrency: [{ currency: "EUR", published: 6400 }] },
      forecast: { byCurrency: [{ currency: "EUR", published: 160 }] },
    });

    expect(JSON.stringify(answer)).not.toContain("workspace-owned");
  });
});
