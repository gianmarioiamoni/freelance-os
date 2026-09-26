// tests/unit/application/ai/resolve-ai-period.test.ts
import { describe, expect, it } from "vitest";

import { AiClarificationError } from "@/application/ai/ai-errors";
import { parseAiPeriodRequest, resolveAiPeriod } from "@/application/ai/resolve-ai-period";
import { ReportingService } from "@/application/reporting/reporting-service";
import type { AnalyticsService } from "@/application/analytics/analytics-service";

const reporting = new ReportingService({} as AnalyticsService);

describe("parseAiPeriodRequest", () => {
  it("defaults a missing period to the current month kind", () => {
    expect(parseAiPeriodRequest({})).toEqual({ kind: "month" });
  });

  it("refuses an unknown period kind without substituting", () => {
    expect(() => parseAiPeriodRequest({ periodKind: "quarter" })).toThrow(AiClarificationError);
  });

  it("still refuses current because it is not an application period kind", () => {
    expect(() => parseAiPeriodRequest({ periodKind: "current" })).toThrow(AiClarificationError);
  });

  it("still accepts each application period kind", () => {
    expect(parseAiPeriodRequest({ periodKind: "today" })).toEqual({ kind: "today" });
    expect(parseAiPeriodRequest({ periodKind: "week" })).toEqual({ kind: "week" });
    expect(parseAiPeriodRequest({ periodKind: "month" })).toEqual({ kind: "month" });
    expect(parseAiPeriodRequest({ periodKind: "year" })).toEqual({ kind: "year" });
  });

  it("refuses custom bounds without periodKind custom", () => {
    expect(() =>
      parseAiPeriodRequest({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      }),
    ).toThrow(AiClarificationError);
  });

  it("accepts a custom period with ISO dates", () => {
    expect(
      parseAiPeriodRequest({
        periodKind: "custom",
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      }),
    ).toEqual({
      kind: "custom",
      startDate: new Date("2025-01-01T00:00:00.000Z"),
      endDate: new Date("2025-01-31T00:00:00.000Z"),
    });
  });
});

describe("resolveAiPeriod", () => {
  it("uses ReportingService period semantics", () => {
    const now = new Date("2026-09-26T12:00:00.000Z");
    const resolved = resolveAiPeriod(
      { periodKind: "month" },
      "Europe/Rome",
      (request, timezone, clock) => reporting.resolvePeriod(request, timezone, clock),
      now,
    );

    expect(resolved.request).toEqual({ kind: "month" });
    expect(resolved.period).toEqual(reporting.resolvePeriod({ kind: "month" }, "Europe/Rome", now));
  });
});
