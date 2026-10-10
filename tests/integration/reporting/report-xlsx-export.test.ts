// tests/integration/reporting/report-xlsx-export.test.ts
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { serializeReportCsv } from "@/features/reporting/report-csv";
import { serializeReportXlsx } from "@/features/reporting/report-xlsx";

import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories } from "../persistence/helpers";

function services() {
  const analytics = new AnalyticsService(repositories.analytics, repositories.members);
  const invoices = new WorkspaceInvoiceService(
    repositories.invoices,
    repositories.payments,
    repositories.clients,
    repositories.contracts,
  );
  return {
    analytics,
    reporting: new ReportingService(analytics, invoices),
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
  options?: { rate?: string; currency?: string; commitmentValue?: string },
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
      commitmentMode: "PERCENTAGE" as const,
      commitmentValue: options?.commitmentValue ?? "60",
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

async function exportXlsx(
  reporting: ReportingService,
  context: WorkspaceContext,
  request: typeof JUNE,
  filter?: { clientId?: string; contractId?: string },
) {
  const [hoursByClient, contractReport, revenueOverview] = await Promise.all([
    reporting.getHoursByClient(context, request, new Date(), filter),
    reporting.getContractReport(context, request, new Date(), filter),
    reporting.getRevenueOverview(context, request, new Date()),
  ]);
  return {
    hoursByClient,
    contractReport,
    revenueOverview,
    buffer: serializeReportXlsx({ hoursByClient, contractReport, revenueOverview }),
  };
}

function sheetRows(buffer: Buffer, name: string): unknown[][] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  expect(workbook.SheetNames).toContain(name);
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
    header: 1,
    defval: null,
    raw: true,
  });
}

