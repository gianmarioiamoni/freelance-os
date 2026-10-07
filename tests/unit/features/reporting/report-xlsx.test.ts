// tests/unit/features/reporting/report-xlsx.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import type {
  ContractReport,
  HoursByClientReport,
  RevenueOverview,
} from "@/application/reporting/reporting-service";
import {
  createReportXlsxResponse,
  reportXlsxFilename,
  serializeReportXlsx,
} from "@/features/reporting/report-xlsx";
import type {
  AccruedRevenue,
  ExpectedRevenue,
  ForecastRevenue,
} from "@/domain/analytics-types";

const period = {
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T00:00:00.000Z"),
};

const accrued: AccruedRevenue = {
  period,
  timezone: "UTC",
  byCurrency: [
    { currency: "EUR", unrounded: 160.4, published: 160 },
    { currency: "USD", unrounded: 80.2, published: 80 },
  ],
  byContract: [],
};

const expected: ExpectedRevenue = {
  period,
  timezone: "UTC",
  byCurrency: [
    { currency: "EUR", unrounded: 6400, published: 6400 },
    { currency: "USD", unrounded: 1000, published: 1000 },
  ],
  byContract: [],
};

const forecast: ForecastRevenue = {
  period,
  timezone: "UTC",
  elapsedPeriod: 15,
  totalPeriod: 30,
  byCurrency: [{ currency: "EUR", unrounded: 320, published: 320 }],
  byContract: [],
};

function contractReport(overrides: Partial<ContractReport> = {}): ContractReport {
  return {
    period,
    periodKind: { kind: "custom", startDate: period.startDate, endDate: period.endDate },
    filter: {},
    contractUtilizations: [
      {
        contractId: "contract-1",
        clientName: "ACME",
        isArchived: false,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: new Date("2027-01-01T00:00:00.000Z"),
        isOngoing: false,
        consumedMinutes: 120,
        contractedMinutes: 4800,
        utilizationPercentage: 2.5,
        isOutOfValidity: false,
      },
    ],
    contractAllocations: [
      {
        contractId: "contract-1",
        allocatedMinutes: 1000,
        consumedMinutes: 800,
        remainingMinutes: 200,
        allocationStatus: "WARNING",
      },
    ],
    accrued,
    expected,
    forecast,
    ...overrides,
  };
}

function hoursReport(
  overrides: Partial<HoursByClientReport> = {},
): HoursByClientReport {
  return {
    period,
    periodKind: { kind: "custom", startDate: period.startDate, endDate: period.endDate },
    filter: {},
    clientAllocations: [
      {
        clientId: "client-1",
        clientName: "ACME",
        isArchived: false,
        totalMinutes: 120,
        billableMinutes: 120,
        percentage: 100,
      },
    ],
    ...overrides,
  };
}

function revenueOverview(
  overrides: Partial<RevenueOverview> = {},
): RevenueOverview {
  return {
    period,
    periodKind: { kind: "custom", startDate: period.startDate, endDate: period.endDate },
    accrued,
    expected,
    forecast,
    invoiced: [
      { currency: "EUR", amount: "2500.50" },
      { currency: "USD", amount: "900" },
    ],
    paid: [{ currency: "EUR", amount: "1000" }],
    outstanding: [
      { currency: "EUR", amount: "1500.50" },
      { currency: "USD", amount: "900" },
    ],
    overdueCount: 1,
    ...overrides,
  };
}

function readWorkbook(buffer: Buffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "buffer", cellDates: true, cellStyles: true });
}

function sheetMatrix(workbook: XLSX.WorkBook, name: string): unknown[][] {
  const sheet = workbook.Sheets[name];
  expect(sheet).toBeDefined();
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
}

