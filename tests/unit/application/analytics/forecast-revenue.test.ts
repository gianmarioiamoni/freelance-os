// tests/unit/application/analytics/forecast-revenue.test.ts
import { describe, expect, it, vi } from "vitest";

import { AnalyticsError, AnalyticsService } from "@/application/analytics/analytics-service";
import { projectForecastAmount } from "@/application/analytics/forecast-revenue";
import { publishMonetaryAmount } from "@/application/analytics/accrued-revenue";
import type { AccruedRevenue, AnalyticsPeriod } from "@/domain/analytics-types";
import type { AnalyticsRepository, WorkspaceMemberRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import {
  getCurrentMonthPeriod,
  getMonthPeriod,
  getPeriodDays,
} from "@/lib/analytics-periods";

const period: AnalyticsPeriod = {
  startDate: new Date("2026-09-01T00:00:00.000Z"),
  endDate: new Date("2026-09-10T00:00:00.000Z"),
};

function accrued(unrounded: number, currency = "EUR"): AccruedRevenue {
  return {
    period,
    timezone: "UTC",
    byCurrency: unrounded === 0 && currency === "EUR"
      ? []
      : [{ currency, unrounded, published: publishMonetaryAmount(unrounded) }],
    byContract:
      unrounded === 0
        ? []
        : [
            {
              contractId: "contract-a",
              currency,
              unrounded,
              published: publishMonetaryAmount(unrounded),
            },
          ],
  };
}

function forecast(
  source: AccruedRevenue,
  elapsedPeriod: number,
  totalPeriod: number,
) {
  return AnalyticsService.calculateForecastRevenue(source, elapsedPeriod, totalPeriod);
}

describe("Forecast Revenue calculation", () => {
  it("returns 0 when Accrued is 0", () => {
    const result = forecast(accrued(0), 10, 30);
    expect(result.byCurrency).toEqual([]);
    expect(result.byContract).toEqual([]);
    expect(projectForecastAmount(0, 10, 30)).toBe(0);
  });

  it("returns 0 when elapsedPeriod is 0", () => {
    expect(projectForecastAmount(800, 0, 30)).toBe(0);
    const result = forecast(accrued(800), 0, 30);
    expect(result.byCurrency[0]?.unrounded).toBe(0);
    expect(result.byCurrency[0]?.published).toBe(0);
  });

  it("projects Accrued linearly when elapsed < total", () => {
    const result = forecast(accrued(100), 10, 30);
    expect(result.byCurrency[0]?.unrounded).toBe(300);
    expect(result.byCurrency[0]?.published).toBe(300);
    expect(result.byContract[0]?.unrounded).toBe(300);
    expect(result.elapsedPeriod).toBe(10);
    expect(result.totalPeriod).toBe(30);
  });

  it("equals Accrued when the current period ends today", () => {
    const source = accrued(640.4);
    const days = getPeriodDays(period);
    const result = forecast(source, days, days);
    expect(result.byCurrency[0]?.unrounded).toBe(source.byCurrency[0]?.unrounded);
    expect(result.byCurrency[0]?.published).toBe(source.byCurrency[0]?.published);
    expect(result.elapsedPeriod).toBe(result.totalPeriod);
  });

  it("uses deterministic arithmetic and publishes once", () => {
    const result = forecast(accrued(100), 3, 10);
    expect(result.byCurrency[0]?.unrounded).toBe(1000 / 3);
    expect(result.byCurrency[0]?.published).toBe(publishMonetaryAmount(1000 / 3));
  });

  it("reuses Accrued monetary precision without float identity corruption", () => {
    const source = accrued(10.1 + 20.2);
    const days = getPeriodDays(period);
    const result = forecast(source, days, days);
    expect(result.byCurrency[0]?.unrounded).toBe(source.byCurrency[0]?.unrounded);
    expect(result.byCurrency[0]?.published).toBe(source.byCurrency[0]?.published);
    expect(projectForecastAmount(source.byCurrency[0]!.unrounded, 2, 5)).toBe(
      (source.byCurrency[0]!.unrounded * 5) / 2,
    );
  });

  it("does not take Invoice, Payment, Expected, or Allocation as inputs", () => {
    expect(AnalyticsService.calculateForecastRevenue.length).toBe(3);
    const result = forecast(accrued(50), 5, 5);
    expect(result.byCurrency[0]?.unrounded).toBe(50);
  });
});

describe("AnalyticsService.getForecastRevenue", () => {
  const context: WorkspaceContext = {
    workspaceId: "workspace-123",
    userId: "user-1",
    role: "OWNER",
    timezone: "UTC",
  };

  const membership: WorkspaceMemberRecord = {
    workspaceId: "workspace-123",
    userId: "user-1",
    role: "OWNER",
    createdAt: new Date(),
  };

  function members(member: WorkspaceMemberRecord | null): WorkspaceMemberRepository {
    return {
      getMember: vi.fn().mockResolvedValue(member),
      addMember: vi.fn(),
      listMembers: vi.fn(),
      listMembershipsByUserId: vi.fn(),
    };
  }

  function analytics(
    overrides: Partial<AnalyticsRepository> = {},
  ): AnalyticsRepository {
    return {
      getMonthlyAnalytics: vi.fn(),
      getDailyAnalytics: vi.fn(),
      getClientAllocations: vi.fn(),
      getContractUtilizations: vi.fn(),
      listTimeEntriesForPeriod: vi.fn().mockResolvedValue([]),
      listExpectedContracts: vi.fn(),
      getContractAllocationFact: vi.fn(),
      listContractAllocationFacts: vi.fn(),
      ...overrides,
    };
  }

  it("returns Forecast for the current month and null for a historical month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T12:00:00.000Z"));

    const service = new AnalyticsService(analytics(), members(membership));
    const current = getCurrentMonthPeriod("UTC");
    const historical = getMonthPeriod(2026, 6);

    const currentForecast = await service.getForecastRevenue(context, current);
    const historicalForecast = await service.getForecastRevenue(context, historical);

    expect(currentForecast).not.toBeNull();
    expect(currentForecast?.elapsedPeriod).toBe(currentForecast?.totalPeriod);
    expect(historicalForecast).toBeNull();

    vi.useRealTimers();
  });

  it("rejects an invalid period and a non-member", async () => {
    const listTimeEntriesForPeriod = vi.fn();
    const authorized = new AnalyticsService(
      analytics({ listTimeEntriesForPeriod }),
      members(membership),
    );
    await expect(
      authorized.getForecastRevenue(context, {
        startDate: new Date("2026-09-30T00:00:00.000Z"),
        endDate: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow(AnalyticsError);

    const unauthorized = new AnalyticsService(
      analytics({ listTimeEntriesForPeriod }),
      members(null),
    );
    await expect(
      unauthorized.getForecastRevenue(context, getCurrentMonthPeriod("UTC")),
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    expect(listTimeEntriesForPeriod).not.toHaveBeenCalled();
  });
});