describe("report XLSX export dataset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports authoritative reporting DTOs into valid worksheets", async () => {
    const graph = await createWorkspaceGraph(repositories, "xlsx-auth");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: null,
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
    await repositories.invoices.createInvoice(graph.workspaceId, {
      contractId: graph.contractId,
      invoiceDate: date("2026-06-12"),
      amount: "400.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: date("2026-07-12"),
    });

    const { reporting } = services();
    const { buffer, hoursByClient, contractReport, revenueOverview } = await exportXlsx(
      reporting,
      context,
      JUNE,
    );

    expect(buffer.subarray(0, 2).toString("utf8")).toBe("PK");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    expect(workbook.SheetNames).toEqual([
      "Revenue",
      "HoursByClient",
      "ContractReport",
    ]);

    const revenueRows = sheetRows(buffer, "Revenue");
    const accruedPublished = contractReport.accrued.byCurrency[0]?.published;
    expect(accruedPublished).toBeDefined();
    expect(revenueRows).toContainEqual(["accrued", "EUR", accruedPublished]);
    expect(revenueRows).toContainEqual([
      "invoiced",
      "EUR",
      Number(revenueOverview.invoiced[0]?.amount),
    ]);
    expect(hoursByClient.clientAllocations[0]?.totalMinutes).toBe(60);
    expect(sheetRows(buffer, "HoursByClient")).toContainEqual([
      hoursByClient.clientAllocations[0]?.clientName,
      false,
      60,
      60,
      100,
    ]);
  });

  it("preserves client/contract filters on Hours and ContractReport sheets", async () => {
    const graph = await createWorkspaceGraph(repositories, "xlsx-filter");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: null,
    });
    const otherClient = await addClient(context, "XLSX Other");
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
    const filter = { clientId: graph.clientId, contractId: graph.contractId };
    const { buffer, hoursByClient } = await exportXlsx(reporting, context, JUNE, filter);
    const hoursRows = sheetRows(buffer, "HoursByClient");
    const contractRows = sheetRows(buffer, "ContractReport");

    expect(hoursByClient.clientAllocations).toHaveLength(1);
    expect(hoursRows.some((row) => row.includes("XLSX Other"))).toBe(false);
    expect(contractRows.some((row) => row.includes("XLSX Other"))).toBe(false);
    expect(hoursRows).toContainEqual([
      hoursByClient.clientAllocations[0]?.clientName,
      false,
      90,
      90,
      100,
    ]);
  });

  it("isolates workspace data and never mixes foreign workspace rows", async () => {
    const graphA = await createWorkspaceGraph(repositories, "xlsx-ws-a");
    const graphB = await createWorkspaceGraph(repositories, "xlsx-ws-b");
    const contextA = contextFrom(graphA);
    const contextB = contextFrom(graphB);

    await repositories.contracts.updateContract(graphA.workspaceId, graphA.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: null,
    });
    await createTimeEntry(
      contextA,
      {
        clientId: graphA.clientId,
        contractId: graphA.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 120,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );
    await repositories.invoices.createInvoice(graphA.workspaceId, {
      contractId: graphA.contractId,
      invoiceDate: date("2026-06-12"),
      amount: "800.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: date("2026-07-12"),
    });

    const { reporting } = services();
    const exportB = await exportXlsx(reporting, contextB, JUNE);
    const revenueB = sheetRows(exportB.buffer, "Revenue");
    const hoursB = sheetRows(exportB.buffer, "HoursByClient");

    expect(revenueB.some((row) => row[0] === "invoiced")).toBe(false);
    expect(hoursB).toHaveLength(1);
    expect(exportB.revenueOverview.invoiced).toEqual([]);
    expect(exportB.hoursByClient.clientAllocations).toEqual([]);
  });

  it("preserves multi-currency revenue rows without a mixed total", async () => {
    const graph = await createWorkspaceGraph(repositories, "xlsx-fx");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: null,
    });
    const usdClient = await addClient(context, "USD Client");
    const usdContract = await addHourlyContract(context, usdClient.id, {
      currency: "USD",
      rate: "100",
    });
    await repositories.invoices.createInvoice(graph.workspaceId, {
      contractId: graph.contractId,
      invoiceDate: date("2026-06-12"),
      amount: "500.0000",
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: date("2026-07-12"),
    });
    await repositories.invoices.createInvoice(graph.workspaceId, {
      contractId: usdContract.id,
      invoiceDate: date("2026-06-13"),
      amount: "300.0000",
      currency: "USD",
      paymentTermsDays: 30,
      dueDate: date("2026-07-13"),
    });

    const { reporting } = services();
    const { buffer, revenueOverview } = await exportXlsx(reporting, context, JUNE);
    const revenueRows = sheetRows(buffer, "Revenue");
    const joined = revenueRows.map((row) => row.join(",")).join("\n");

    expect(revenueOverview.invoiced.map((row) => row.currency).sort()).toEqual([
      "EUR",
      "USD",
    ]);
    expect(revenueRows).toContainEqual(["invoiced", "EUR", 500]);
    expect(revenueRows).toContainEqual(["invoiced", "USD", 300]);
    expect(joined).not.toMatch(/\btotal\b/i);
    expect(
      revenueRows.filter((row) => row[0] === "invoiced").every((row) => row[1] === "EUR" || row[1] === "USD"),
    ).toBe(true);
  });

  it("leaves CSV serialization behavior unchanged for the same DTOs", async () => {
    const graph = await createWorkspaceGraph(repositories, "xlsx-csv");
    const context = contextFrom(graph);
    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-12-31"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: null,
    });
    await createTimeEntry(
      context,
      {
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-06-10"),
        durationMinutes: 45,
        billable: true,
      },
      repositories.clients,
      repositories.contracts,
      repositories.timeEntries,
    );

    const { reporting } = services();
    const [hoursByClient, contractReport] = await Promise.all([
      reporting.getHoursByClient(context, JUNE, new Date()),
      reporting.getContractReport(context, JUNE, new Date()),
    ]);
    const csv = serializeReportCsv({ hoursByClient, contractReport });

    expect(csv).toContain("section,meta");
    expect(csv).toContain("section,hours_by_client");
    expect(csv).toContain("section,contract_report");
    expect(csv).toContain(",45,45,");
  });

  it("keeps the XLSX serializer free of direct persistence access", () => {
    const source = readFileSync("src/features/reporting/report-xlsx.ts", "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).not.toMatch(/prisma|createRepositories|@\/infrastructure/i);
    expect(source).not.toMatch(/getContractReport|getHoursByClient|getRevenueOverview/);
  });
});
