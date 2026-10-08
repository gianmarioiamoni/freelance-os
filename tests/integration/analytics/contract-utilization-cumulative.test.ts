// tests/integration/analytics/contract-utilization-cumulative.test.ts
import { beforeEach, describe, expect, it } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

import { date, repositories, runInTransaction } from "../persistence/helpers";

describe("Contract Utilization - Cumulative Budget", () => {
  const analyticsService = new AnalyticsService(
    repositories.analytics,
    repositories.members,
  );

  let context: WorkspaceContext;

  beforeEach(async () => {
    const created = await createFirstWorkspace(
      `test-cu-${Date.now()}`,
      {
        name: "Test CU Workspace",
        currency: "EUR",
        timezone: "Europe/Rome",
      },
      { runInTransaction },
    );
    context = created.context;
  });

  it("shows cumulative consumption against total contract budget", async () => {
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

    // Contract with 6000 minutes (100h) total budget
    const contract = await createContract(
      context,
      {
        clientId: client.id,
        validFrom: "2026-08-01",
        validTo: "2026-12-31",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
        allocatedMinutes: "6000", // 100h total budget
      },
      repositories.clients,
      repositories.contracts,
    );

    // Add 40h total across different months
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-08-15"),
        durationMinutes: 1200, // 20h in August
        description: "Month 1",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-09-15"),
        durationMinutes: 1200, // 20h in September
        description: "Month 2",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    // Query for current month (September)
    const analytics = await analyticsService.getMonthlyAnalytics(context, {
      startDate: date("2026-09-01"),
      endDate: date("2026-09-30"),
    });

    expect(analytics.contractUtilizations).toHaveLength(1);
    const utilization = analytics.contractUtilizations[0];

    expect(utilization.clientName).toBe("ACME Corp");
    expect(utilization.consumedMinutes).toBe(2400); // 40h cumulative
    expect(utilization.contractedMinutes).toBe(6000); // 100h total budget
    expect(utilization.utilizationPercentage).toBe(40); // 2400 / 6000 = 40%
  });

  it("shows 100% when total budget is fully consumed", async () => {
    const client = await createClient(
      context,
      {
        companyName: "Beta Inc",
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
        rate: "90",
        currency: "USD",
        allocatedMinutes: "2880", // 48h total budget
      },
      repositories.clients,
      repositories.contracts,
    );

    // Consume exactly the budget
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-09-10"),
        durationMinutes: 1440, // 24h
        description: "Week 1",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-09-20"),
        durationMinutes: 1440, // 24h
        description: "Week 2",
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

    expect(analytics.contractUtilizations).toHaveLength(1);
    const utilization = analytics.contractUtilizations[0];

    expect(utilization.consumedMinutes).toBe(2880); // 48h
    expect(utilization.contractedMinutes).toBe(2880); // 48h
    expect(utilization.utilizationPercentage).toBe(100);
  });

  it("shows >100% when total budget is exceeded", async () => {
    const client = await createClient(
      context,
      {
        companyName: "Gamma Corp",
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
        rate: "95",
        currency: "EUR",
        allocatedMinutes: "2400", // 40h total budget
      },
      repositories.clients,
      repositories.contracts,
    );

    // Exceed the budget
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-09-10"),
        durationMinutes: 1440, // 24h
        description: "Week 1",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-09-20"),
        durationMinutes: 1440, // 24h
        description: "Week 2",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-09-25"),
        durationMinutes: 120, // 2h
        description: "Overtime",
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

    expect(analytics.contractUtilizations).toHaveLength(1);
    const utilization = analytics.contractUtilizations[0];

    expect(utilization.consumedMinutes).toBe(3000); // 50h
    expect(utilization.contractedMinutes).toBe(2400); // 40h
    expect(utilization.utilizationPercentage).toBe(125); // 3000 / 2400 = 125%
  });

  it("shows cumulative even when current month has less hours", async () => {
    const client = await createClient(
      context,
      {
        companyName: "Delta LLC",
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
        validFrom: "2026-08-01",
        validTo: "2026-12-31",
        billingModel: "HOURLY",
        rate: "100",
        currency: "USD",
        allocatedMinutes: "12000", // 200h total budget
      },
      repositories.clients,
      repositories.contracts,
    );

    // 80h in August
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-08-10"),
        durationMinutes: 1440,
        description: "August week 1",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-08-20"),
        durationMinutes: 1440,
        description: "August week 2",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-08-25"),
        durationMinutes: 1440,
        description: "August week 3",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-08-28"),
        durationMinutes: 480,
        description: "August extra",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    // Only 20h in September
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-09-15"),
        durationMinutes: 1200,
        description: "September",
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    // Query for September
    const analytics = await analyticsService.getMonthlyAnalytics(context, {
      startDate: date("2026-09-01"),
      endDate: date("2026-09-30"),
    });

    expect(analytics.contractUtilizations).toHaveLength(1);
    const utilization = analytics.contractUtilizations[0];

    // Should show cumulative 100h (80h + 20h), not just September's 20h
    expect(utilization.consumedMinutes).toBe(6000); // 100h cumulative
    expect(utilization.contractedMinutes).toBe(12000); // 200h total budget
    expect(utilization.utilizationPercentage).toBe(50); // 6000 / 12000 = 50%
  });

  it("shows contracts without allocatedMinutes but with null budget", async () => {
    const client = await createClient(
      context,
      {
        companyName: "Epsilon Corp",
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
        billingModel: "DAILY",
        rate: "500",
        currency: "USD",
        // No allocatedMinutes
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
        durationMinutes: 480,
        description: "Project work",
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

    // Should include contract but with null budget
    expect(analytics.contractUtilizations).toHaveLength(1);
    const utilization = analytics.contractUtilizations[0];
    
    expect(utilization.consumedMinutes).toBe(480); // 8h
    expect(utilization.contractedMinutes).toBeNull(); // No budget
    expect(utilization.utilizationPercentage).toBeNull(); // No percentage
  });

  it("respects contract validFrom/validTo boundaries", async () => {
    const client = await createClient(
      context,
      {
        companyName: "Zeta Inc",
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
        validTo: "2026-09-30",
        billingModel: "HOURLY",
        rate: "85",
        currency: "EUR",
        allocatedMinutes: "2880", // 48h total budget
      },
      repositories.clients,
      repositories.contracts,
    );

    // Work in September (within validity)
    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-09-15"),
        durationMinutes: 1200, // 20h
        description: "September work",
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

    expect(analytics.contractUtilizations).toHaveLength(1);
    const utilization = analytics.contractUtilizations[0];

    // Should only count work within validFrom/validTo
    expect(utilization.consumedMinutes).toBe(1200); // 20h
    expect(utilization.contractedMinutes).toBe(2880); // 48h
    expect(utilization.utilizationPercentage).toBeCloseTo(41.7, 0);
  });
});
