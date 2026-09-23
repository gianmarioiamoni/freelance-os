// tests/integration/reporting/forecast-allocation-reporting.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { ReportingService } from "@/application/reporting/reporting-service";
import { updateContract } from "@/application/contracts/update-contract";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { getCurrentMonthPeriod, getMonthPeriod } from "@/lib/analytics-periods";

import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories, runInTransaction } from "../persistence/helpers";

function services() {
  const analytics = new AnalyticsService(repositories.analytics, repositories.members);
  return { analytics, reporting: new ReportingService(analytics) };
}

describe("ReportingService Forecast and allocation publish", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes current-period Forecast and allocation fields without changing Accrued", async () => {
    const graph = await createWorkspaceGraph(repositories, "report-forecast");
    const context: WorkspaceContext = {
      workspaceId: graph.workspaceId,
      userId: graph.userId,
      role: "OWNER",
      timezone: "Europe/Rome",
    };

    await updateContract(
      context,
      graph.contractId,
      {
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
        allocatedMinutes: 1000,
      },
      runInTransaction,
    );

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

    const { analytics, reporting } = services();
    const current = { kind: "month" as const };
    const report = await reporting.getContractReport(context, current);
    const accrued = await analytics.getAccruedRevenue(
      context,
      getCurrentMonthPeriod(context.timezone),
    );
    const historical = await reporting.getContractReport(context, {
      kind: "custom",
      startDate: getMonthPeriod(2026, 5).startDate,
      endDate: getMonthPeriod(2026, 5).endDate,
    });

    expect(report.accrued).toEqual(accrued);
    expect(report.forecast?.byCurrency).toEqual(accrued.byCurrency);
    expect(report.contractAllocations).toEqual([
      expect.objectContaining({
        contractId: graph.contractId,
        allocatedMinutes: 1000,
        consumedMinutes: 120,
        remainingMinutes: 880,
        allocationStatus: "NORMAL",
      }),
    ]);
    expect(historical.forecast).toBeNull();
    expect(historical.accrued.byCurrency).toEqual([]);
  });
});
