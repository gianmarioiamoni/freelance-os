// tests/integration/analytics/forecast-revenue.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  getCurrentMonthPeriod,
  getDateRangePeriod,
  getMonthPeriod,
} from "@/lib/analytics-periods";

import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories } from "../persistence/helpers";

function service() {
  return new AnalyticsService(repositories.analytics, repositories.members);
}

describe("Forecast Revenue application integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("equals Accrued on the current period and is null for historical months", async () => {
    const graph = await createWorkspaceGraph(repositories, "forecast-current");
    const context: WorkspaceContext = {
      workspaceId: graph.workspaceId,
      userId: graph.userId,
      role: "OWNER",
      timezone: "Europe/Rome",
    };

    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 120,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const analytics = service();
    const current = getCurrentMonthPeriod(context.timezone);
    const historical = getMonthPeriod(2026, 5);
    const custom = getDateRangePeriod(date("2026-06-02"), date("2026-06-15"));

    const accrued = await analytics.getAccruedRevenue(context, current);
    const forecast = await analytics.getForecastRevenue(context, current);
    const monthly = await analytics.getMonthlyAnalytics(context, current);

    expect(forecast).not.toBeNull();
    expect(forecast?.byCurrency).toEqual(accrued.byCurrency);
    expect(forecast?.elapsedPeriod).toBe(forecast?.totalPeriod);
    expect(monthly.forecast?.byCurrency).toEqual(accrued.byCurrency);
    expect(await analytics.getForecastRevenue(context, historical)).toBeNull();
    expect(await analytics.getForecastRevenue(context, custom)).toBeNull();
  });

  it("does not leak Accrued or Forecast across workspaces", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "forecast-A");
    const workspaceB = await createWorkspaceGraph(repositories, "forecast-B");

    const contextA: WorkspaceContext = {
      workspaceId: workspaceA.workspaceId,
      userId: workspaceA.userId,
      role: "OWNER",
      timezone: "Europe/Rome",
    };
    const contextB: WorkspaceContext = {
      workspaceId: workspaceB.workspaceId,
      userId: workspaceB.userId,
      role: "OWNER",
      timezone: "Europe/Rome",
    };

    await createTimeEntry(
      contextA,
      {
        clientId: workspaceA.clientId,
        contractId: workspaceA.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      contextB,
      {
        clientId: workspaceB.clientId,
        contractId: workspaceB.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 180,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const period = getCurrentMonthPeriod("Europe/Rome");
    const forecastA = await service().getForecastRevenue(contextA, period);
    const forecastB = await service().getForecastRevenue(contextB, period);
    const accruedA = await service().getAccruedRevenue(contextA, period);

    expect(forecastA?.byCurrency[0]?.unrounded).toBe(80);
    expect(forecastB?.byCurrency[0]?.unrounded).toBe(240);
    expect(forecastA?.byCurrency).toEqual(accruedA.byCurrency);
  });
});
