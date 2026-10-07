// tests/integration/reporting/monthly-timesheet.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { ReportingService } from "@/application/reporting/reporting-service";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories } from "../persistence/helpers";

function services() {
  const analytics = new AnalyticsService(repositories.analytics, repositories.members);
  return {
    analytics,
    reporting: new ReportingService(analytics),
  };
}

function contextFrom(graph: { workspaceId: string; userId: string }): WorkspaceContext {
  return {
    workspaceId: graph.workspaceId,
    userId: graph.userId,
    role: "OWNER",
    timezone: "Europe/Rome",
  };
}

async function addClient(context: WorkspaceContext, name: string) {
  return createClient(
    context,
    {
      companyName: name,
      email: "",
      phone: "",
      address: "",
      vatNumber: "",
      notes: "",
    },
    repositories.clients,
  );
}

async function addHourlyContract(
  context: WorkspaceContext,
  clientId: string,
  options?: { rate?: string; currency?: string },
) {
  return createContract(
    context,
    {
      clientId,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      billingModel: "HOURLY",
      rate: options?.rate ?? "80",
      currency: options?.currency ?? "EUR",
      monthlyContractedHours: "80",
    },
    repositories.clients,
    repositories.contracts,
  );
}

const JUNE = {
  kind: "custom" as const,
  startDate: date("2026-06-01"),
  endDate: date("2026-06-30"),
};

