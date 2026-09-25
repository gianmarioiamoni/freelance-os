// tests/integration/reporting/report-csv-export.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { ReportingService } from "@/application/reporting/reporting-service";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { serializeReportCsv } from "@/features/reporting/report-csv";

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

async function exportCsv(
  reporting: ReportingService,
  context: WorkspaceContext,
  request: typeof JUNE | { kind: "month" },
  filter?: { clientId?: string; contractId?: string },
) {
  const [hoursByClient, contractReport] = await Promise.all([
    reporting.getHoursByClient(context, request, new Date(), filter),
    reporting.getContractReport(context, request, new Date(), filter),
  ]);
  return {
    hoursByClient,
    contractReport,
    csv: serializeReportCsv({ hoursByClient, contractReport }),
  };
}

describe("report CSV export dataset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports the unfiltered operational dataset", async () => {
    const graph = await createWorkspaceGraph(repositories, "csv-none");
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
    const { csv, contractReport, hoursByClient } = await exportCsv(
      reporting,
      context,
      JUNE,
    );

    expect(csv).toContain("period_kind,period_start,period_end,client_id,contract_id");
    expect(csv).toContain("custom,2026-06-01,2026-06-30,,");
    expect(csv).toContain(`accrued,EUR,${contractReport.accrued.byCurrency[0]?.published}`);
    expect(csv).toContain(`expected,EUR,${contractReport.expected.byCurrency[0]?.published}`);
    expect(hoursByClient.clientAllocations[0]?.totalMinutes).toBe(60);
    expect(csv).toContain(`${hoursByClient.clientAllocations[0]?.clientName},false,60,60,`);
  });

  it("intersects Period + Client + Contract and matches the read model", async () => {
    const graph = await createWorkspaceGraph(repositories, "csv-intersect");
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
    const otherClient = await addClient(context, "CSV Other");
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
    const filter = { clientId: graph.clientId, contractId: graph.contractId };
    const { csv, contractReport, hoursByClient } = await exportCsv(
      reporting,
      context,
      JUNE,
      filter,
    );

    expect(csv).toContain(`custom,2026-06-01,2026-06-30,${graph.clientId},${graph.contractId}`);
    expect(csv).not.toContain("CSV Other");
    expect(hoursByClient.clientAllocations).toHaveLength(1);
    expect(hoursByClient.clientAllocations[0]?.totalMinutes).toBe(90);
    expect(contractReport.accrued.byCurrency).toHaveLength(1);
    expect(csv).toContain(`accrued,EUR,${contractReport.accrued.byCurrency[0]?.published}`);
    expect(csv).toContain(`expected,EUR,${contractReport.expected.byCurrency[0]?.published}`);
    expect(csv).toContain(
      `${contractReport.contractAllocations[0]?.allocatedMinutes},${contractReport.contractAllocations[0]?.consumedMinutes},${contractReport.contractAllocations[0]?.remainingMinutes},${contractReport.contractAllocations[0]?.allocationStatus}`,
    );
  });

  it("filters by Client only and by Contract only", async () => {
    const graph = await createWorkspaceGraph(repositories, "csv-entity");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    const otherClient = await addClient(context, "CSV Contract Other");
    const otherContract = await addHourlyContract(context, otherClient.id);

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
    const byClient = await exportCsv(reporting, context, JUNE, {
      clientId: graph.clientId,
    });
    const byContract = await exportCsv(reporting, context, JUNE, {
      contractId: graph.contractId,
    });

    expect(byClient.csv).toContain(graph.clientId);
    expect(byClient.csv).not.toContain("CSV Contract Other");
    expect(byClient.hoursByClient.clientAllocations[0]?.totalMinutes).toBe(90);
    expect(byContract.csv).toContain(graph.contractId);
    expect(byContract.csv).not.toContain("CSV Contract Other");
    expect(byContract.hoursByClient.clientAllocations[0]?.totalMinutes).toBe(90);
  });

  it("returns a valid empty CSV for Client/Contract mismatch", async () => {
    const graph = await createWorkspaceGraph(repositories, "csv-mismatch");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4800,
    });
    const otherClient = await addClient(context, "CSV Mismatch");
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
    const { csv, contractReport, hoursByClient } = await exportCsv(
      reporting,
      context,
      JUNE,
      { clientId: otherClient.id, contractId: graph.contractId },
    );

    expect(contractReport.accrued.byCurrency).toEqual([]);
    expect(hoursByClient.clientAllocations).toEqual([]);
    expect(csv).toContain("section,revenue");
    expect(csv).toContain("metric,currency,published");
    expect(csv).not.toContain("accrued,");
    expect(csv).not.toContain("CSV Mismatch");
  });

  it("does not leak a foreign workspace Client or Contract id", async () => {
    const home = await createWorkspaceGraph(repositories, "csv-home");
    const foreign = await createWorkspaceGraph(repositories, "csv-foreign");
    const context = contextFrom(home);
    await repositories.contracts.updateContract(home.workspaceId, home.contractId, {
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
    const byForeignClient = await exportCsv(reporting, context, JUNE, {
      clientId: foreign.clientId,
    });
    const byForeignContract = await exportCsv(reporting, context, JUNE, {
      contractId: foreign.contractId,
    });

    expect(byForeignClient.contractReport.accrued.byCurrency).toEqual([]);
    expect(byForeignClient.csv).not.toContain("accrued,");
    expect(byForeignClient.csv).toContain(foreign.clientId);
    expect(byForeignContract.contractReport.accrued.byCurrency).toEqual([]);
    expect(byForeignContract.csv).not.toContain("180");
  });

  it("respects a custom period and keeps Forecast null on historical ranges", async () => {
    const graph = await createWorkspaceGraph(repositories, "csv-custom");
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
    const historical = await exportCsv(reporting, context, JUNE);
    const current = await exportCsv(reporting, context, { kind: "month" });

    expect(historical.contractReport.forecast).toBeNull();
    expect(historical.csv).not.toContain("forecast,");
    expect(historical.csv).toContain("custom,2026-06-01,2026-06-30,,");
    expect(current.contractReport.forecast).not.toBeNull();
    expect(current.csv).toContain(
      `forecast,EUR,${current.contractReport.forecast?.byCurrency[0]?.published}`,
    );
    expect(current.csv).toContain("month,2026-06-01,2026-06-15,,");
  });

  it("emits headers only for an empty workspace result", async () => {
    const graph = await createWorkspaceGraph(repositories, "csv-empty");
    const context = contextFrom(graph);
    const emptyPeriod = {
      kind: "custom" as const,
      startDate: date("2027-01-01"),
      endDate: date("2027-01-31"),
    };

    const { reporting } = services();
    const { csv, contractReport, hoursByClient } = await exportCsv(
      reporting,
      context,
      emptyPeriod,
    );

    expect(hoursByClient.clientAllocations).toEqual([]);
    expect(contractReport.contractUtilizations).toEqual([]);
    expect(csv).toContain("section,meta");
    expect(csv).toContain("section,revenue");
    expect(csv).toContain("section,hours_by_client");
    expect(csv).toContain("section,contract_report");
    expect(csv).not.toContain("accrued,");
  });
});
