// tests/unit/features/reporting/reporting-types.test.ts
import { describe, expect, it } from "vitest";
import {
  getReportingCalendarYear,
  parseReportPeriodParam,
  periodHref,
  toReportingPeriodKind,
} from "@/features/reporting/reporting-types";

describe("parseReportPeriodParam", () => {
  it("defaults to month when no period param", () => {
    expect(parseReportPeriodParam({})).toEqual({ kind: "month" });
  });

  it("defaults to month for unknown period kind", () => {
    expect(parseReportPeriodParam({ period: "quarterly" })).toEqual({
      kind: "month",
    });
  });

  it.each(["today", "week", "month", "year"] as const)(
    "accepts standard kind: %s",
    (kind) => {
      expect(parseReportPeriodParam({ period: kind })).toEqual({ kind });
    },
  );

  it("accepts valid custom range", () => {
    expect(
      parseReportPeriodParam({
        period: "custom",
        start: "2026-01-01",
        end: "2026-03-31",
      }),
    ).toEqual({ kind: "custom", start: "2026-01-01", end: "2026-03-31" });
  });

  it("falls back to month when custom start is missing", () => {
    expect(
      parseReportPeriodParam({ period: "custom", end: "2026-03-31" }),
    ).toEqual({ kind: "month" });
  });

  it("falls back to month when custom end is missing", () => {
    expect(
      parseReportPeriodParam({ period: "custom", start: "2026-01-01" }),
    ).toEqual({ kind: "month" });
  });

  it("falls back to month when custom start > end", () => {
    expect(
      parseReportPeriodParam({
        period: "custom",
        start: "2026-03-31",
        end: "2026-01-01",
      }),
    ).toEqual({ kind: "month" });
  });

  it("falls back to month when custom start is invalid date format", () => {
    expect(
      parseReportPeriodParam({
        period: "custom",
        start: "not-a-date",
        end: "2026-03-31",
      }),
    ).toEqual({ kind: "month" });
  });

  it("falls back to month when custom end is invalid date format", () => {
    expect(
      parseReportPeriodParam({
        period: "custom",
        start: "2026-01-01",
        end: "2026-13-31",
      }),
    ).toEqual({ kind: "month" });
  });
});

describe("toReportingPeriodKind", () => {
  it.each(["today", "week", "month", "year"] as const)(
    "passes through standard kind: %s",
    (kind) => {
      expect(toReportingPeriodKind({ kind })).toEqual({ kind });
    },
  );

  it("converts custom param to ReportingPeriodKind with Date objects", () => {
    const result = toReportingPeriodKind({
      kind: "custom",
      start: "2026-01-01",
      end: "2026-03-31",
    });
    expect(result.kind).toBe("custom");
    if (result.kind === "custom") {
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.startDate.toISOString()).toBe("2026-01-01T00:00:00.000Z");
      expect(result.endDate.toISOString()).toBe("2026-03-31T00:00:00.000Z");
    }
  });
});

describe("periodHref", () => {
  it.each(["today", "week", "month", "year"] as const)(
    "returns /reports?period=%s for standard kinds",
    (kind) => {
      expect(periodHref(kind)).toBe(`/reports?period=${kind}`);
    },
  );

  it("returns custom href with start and end", () => {
    expect(periodHref("custom", "2026-01-01", "2026-03-31")).toBe(
      "/reports?period=custom&start=2026-01-01&end=2026-03-31",
    );
  });
});

describe("getReportingCalendarYear — F-105-013", () => {
  it("keeps the workspace-local year when UTC has already rolled over", () => {
    const now = new Date("2027-01-01T02:00:00.000Z");
    expect(now.getUTCFullYear()).toBe(2027);
    expect(getReportingCalendarYear("America/New_York", now)).toBe(2026);
  });

  it("matches UTC year when the workspace is UTC", () => {
    const now = new Date("2027-01-01T02:00:00.000Z");
    expect(getReportingCalendarYear("UTC", now)).toBe(2027);
  });

  it("leaves mid-year reporting unchanged", () => {
    const now = new Date("2026-09-20T12:00:00.000Z");
    expect(getReportingCalendarYear("Europe/Rome", now)).toBe(2026);
    expect(getReportingCalendarYear("UTC", now)).toBe(2026);
  });
});
