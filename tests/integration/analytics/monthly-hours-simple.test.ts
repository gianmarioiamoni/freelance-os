// tests/integration/analytics/monthly-hours-simple.test.ts
import { beforeEach, describe, expect, it } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

import { date, repositories, runInTransaction } from "../persistence/helpers";

describe("Monthly Hours Allocations - Simple", () => {
  const analyticsService = new AnalyticsService(
    repositories.analytics,
    repositories.members,
  );

  let context: WorkspaceContext;

  beforeEach(async () => {
    const created = await createFirstWorkspace(
      `test-mh-${Date.now()}`,
      {
        name: "Test MH Workspace",
        currency: "EUR",
        timezone: "Europe/Rome",
      },
      { runInTransaction },
    );
    context = created.context;
  });

  it("calculates monthly hours with allocatedMinutes", async () => {
    const client = await createClient(
      context,
      {
        companyName: "ACME Corp",
        email: "",
        phone: "",
        address: "",
        vatNumber: "",
        notes: "",
      },
      repositories.clients,
    );

    const contract = await createContract(
      context,
      {
        clientId: client.id,
        validFrom: "2026-09-01",
        validTo: "2026-12-31",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
        monthlyContractedHours: "96",
        allocatedMinutes: "3456", // 57.6h
      },
      repositories.clients,
      repositories.contracts,
    );

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-09-15"),
        durationMinutes: 1440, // 24h
        description: "Development",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const analytics = await analyticsService.getMonthlyAnalytics(context, {
      startDate: date("2026-09-01"),
      endDate: date("2026-09-30"),
    });

    expect(analytics.monthlyHoursAllocations).toHaveLength(1);
    const allocation = analytics.monthlyHoursAllocations[0];

    expect(allocation.clientName).toBe("ACME Corp");
    expect(allocation.workedMinutes).toBe(1440); // 24h
    expect(allocation.allocatedMinutes).toBe(3456); // 57.6h
    expect(allocation.percentage).toBeCloseTo(41.7, 0); // 1440 / 3456 ≈ 41.7%
  });
});
