// tests/integration/reporting/report-pdf-export.test.ts
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import { ReportingService } from "@/application/reporting/reporting-service";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { serializeReportCsv } from "@/features/reporting/report-csv";
import { buildReportPdfDocDefinition } from "@/features/reporting/report-pdf-definition";
import { serializeReportPdf } from "@/features/reporting/report-pdf";
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
      commitmentMode: "PERCENTAGE",
      commitmentValue: "60",
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

async function exportPdf(
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
  const payload = { hoursByClient, contractReport, revenueOverview };
  return {
    ...payload,
    definition: buildReportPdfDocDefinition(payload),
    buffer: await serializeReportPdf(payload),
  };
}

function flattenText(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenText(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("text" in record) {
      return flattenText(record.text);
    }
    return Object.values(record).flatMap((item) => flattenText(item));
  }
  return [];
}

describe("report PDF export dataset", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports authoritative reporting DTOs into a valid PDF", async () => {
    const graph = await createWorkspaceGraph(repositories, "pdf-auth");
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
    const { buffer, definition, hoursByClient, revenueOverview } = await exportPdf(
      reporting,
      context,
      JUNE,
    );
    const texts = flattenText(definition.content);

    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(texts).toContain("Revenue");
    expect(texts).toContain("Hours by Client");
    expect(texts).toContain("Contract Report");
    expect(hoursByClient.clientAllocations[0]?.totalMinutes).toBe(60);
    expect(texts).toContain("60");
    expect(revenueOverview.invoiced[0]?.currency).toBe("EUR");
    expect(texts).toContain("Invoiced");
    expect(texts).toContain("EUR");
  });

  it("preserves client/contract filters in Hours and Contract sections", async () => {
    const graph = await createWorkspaceGraph(repositories, "pdf-filter");
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
    const otherClient = await addClient(context, "PDF Other");
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
    const { definition, hoursByClient, contractReport } = await exportPdf(
      reporting,
      context,
      JUNE,
      filter,
    );
    const texts = flattenText(definition.content);

    expect(hoursByClient.clientAllocations).toHaveLength(1);
    expect(contractReport.filter).toEqual(filter);
    const joined = texts.join("\n");
    expect(joined).toContain(`clientId=${graph.clientId}`);
    expect(joined).toContain(`contractId=${graph.contractId}`);
    expect(joined).not.toContain("PDF Other");
  });

  it("isolates workspace data for PDF export", async () => {
    const graphA = await createWorkspaceGraph(repositories, "pdf-ws-a");
    const graphB = await createWorkspaceGraph(repositories, "pdf-ws-b");
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
    const exportB = await exportPdf(reporting, contextB, JUNE);
    const texts = flattenText(exportB.definition.content);

    expect(exportB.revenueOverview.invoiced).toEqual([]);
    expect(exportB.hoursByClient.clientAllocations).toEqual([]);
    expect(texts).toContain("No hours by client for this period.");
    expect(texts).not.toContain("Invoiced");
  });

  it("preserves multi-currency revenue rows without a mixed total", async () => {
    const graph = await createWorkspaceGraph(repositories, "pdf-fx");
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
    const { definition, revenueOverview } = await exportPdf(reporting, context, JUNE);
    const texts = flattenText(definition.content);

    expect(revenueOverview.invoiced.map((row) => row.currency).sort()).toEqual([
      "EUR",
      "USD",
    ]);
    expect(texts).toContain("EUR");
    expect(texts).toContain("USD");
    expect(texts).toContain("500.00");
    expect(texts).toContain("300.00");
    expect(texts.join(" ")).not.toMatch(/\btotal\b/i);
  });

  it("leaves CSV and XLSX serialization unchanged for the same DTOs", async () => {
    const graph = await createWorkspaceGraph(repositories, "pdf-regress");
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
    const [hoursByClient, contractReport, revenueOverview] = await Promise.all([
      reporting.getHoursByClient(context, JUNE, new Date()),
      reporting.getContractReport(context, JUNE, new Date()),
      reporting.getRevenueOverview(context, JUNE, new Date()),
    ]);

    const csv = serializeReportCsv({ hoursByClient, contractReport });
    const xlsx = serializeReportXlsx({
      hoursByClient,
      contractReport,
      revenueOverview,
    });

    expect(csv).toContain("section,hours_by_client");
    expect(csv).toContain(",45,45,");
    expect(xlsx.subarray(0, 2).toString("utf8")).toBe("PK");
  });

  it("keeps the PDF serializer free of direct persistence access", () => {
    const serializer = readFileSync("src/features/reporting/report-pdf.ts", "utf8");
    const definition = readFileSync(
      "src/features/reporting/report-pdf-definition.ts",
      "utf8",
    );
    expect(serializer).toContain('import "server-only"');
    expect(serializer).not.toMatch(/prisma|createRepositories|@\/infrastructure/i);
    expect(definition).not.toMatch(/prisma|createRepositories|@\/infrastructure/i);
  });
});
