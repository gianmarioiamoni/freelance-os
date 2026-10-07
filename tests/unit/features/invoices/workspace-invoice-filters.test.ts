// tests/unit/features/invoices/workspace-invoice-filters.test.ts
import { describe, expect, it, vi } from "vitest";

import {
  parseWorkspaceInvoiceViewState,
  toWorkspaceInvoiceListFilter,
  workspaceInvoiceClientHref,
  workspaceInvoiceEmptyCopy,
  workspaceInvoiceHref,
  workspaceInvoicePeriodHref,
  workspaceInvoiceTrackingHref,
} from "@/features/invoices/workspace-invoice-filters";

describe("workspace invoice filters", () => {
  it("defaults period to month and tracking to ACTIVE", () => {
    expect(parseWorkspaceInvoiceViewState({})).toEqual({
      period: { kind: "month" },
      tracking: "ACTIVE",
    });
  });

  it("parses period, tracking, and client filters", () => {
    expect(
      parseWorkspaceInvoiceViewState({
        period: "week",
        tracking: "VOID",
        clientId: "11111111-1111-1111-1111-111111111111",
      }),
    ).toEqual({
      period: { kind: "week" },
      tracking: "VOID",
      clientId: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("parses custom period and ignores invalid client ids", () => {
    expect(
      parseWorkspaceInvoiceViewState({
        period: "custom",
        start: "2026-01-01",
        end: "2026-01-31",
        clientId: "not-a-uuid",
      }),
    ).toEqual({
      period: { kind: "custom", start: "2026-01-01", end: "2026-01-31" },
      tracking: "ACTIVE",
    });
  });

  it("builds deterministic hrefs for period, tracking, and client", () => {
    expect(
      workspaceInvoicePeriodHref({ kind: "year" }, "ACTIVE"),
    ).toBe("/invoices?period=year");

    expect(
      workspaceInvoiceTrackingHref(
        { period: { kind: "month" }, tracking: "ACTIVE" },
        "ALL",
      ),
    ).toBe("/invoices?period=month&tracking=ALL");

    expect(
      workspaceInvoiceClientHref(
        { period: { kind: "month" }, tracking: "VOID" },
        "11111111-1111-1111-1111-111111111111",
      ),
    ).toBe(
      "/invoices?period=month&tracking=VOID&clientId=11111111-1111-1111-1111-111111111111",
    );
  });

  it("builds combined filter hrefs", () => {
    expect(
      workspaceInvoiceHref({
        period: { kind: "custom", start: "2026-02-01", end: "2026-02-28" },
        tracking: "ALL",
        clientId: "11111111-1111-1111-1111-111111111111",
      }),
    ).toBe(
      "/invoices?period=custom&start=2026-02-01&end=2026-02-28&tracking=ALL&clientId=11111111-1111-1111-1111-111111111111",
    );
  });

  it("maps view-state to service list filter via period resolver", () => {
    const resolvePeriod = vi.fn().mockReturnValue({
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-10-31T00:00:00.000Z"),
    });

    const filter = toWorkspaceInvoiceListFilter(
      {
        period: { kind: "month" },
        tracking: "VOID",
        clientId: "11111111-1111-1111-1111-111111111111",
      },
      resolvePeriod,
      "Europe/Rome",
      new Date("2026-10-15T12:00:00.000Z"),
    );

    expect(resolvePeriod).toHaveBeenCalledWith(
      { kind: "month" },
      "Europe/Rome",
      new Date("2026-10-15T12:00:00.000Z"),
    );
    expect(filter).toEqual({
      tracking: "VOID",
      period: {
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        endDate: new Date("2026-10-31T00:00:00.000Z"),
      },
      clientId: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("provides useful empty-state copy per tracking filter", () => {
    expect(workspaceInvoiceEmptyCopy("ACTIVE").title).toBe("No active invoices");
    expect(workspaceInvoiceEmptyCopy("VOID").title).toBe("No void invoices");
    expect(workspaceInvoiceEmptyCopy("ALL").title).toBe("No invoices");
  });
});
