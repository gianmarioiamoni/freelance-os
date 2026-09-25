// tests/integration/reporting/report-filters.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { ReportingService } from "@/application/reporting/reporting-service";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { getCurrentMonthPeriod } from "@/lib/analytics-periods";

import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories } from "../persistence/helpers";

function services() {
  const analytics = new AnalyticsService(repositories.analytics, repositories.members);
  return { analytics, reporting: new ReportingService(analytics) };
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
  options?: { rate?: string; allocatedMinutes?: number },
) {
  return createContract(
    context,
    {
      clientId,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      billingModel: "HOURLY",
      rate: options?.rate ?? "80",
      currency: "EUR",
      monthlyContractedHours: "80",
      allocatedMinutes: options?.allocatedMinutes,
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

describe("ReportingService entity filters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the unfiltered report when no Client or Contract filter is set", async () => {
    const graph = await createWorkspaceGraph(repositories, "filter-none");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const unfiltered = await reporting.getContractReport(context, JUNE);
    const filtered = await reporting.getContractReport(context, JUNE, new Date(), {});

    expect(filtered.accrued).toEqual(unfiltered.accrued);
    expect(filtered.expected).toEqual(unfiltered.expected);
    expect(filtered.forecast).toEqual(unfiltered.forecast);
    expect(filtered.contractAllocations).toEqual(unfiltered.contractAllocations);
    expect(filtered.filter).toEqual({});
  });

  it("intersects Period + Client + Contract and agrees with AnalyticsService", async () => {
    const graph = await createWorkspaceGraph(repositories, "filter-intersect");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
      allocatedMinutes: 1000,
    });

    const otherClient = await addClient(context, "Other Client");
    const otherContract = await addHourlyContract(context, otherClient.id, {
      rate: "100",
      allocatedMinutes: 2000,
    });

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
    await createTimeEntry(
      context,
      {
        clientId: otherClient.id,
        contractId: otherContract.id,
        workDate: date("2026-06-11"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { analytics, reporting } = services();
    const filter = { clientId: graph.clientId, contractId: graph.contractId };
    const report = await reporting.getContractReport(context, JUNE, new Date(), filter);
    const hours = await reporting.getHoursByClient(context, JUNE, new Date(), filter);
    const period = report.period;

    expect(report.filter).toEqual(filter);
    expect(report.accrued).toEqual(await analytics.getAccruedRevenue(context, period, filter));
    expect(report.expected).toEqual(await analytics.getExpectedRevenue(context, period, filter));
    expect(report.forecast).toBeNull();
    expect(report.contractAllocations).toEqual(
      await analytics.listContractAllocations(context, filter),
    );
    expect(report.contractUtilizations.map((row) => row.contractId)).toEqual([graph.contractId]);
    expect(report.accrued.byContract.map((row) => row.contractId)).toEqual([graph.contractId]);
    expect(report.expected.byContract.map((row) => row.contractId)).toEqual([graph.contractId]);
    expect(report.contractAllocations.map((row) => row.contractId)).toEqual([graph.contractId]);
    expect(hours.clientAllocations.map((row) => row.clientId)).toEqual([graph.clientId]);
    expect(hours.clientAllocations[0]?.totalMinutes).toBe(120);
  });

  it("returns empty results when Client and Contract do not belong together", async () => {
    const graph = await createWorkspaceGraph(repositories, "filter-mismatch");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    const otherClient = await addClient(context, "Mismatch Client");
    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 90,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const report = await reporting.getContractReport(context, JUNE, new Date(), {
      clientId: otherClient.id,
      contractId: graph.contractId,
    });
    const hours = await reporting.getHoursByClient(context, JUNE, new Date(), {
      clientId: otherClient.id,
      contractId: graph.contractId,
    });

    expect(report.accrued.byCurrency).toEqual([]);
    expect(report.accrued.byContract).toEqual([]);
    expect(report.expected.byCurrency).toEqual([]);
    expect(report.expected.byContract).toEqual([]);
    expect(report.contractUtilizations).toEqual([]);
    expect(report.contractAllocations).toEqual([]);
    expect(hours.clientAllocations).toEqual([]);
  });

  it("does not leak a foreign workspace Client or Contract id", async () => {
    const home = await createWorkspaceGraph(repositories, "filter-home");
    const foreign = await createWorkspaceGraph(repositories, "filter-foreign");
    const context = contextFrom(home);

    await repositories.contracts.updateContract(home.workspaceId, home.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    await repositories.contracts.updateContract(foreign.workspaceId, foreign.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "120.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    await createTimeEntry(
      context,
      {
        clientId: home.clientId,
        contractId: home.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      contextFrom(foreign),
      {
        clientId: foreign.clientId,
        contractId: foreign.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 180,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const byForeignClient = await reporting.getContractReport(context, JUNE, new Date(), {
      clientId: foreign.clientId,
    });
    const byForeignContract = await reporting.getContractReport(context, JUNE, new Date(), {
      contractId: foreign.contractId,
    });

    expect(byForeignClient.accrued.byCurrency).toEqual([]);
    expect(byForeignClient.expected.byContract).toEqual([]);
    expect(byForeignClient.contractAllocations).toEqual([]);
    expect(byForeignContract.accrued.byCurrency).toEqual([]);
    expect(byForeignContract.expected.byContract).toEqual([]);
    expect(byForeignContract.contractAllocations).toEqual([]);
  });

  it("keeps Forecast null on historical/custom even when entity filters match", async () => {
    const graph = await createWorkspaceGraph(repositories, "filter-forecast");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const historical = await reporting.getContractReport(context, JUNE, new Date(), {
      clientId: graph.clientId,
    });
    const current = await reporting.getContractReport(
      context,
      { kind: "month" },
      new Date(),
      { clientId: graph.clientId },
    );
    const currentPeriod = getCurrentMonthPeriod(context.timezone);

    expect(historical.forecast).toBeNull();
    expect(current.period).toEqual(currentPeriod);
    expect(current.forecast).not.toBeNull();
    expect(current.forecast?.byContract.map((row) => row.contractId)).toEqual([
      graph.contractId,
    ]);
  });

  it("filters by Contract only", async () => {
    const graph = await createWorkspaceGraph(repositories, "filter-contract-only");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
      allocatedMinutes: 1000,
    });
    const otherClient = await addClient(context, "Contract-only Other");
    const otherContract = await addHourlyContract(context, otherClient.id, {
      allocatedMinutes: 500,
    });

    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 90,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        clientId: otherClient.id,
        contractId: otherContract.id,
        workDate: date("2026-06-11"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const report = await reporting.getContractReport(context, JUNE, new Date(), {
      contractId: graph.contractId,
    });
    const hours = await reporting.getHoursByClient(context, JUNE, new Date(), {
      contractId: graph.contractId,
    });

    expect(report.filter).toEqual({ contractId: graph.contractId });
    expect(report.contractUtilizations.map((row) => row.contractId)).toEqual([
      graph.contractId,
    ]);
    expect(report.expected.byContract.map((row) => row.contractId)).toEqual([
      graph.contractId,
    ]);
    expect(report.contractAllocations.map((row) => row.contractId)).toEqual([
      graph.contractId,
    ]);
    expect(hours.clientAllocations.map((row) => row.clientId)).toEqual([
      graph.clientId,
    ]);
    expect(hours.clientAllocations[0]?.totalMinutes).toBe(90);
  });

  it("returns empty results for an unknown same-workspace UUID", async () => {
    const graph = await createWorkspaceGraph(repositories, "filter-unknown-id");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const unknownId = "33333333-3333-4333-8333-333333333333";
    const { reporting } = services();
    const report = await reporting.getContractReport(context, JUNE, new Date(), {
      clientId: unknownId,
    });
    const hours = await reporting.getHoursByClient(context, JUNE, new Date(), {
      contractId: unknownId,
    });

    expect(report.accrued.byCurrency).toEqual([]);
    expect(report.expected.byContract).toEqual([]);
    expect(report.contractUtilizations).toEqual([]);
    expect(report.contractAllocations).toEqual([]);
    expect(hours.clientAllocations).toEqual([]);
  });

  it("keeps period-boundary time under a Client filter", async () => {
    const graph = await createWorkspaceGraph(repositories, "filter-boundary");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });

    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-05-31"),
        durationMinutes: 60,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-06-01"),
        durationMinutes: 45,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-06-30"),
        durationMinutes: 30,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const report = await reporting.getContractReport(context, JUNE, new Date(), {
      clientId: graph.clientId,
    });
    const hours = await reporting.getHoursByClient(context, JUNE, new Date(), {
      clientId: graph.clientId,
    });

    expect(hours.clientAllocations[0]?.totalMinutes).toBe(75);
    expect(report.accrued.byContract[0]?.unrounded).toBe(100);
    expect(report.filter).toEqual({ clientId: graph.clientId });
  });

  it("filters allocation by entity without slicing it by report period", async () => {
    const graph = await createWorkspaceGraph(repositories, "filter-alloc");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      allocatedMinutes: 1000,
    });
    const otherClient = await addClient(context, "Alloc Other");
    const otherContract = await addHourlyContract(context, otherClient.id, {
      allocatedMinutes: 500,
    });

    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-03-10"),
        durationMinutes: 200,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await createTimeEntry(
      context,
      {
        clientId: otherClient.id,
        contractId: otherContract.id,
        workDate: date("2026-06-10"),
        durationMinutes: 50,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const report = await reporting.getContractReport(context, JUNE, new Date(), {
      clientId: graph.clientId,
    });

    expect(report.accrued.byCurrency).toEqual([]);
    expect(report.contractAllocations).toEqual([
      expect.objectContaining({
        contractId: graph.contractId,
        allocatedMinutes: 1000,
        consumedMinutes: 200,
        remainingMinutes: 800,
        allocationStatus: "NORMAL",
      }),
    ]);
  });
});
