// tests/unit/components/ai/format-ai-citations.test.ts
import { describe, expect, it } from "vitest";

import {
  citationIdentity,
  citationPeriodLabel,
  displayFactValue,
} from "@/components/ai/format-ai-citations";

describe("AI citation display", () => {
  it("renders supplied fact values without calculating new figures", () => {
    expect(
      displayFactValue({ metric: "accrued", value: 160, currency: "EUR" }),
    ).toBe("160 EUR");
    expect(
      displayFactValue({ metric: "hours", value: 120, unit: "minutes" }),
    ).toBe("120 minutes");
    expect(displayFactValue({ metric: "forecast", value: null })).toBe("Not available");
  });

  it("uses E02 labels and periods only", () => {
    expect(
      citationIdentity({
        tool: "get_contract_report",
        metric: "utilizationPercentage",
        value: 80,
        contractLabel: "ACME",
        clientLabel: "ACME",
      }),
    ).toBe("ACME");
    expect(
      citationPeriodLabel({
        tool: "get_annual_overview",
        metric: "accrued",
        value: 80,
        period: {
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-01-31T00:00:00.000Z",
        },
      }),
    ).toBe("2026-01-01T00:00:00.000Z – 2026-01-31T00:00:00.000Z");
  });
});
