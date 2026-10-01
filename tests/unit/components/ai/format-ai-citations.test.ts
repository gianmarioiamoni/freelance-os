// tests/unit/components/ai/format-ai-citations.test.ts
import { describe, expect, it } from "vitest";

import {
  citationIdentity,
  citationPeriodLabel,
  displayFactValue,
  formatFactForDisplay,
  formatMetricLabel,
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

  it("formats minutes as hours for user display", () => {
    expect(
      formatFactForDisplay({ metric: "hours", value: 120, unit: "minutes" }),
    ).toBe("2h");
    expect(
      formatFactForDisplay({ metric: "billableHours", value: 90, unit: "minutes" }),
    ).toBe("2h");
    expect(
      formatFactForDisplay({ metric: "hours", value: 0, unit: "minutes" }),
    ).toBe("0h");
  });

  it("formats currency values without modification", () => {
    expect(
      formatFactForDisplay({ metric: "accrued", value: 160, currency: "EUR" }),
    ).toBe("160 EUR");
    expect(
      formatFactForDisplay({ metric: "expected", value: 200.5, currency: "USD" }),
    ).toBe("200.5 USD");
  });

  it("formats null as not available", () => {
    expect(formatFactForDisplay({ metric: "forecast", value: null })).toBe("Not available");
  });

  it("translates metric names to human-readable labels", () => {
    expect(formatMetricLabel("hours")).toBe("Hours worked");
    expect(formatMetricLabel("billableHours")).toBe("Billable hours");
    expect(formatMetricLabel("accrued")).toBe("Accrued revenue");
    expect(formatMetricLabel("expected")).toBe("Expected revenue");
    expect(formatMetricLabel("forecast")).toBe("Forecast");
    expect(formatMetricLabel("unknownMetric")).toBe("unknownMetric");
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
