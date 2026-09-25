// tests/unit/features/reporting/reporting-types.test.ts
import { describe, expect, it } from "vitest";
import {
  getReportingCalendarYear,
  parseReportEntityFilterParam,
  parseReportPeriodParam,
  periodHref,
  periodHrefFromState,
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

describe("parseReportEntityFilterParam", () => {
  const clientId = "11111111-1111-4111-8111-111111111111";
  const contractId = "22222222-2222-4222-8222-222222222222";

  it("returns empty filter when params are absent", () => {
    expect(parseReportEntityFilterParam({})).toEqual({});
  });

  it("returns empty filter when IDs are empty", () => {
    expect(parseReportEntityFilterParam({ clientId: "", contractId: "  " })).toEqual({});
  });

  it("ignores non-UUID IDs", () => {
    expect(
      parseReportEntityFilterParam({
        clientId: "not-a-uuid",
        contractId: "contract-1",
      }),
    ).toEqual({});
  });

  it("accepts valid Client and Contract UUIDs", () => {
    expect(parseReportEntityFilterParam({ clientId, contractId })).toEqual({
      clientId,
      contractId,
    });
  });

  it("accepts Client only", () => {
    expect(parseReportEntityFilterParam({ clientId })).toEqual({ clientId });
  });

  it("accepts Contract only", () => {
    expect(parseReportEntityFilterParam({ contractId })).toEqual({ contractId });
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
  const clientId = "11111111-1111-4111-8111-111111111111";
  const contractId = "22222222-2222-4222-8222-222222222222";

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

  it("appends Client only", () => {
    expect(periodHref("month", undefined, undefined, { clientId })).toBe(
      `/reports?period=month&clientId=${clientId}`,
    );
  });

  it("appends Contract only", () => {
    expect(periodHref("week", undefined, undefined, { contractId })).toBe(
      `/reports?period=week&contractId=${contractId}`,
    );
  });

  it("appends Client then Contract in that order", () => {
    expect(
      periodHref("year", undefined, undefined, { clientId, contractId }),
    ).toBe(`/reports?period=year&clientId=${clientId}&contractId=${contractId}`);
  });

  it("appends entity filters after custom start and end", () => {
    expect(
      periodHref("custom", "2026-01-01", "2026-03-31", { clientId, contractId }),
    ).toBe(
      `/reports?period=custom&start=2026-01-01&end=2026-03-31&clientId=${clientId}&contractId=${contractId}`,
    );
  });
});

describe("periodHrefFromState — URL preservation", () => {
  const clientId = "11111111-1111-4111-8111-111111111111";
  const contractId = "22222222-2222-4222-8222-222222222222";
  const june = { kind: "custom" as const, start: "2026-06-01", end: "2026-06-30" };
  const july = { kind: "custom" as const, start: "2026-07-01", end: "2026-07-31" };

  it("serializes period only when no entity filter is set", () => {
    expect(periodHrefFromState({ kind: "month" })).toBe("/reports?period=month");
  });

  it("preserves Client when Period changes", () => {
    expect(periodHrefFromState(july, { clientId })).toBe(
      `/reports?period=custom&start=2026-07-01&end=2026-07-31&clientId=${clientId}`,
    );
  });

  it("preserves Contract when Period changes", () => {
    expect(periodHrefFromState({ kind: "today" }, { contractId })).toBe(
      `/reports?period=today&contractId=${contractId}`,
    );
  });

  it("preserves Client + Contract when Period changes", () => {
    expect(periodHrefFromState(july, { clientId, contractId })).toBe(
      `/reports?period=custom&start=2026-07-01&end=2026-07-31&clientId=${clientId}&contractId=${contractId}`,
    );
  });

  it("unsets Client and preserves Contract + Period", () => {
    expect(periodHrefFromState(june, { contractId })).toBe(
      `/reports?period=custom&start=2026-06-01&end=2026-06-30&contractId=${contractId}`,
    );
  });

  it("unsets Contract and preserves Client + Period", () => {
    expect(periodHrefFromState(june, { clientId })).toBe(
      `/reports?period=custom&start=2026-06-01&end=2026-06-30&clientId=${clientId}`,
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