describe("serializeReportXlsx", () => {
  it("emits a valid workbook with deterministic worksheets", () => {
    const buffer = serializeReportXlsx({
      revenueOverview: revenueOverview(),
      hoursByClient: hoursReport(),
      contractReport: contractReport(),
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 2).toString("utf8")).toBe("PK");

    const workbook = readWorkbook(buffer);
    expect(workbook.SheetNames).toEqual([
      "Revenue",
      "HoursByClient",
      "ContractReport",
    ]);
  });

  it("serializes Revenue with per-currency numeric amounts and no mixed total", () => {
    const workbook = readWorkbook(
      serializeReportXlsx({
        revenueOverview: revenueOverview(),
        hoursByClient: hoursReport({ clientAllocations: [] }),
        contractReport: contractReport({
          contractUtilizations: [],
          contractAllocations: [],
        }),
      }),
    );

    const rows = sheetMatrix(workbook, "Revenue");
    expect(rows[0]).toEqual(["metric", "currency", "amount"]);
    expect(rows.slice(1)).toEqual([
      ["accrued", "EUR", 160],
      ["accrued", "USD", 80],
      ["expected", "EUR", 6400],
      ["expected", "USD", 1000],
      ["forecast", "EUR", 320],
      ["invoiced", "EUR", 2500.5],
      ["invoiced", "USD", 900],
      ["paid", "EUR", 1000],
      ["outstanding", "EUR", 1500.5],
      ["outstanding", "USD", 900],
    ]);

    const amountCell = workbook.Sheets.Revenue.C2;
    expect(amountCell?.t).toBe("n");
    expect(amountCell?.z).toBe("#,##0.00");

    const joined = rows.map((row) => row.join(",")).join("\n");
    expect(joined).not.toMatch(/total/i);
    expect(joined).not.toContain("160.4");
    expect(joined).not.toContain("overdue");
  });

  it("serializes HoursByClient minutes and share from the DTO", () => {
    const workbook = readWorkbook(
      serializeReportXlsx({
        revenueOverview: revenueOverview({
          accrued: { ...accrued, byCurrency: [] },
          expected: { ...expected, byCurrency: [] },
          forecast: null,
          invoiced: [],
          paid: [],
          outstanding: [],
        }),
        hoursByClient: hoursReport(),
        contractReport: contractReport({
          contractUtilizations: [],
          contractAllocations: [],
        }),
      }),
    );

    const rows = sheetMatrix(workbook, "HoursByClient");
    expect(rows[0]).toEqual([
      "client_name",
      "is_archived",
      "total_minutes",
      "billable_minutes",
      "share_percent",
    ]);
    expect(rows[1]).toEqual(["ACME", false, 120, 120, 100]);

    const minutesCell = workbook.Sheets.HoursByClient.C2;
    expect(minutesCell?.t).toBe("n");
    expect(minutesCell?.v).toBe(120);
  });

  it("serializes ContractReport utilization and allocation columns", () => {
    const workbook = readWorkbook(
      serializeReportXlsx({
        revenueOverview: revenueOverview({
          accrued: { ...accrued, byCurrency: [] },
          expected: { ...expected, byCurrency: [] },
          forecast: null,
          invoiced: [],
          paid: [],
          outstanding: [],
        }),
        hoursByClient: hoursReport({ clientAllocations: [] }),
        contractReport: contractReport(),
      }),
    );

    const rows = sheetMatrix(workbook, "ContractReport");
    expect(rows[0]).toEqual([
      "client_name",
      "is_archived",
      "is_ongoing",
      "is_out_of_validity",
      "consumed_minutes",
      "capacity_minutes",
      "utilization_percent",
      "allocated_minutes",
      "allocation_consumed_minutes",
      "remaining_minutes",
      "allocation_status",
    ]);
    expect(rows[1]).toEqual([
      "ACME",
      false,
      false,
      false,
      120,
      4800,
      2.5,
      1000,
      800,
      200,
      "WARNING",
    ]);
  });

  it("keeps empty datasets valid with headers, autofilter, and column widths", () => {
    const workbook = readWorkbook(
      serializeReportXlsx({
        revenueOverview: revenueOverview({
          accrued: { ...accrued, byCurrency: [] },
          expected: { ...expected, byCurrency: [] },
          forecast: null,
          invoiced: [],
          paid: [],
          outstanding: [],
          overdueCount: 0,
        }),
        hoursByClient: hoursReport({ clientAllocations: [] }),
        contractReport: contractReport({
          forecast: null,
          contractUtilizations: [],
          contractAllocations: [],
          accrued: { ...accrued, byCurrency: [] },
          expected: { ...expected, byCurrency: [] },
        }),
      }),
    );

    for (const name of ["Revenue", "HoursByClient", "ContractReport"] as const) {
      const sheet = workbook.Sheets[name];
      const rows = sheetMatrix(workbook, name);
      expect(rows).toHaveLength(1);
      expect(sheet["!autofilter"]).toBeDefined();
      expect(sheet["!cols"]?.length).toBeGreaterThan(0);
    }
  });

  it("does not import Prisma or query infrastructure", () => {
    const source = readFileSync(
      new URL("../../../../src/features/reporting/report-xlsx.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain('import "server-only"');
    expect(source).not.toMatch(/prisma|createRepositories|@\/infrastructure/i);
  });
});

describe("reportXlsxFilename", () => {
  it("derives a deterministic xlsx name from the resolved period", () => {
    expect(reportXlsxFilename(contractReport({ periodKind: { kind: "month" } }))).toBe(
      "reports-month-2026-06-01-2026-06-30.xlsx",
    );
  });
});

describe("createReportXlsxResponse", () => {
  it("sets XLSX content type and sanitized attachment filename", async () => {
    const body = Buffer.from("PK-test");
    const response = createReportXlsxResponse(
      body,
      "reports-month-2026-06-01-2026-06-15.xlsx",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reports-month-2026-06-01-2026-06-15.xlsx"',
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(body);
  });
});
