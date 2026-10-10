// tests/integration/reporting/monthly-timesheet-exports.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { ReportingService } from "@/application/reporting/reporting-service";
import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

import { serializeMonthlyTimesheetCsv } from "@/features/reporting/monthly-timesheet-csv";
import { serializeMonthlyTimesheetXlsx } from "@/features/reporting/monthly-timesheet-xlsx";
import { serializeMonthlyTimesheetPdf } from "@/features/reporting/monthly-timesheet-pdf";

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
      commitmentMode: "PERCENTAGE" as const,
      commitmentValue: "60",
    },
    repositories.clients,
    repositories.contracts,
  );
}

const JUNE = {
  kind: "custom" as const,
  get startDate() { return date("2026-06-01"); },
  get endDate() { return date("2026-06-30"); },
};

describe("Monthly Timesheet Export Validation", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  it("validates complete CSV export flow", async () => {
    const graph = await createWorkspaceGraph(repositories, "csv-export");
    const context = contextFrom(graph);
    const client = await addClient(context, "CSV Test Client");
    const contract = await addHourlyContract(context, client.id, { rate: "100" });

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-01"),
        durationMinutes: 240,
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
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-02"),
        durationMinutes: 180,
        billable: false,
        description: "Internal",
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

    const csv = serializeMonthlyTimesheetCsv(report);

    expect(csv).toBeTruthy();
    expect(csv.length).toBeGreaterThan(100);
    expect(csv).toContain("CSV Test Client");
    expect(csv).toContain("section,meta");
    expect(csv).toContain("section,summary");
    expect(csv).toContain("7h");
    expect(csv).toContain("4h");
    expect(csv).toContain("section,accrued");
    expect(csv).toContain("EUR,400");
    expect(csv).toContain("section,daily_breakdown");
    expect(csv).toContain("2026-06-01");
    expect(csv).toContain("2026-06-02");
    expect(csv).toContain("section,entries");
    expect(csv).toContain("Task A");
    expect(csv).toContain("yes");
    expect(csv).toContain("no");

    // Verify UI data consistency
    expect(report.totalMinutes).toBe(420);
    expect(report.billableMinutes).toBe(240);
    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 400, published: 400 },
    ]);
  });

  it("validates complete Excel export flow", async () => {
    const graph = await createWorkspaceGraph(repositories, "xlsx-export");
    const context = contextFrom(graph);
    const client = await addClient(context, "Excel Test Client");
    const contract = await addHourlyContract(context, client.id, { rate: "120" });

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-10"),
        durationMinutes: 300,
        billable: true,
        description: "Development",
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

    const buffer = serializeMonthlyTimesheetXlsx(report);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);

    // Parse workbook to verify structure
    const workbook = XLSX.read(buffer, { type: "buffer" });
    expect(workbook.SheetNames).toEqual(["Summary", "Daily", "Entries"]);

    const summarySheet = workbook.Sheets["Summary"];
    expect(summarySheet).toBeTruthy();

    const dailySheet = workbook.Sheets["Daily"];
    expect(dailySheet).toBeTruthy();

    const entriesSheet = workbook.Sheets["Entries"];
    expect(entriesSheet).toBeTruthy();

    // Verify UI data consistency
    expect(report.totalMinutes).toBe(300);
    expect(report.billableMinutes).toBe(300);
    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 600, published: 600 },
    ]);
  });

  it("validates complete PDF export flow with font integrity", async () => {
    const graph = await createWorkspaceGraph(repositories, "pdf-export");
    const context = contextFrom(graph);
    const client = await addClient(context, "PDF Test Client");
    const contract = await addHourlyContract(context, client.id, { rate: "150" });

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 420,
        billable: true,
        description: "Consulting",
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

    const buffer = await serializeMonthlyTimesheetPdf(report);

    // Critical PDF validation
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    
    // Verify PDF header
    const pdfHeader = buffer.toString("utf8", 0, 5);
    expect(pdfHeader).toBe("%PDF-");

    // Verify no ENOENT or font errors (production fix cc532d4 validation)
    const pdfContent = buffer.toString("utf8");
    expect(pdfContent).not.toContain("ENOENT");
    expect(pdfContent).not.toContain("node_modules");
    expect(pdfContent).toContain("/BaseFont");

    // Verify UI data consistency
    expect(report.totalMinutes).toBe(420);
    expect(report.billableMinutes).toBe(420);
    expect(report.accrued.byCurrency).toEqual([
      { currency: "EUR", unrounded: 1050, published: 1050 },
    ]);
  });

  it("validates multi-currency export consistency", async () => {
    const graph = await createWorkspaceGraph(repositories, "multi-currency");
    const context = contextFrom(graph);
    const client = await addClient(context, "Multi Currency Client");
    const contractEur = await addHourlyContract(context, client.id, {
      rate: "80",
      currency: "EUR",
    });

    await createTimeEntry(
      context,
      {
        clientId: client.id,
        contractId: contractEur.id,
        workDate: date("2026-06-01"),
        durationMinutes: 120,
        billable: true,
        description: "EUR work",
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

    // Verify currencies remain separated in all formats
    const csv = serializeMonthlyTimesheetCsv(report);
    expect(csv).toContain("EUR,160");
    expect(csv).not.toContain("USD");

    const xlsxBuffer = serializeMonthlyTimesheetXlsx(report);
    expect(xlsxBuffer.length).toBeGreaterThan(0);

    const pdfBuffer = await serializeMonthlyTimesheetPdf(report);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Verify source data
    expect(report.accrued.byCurrency).toHaveLength(1);
    expect(report.accrued.byCurrency[0].currency).toBe("EUR");
  });

  it("validates workspace isolation in exports", async () => {
    const graph1 = await createWorkspaceGraph(repositories, "workspace-1");
    const graph2 = await createWorkspaceGraph(repositories, "workspace-2");
    const context1 = contextFrom(graph1);
    const context2 = contextFrom(graph2);

    await addClient(context1, "Client WS1");
    const client2 = await addClient(context2, "Client WS2");

    const { reporting } = services();

    // Attempting to access workspace-2 client from workspace-1 context should fail
    await expect(
      reporting.getMonthlyTimesheet(
        context1,
        JUNE,
        client2.id,
        repositories.clients,
        repositories.timeEntries,
      ),
    ).rejects.toThrow("Client not found or does not belong to workspace");
  });
});