describe("Monthly Timesheet Integration", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  it("returns empty timesheet for client with no entries", async () => {
    const graph = await createWorkspaceGraph(repositories, "timesheet-1");
    const context = contextFrom(graph);
    const client = await addClient(context, "ACME");
    await addHourlyContract(context, client.id);

    const { reporting } = services();
    const report = await reporting.getMonthlyTimesheet(
      context,
      JUNE,
      client.id,
      repositories.clients,
      repositories.timeEntries,
    );

    expect(report.clientId).toBe(client.id);
    expect(report.clientName).toBe("ACME");
    expect(report.totalMinutes).toBe(0);
    expect(report.billableMinutes).toBe(0);
    expect(report.accrued.byCurrency).toEqual([]);
    expect(report.dailyBreakdown).toEqual([]);

    await repositories.workspaces.deleteWorkspace(graph.workspaceId);
  });

  it("aggregates hours and accrued for single contract", async () => {
    const graph = await createWorkspaceGraph(repositories, "timesheet-2");
    const context = contextFrom(graph);
    const client = await addClient(context, "ACME");
    const contract = await addHourlyContract(context, client.id, { rate: "80" });

    await createTimeEntry(
      context,
      {
        contractId: contract.id,
        workDate: "2026-06-01",
        durationHours: "2",
        durationMinutes: "0",
        billable: true,
        description: "Task A",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        contractId: contract.id,
        workDate: "2026-06-02",
        durationHours: "1",
        durationMinutes: "30",
        billable: true,
        description: "Task B",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const report = await reporting.getMonthlyTimesheet(
      context,
      JUNE,
      client.id,
      repositories.clients,
      repositories.timeEntries,
    );

    expect(report.clientName).toBe("ACME");
    expect(report.totalMinutes).toBe(210);
    expect(report.billableMinutes).toBe(210);
    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 280, published: 280 },
    ]);
    expect(report.dailyBreakdown).toHaveLength(2);
    expect(report.dailyBreakdown[0].workDate).toEqual(date("2026-06-01"));
    expect(report.dailyBreakdown[0].totalMinutes).toBe(120);
    expect(report.dailyBreakdown[0].entries).toHaveLength(1);
    expect(report.dailyBreakdown[0].entries[0].description).toBe("Task A");
    expect(report.dailyBreakdown[1].workDate).toEqual(date("2026-06-02"));
    expect(report.dailyBreakdown[1].totalMinutes).toBe(90);

    await repositories.workspaces.deleteWorkspace(graph.workspaceId);
  });

  it("aggregates multiple contracts for same client", async () => {
    const graph = await createWorkspaceGraph(repositories, "timesheet-3");
    const context = contextFrom(graph);
    const client = await addClient(context, "ACME");
    const contract1 = await addHourlyContract(context, client.id, { rate: "80" });
    const contract2 = await addHourlyContract(context, client.id, { rate: "100" });

    await createTimeEntry(
      context,
      {
        contractId: contract1.id,
        workDate: "2026-06-01",
        durationHours: "1",
        durationMinutes: "0",
        billable: true,
        description: "Contract 1",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        contractId: contract2.id,
        workDate: "2026-06-01",
        durationHours: "1",
        durationMinutes: "0",
        billable: true,
        description: "Contract 2",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const report = await reporting.getMonthlyTimesheet(
      context,
      JUNE,
      client.id,
      repositories.clients,
      repositories.timeEntries,
    );

    expect(report.totalMinutes).toBe(120);
    expect(report.billableMinutes).toBe(120);
    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 180, published: 180 },
    ]);
    expect(report.dailyBreakdown[0].entries).toHaveLength(2);

    await repositories.workspaces.deleteWorkspace(graph.workspaceId);
  });

  it("separates multiple currencies", async () => {
    const graph = await createWorkspaceGraph(repositories, "timesheet-4");
    const context = contextFrom(graph);
    const client = await addClient(context, "ACME");
    const contractEur = await addHourlyContract(context, client.id, {
      rate: "80",
      currency: "EUR",
    });
    const contractUsd = await addHourlyContract(context, client.id, {
      rate: "100",
      currency: "USD",
    });

    await createTimeEntry(
      context,
      {
        contractId: contractEur.id,
        workDate: "2026-06-01",
        durationHours: "1",
        durationMinutes: "0",
        billable: true,
        description: "EUR work",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        contractId: contractUsd.id,
        workDate: "2026-06-01",
        durationHours: "1",
        durationMinutes: "0",
        billable: true,
        description: "USD work",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const report = await reporting.getMonthlyTimesheet(
      context,
      JUNE,
      client.id,
      repositories.clients,
      repositories.timeEntries,
    );

    expect(report.accrued.byCurrency).toHaveLength(2);
    expect(report.accrued.byCurrency[0].currency).toBe("EUR");
    expect(report.accrued.byCurrency[0].published).toBe(80);
    expect(report.accrued.byCurrency[1].currency).toBe("USD");
    expect(report.accrued.byCurrency[1].published).toBe(100);

    await repositories.workspaces.deleteWorkspace(graph.workspaceId);
  });

  it("includes non-billable entries in breakdown but not accrued", async () => {
    const graph = await createWorkspaceGraph(repositories, "timesheet-5");
    const context = contextFrom(graph);
    const client = await addClient(context, "ACME");
    const contract = await addHourlyContract(context, client.id);

    await createTimeEntry(
      context,
      {
        contractId: contract.id,
        workDate: "2026-06-01",
        durationHours: "1",
        durationMinutes: "0",
        billable: true,
        description: "Billable",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        contractId: contract.id,
        workDate: "2026-06-01",
        durationHours: "1",
        durationMinutes: "0",
        billable: false,
        description: "Non-billable",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const report = await reporting.getMonthlyTimesheet(
      context,
      JUNE,
      client.id,
      repositories.clients,
      repositories.timeEntries,
    );

    expect(report.totalMinutes).toBe(120);
    expect(report.billableMinutes).toBe(60);
    expect(report.accrued.byCurrency[0].published).toBe(80);
    expect(report.dailyBreakdown[0].entries).toHaveLength(2);
    expect(report.dailyBreakdown[0].entries.find((e) => e.billable)).toBeDefined();
    expect(report.dailyBreakdown[0].entries.find((e) => !e.billable)).toBeDefined();

    await repositories.workspaces.deleteWorkspace(graph.workspaceId);
  });

  it("filters out entries from other clients", async () => {
    const graph = await createWorkspaceGraph(repositories, "timesheet-6");
    const context = contextFrom(graph);
    const client1 = await addClient(context, "ACME");
    const client2 = await addClient(context, "Other Corp");
    const contract1 = await addHourlyContract(context, client1.id);
    const contract2 = await addHourlyContract(context, client2.id);

    await createTimeEntry(
      context,
      {
        contractId: contract1.id,
        workDate: "2026-06-01",
        durationHours: "1",
        durationMinutes: "0",
        billable: true,
        description: "ACME work",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        contractId: contract2.id,
        workDate: "2026-06-01",
        durationHours: "2",
        durationMinutes: "0",
        billable: true,
        description: "Other work",
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const report = await reporting.getMonthlyTimesheet(
      context,
      JUNE,
      client1.id,
      repositories.clients,
      repositories.timeEntries,
    );

    expect(report.clientName).toBe("ACME");
    expect(report.totalMinutes).toBe(60);
    expect(report.dailyBreakdown[0].entries).toHaveLength(1);
    expect(report.dailyBreakdown[0].entries[0].description).toBe("ACME work");

    await repositories.workspaces.deleteWorkspace(graph.workspaceId);
  });

  it("rejects missing client", async () => {
    const graph = await createWorkspaceGraph(repositories, "timesheet-7");
    const context = contextFrom(graph);
    const { reporting } = services();

    await expect(
      reporting.getMonthlyTimesheet(
        context,
        JUNE,
        "missing-client",
        repositories.clients,
        repositories.timeEntries,
      ),
    ).rejects.toThrow("Client not found or does not belong to workspace");

    await repositories.workspaces.deleteWorkspace(graph.workspaceId);
  });

  it("rejects workspace isolation violation", async () => {
    const graph1 = await createWorkspaceGraph(repositories, "timesheet-8a");
    const graph2 = await createWorkspaceGraph(repositories, "timesheet-8b");
    const context1 = contextFrom(graph1);
    const context2 = contextFrom(graph2);
    const client2 = await addClient(context2, "Other Workspace Client");

    const { reporting } = services();

    await expect(
      reporting.getMonthlyTimesheet(
        context1,
        JUNE,
        client2.id,
        repositories.clients,
        repositories.timeEntries,
      ),
    ).rejects.toThrow("Client not found or does not belong to workspace");

    await repositories.workspaces.deleteWorkspace(graph1.workspaceId);
    await repositories.workspaces.deleteWorkspace(graph2.workspaceId);
  });
});
