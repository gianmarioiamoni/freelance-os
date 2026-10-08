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

  it("calculates monthly hours with monthlyContractedMinutes", async () => {
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
        monthlyContractedHours: "96", // 5760 minutes
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
    expect(allocation.allocatedMinutes).toBe(5760); // 96h
    expect(allocation.percentage).toBe(25); // 1440 / 5760 = 25%
  });

  it("shows 100% when monthly capacity is reached", async () => {
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
        monthlyContractedHours: "48", // 2880 minutes
      },
      repositories.clients,
      repositories.contracts,
    );

    // Add multiple entries to reach 48h (max 24h per entry)
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

    expect(analytics.monthlyHoursAllocations).toHaveLength(1);
    const allocation = analytics.monthlyHoursAllocations[0];

    expect(allocation.workedMinutes).toBe(2880); // 48h
    expect(allocation.allocatedMinutes).toBe(2880); // 48h
    expect(allocation.percentage).toBe(100);
  });

  it("shows >100% when monthly capacity is exceeded", async () => {
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
        monthlyContractedHours: "40", // 2400 minutes
      },
      repositories.clients,
      repositories.contracts,
    );

    // Add entries totaling 50h (exceeds 40h capacity)
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

    expect(analytics.monthlyHoursAllocations).toHaveLength(1);
    const allocation = analytics.monthlyHoursAllocations[0];

    expect(allocation.workedMinutes).toBe(3000); // 50h
    expect(allocation.allocatedMinutes).toBe(2400); // 40h
    expect(allocation.percentage).toBe(125); // 3000 / 2400 = 125%
  });

  it("excludes contracts without monthlyContractedMinutes", async () => {
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
        validFrom: "2026-09-01",
        validTo: "2026-12-31",
        billingModel: "DAILY",
        rate: "500",
        currency: "USD",
        // No monthlyContractedHours
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

    // Should not include contract without monthlyContractedMinutes
    expect(analytics.monthlyHoursAllocations).toHaveLength(0);
  });
});
