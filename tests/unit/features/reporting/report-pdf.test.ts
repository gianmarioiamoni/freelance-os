// tests/unit/features/reporting/report-pdf.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type {
  ContractReport,
  HoursByClientReport,
  RevenueOverview,
} from "@/application/reporting/reporting-service";
import { buildReportPdfDocDefinition } from "@/features/reporting/report-pdf-definition";
import {
  createReportPdfResponse,
  reportPdfFilename,
  serializeReportPdf,
} from "@/features/reporting/report-pdf";
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

function source(overrides?: {
  revenueOverview?: RevenueOverview;
  hoursByClient?: HoursByClientReport;
  contractReport?: ContractReport;
}) {
  return {
    revenueOverview: overrides?.revenueOverview ?? revenueOverview(),
    hoursByClient: overrides?.hoursByClient ?? hoursReport(),
    contractReport: overrides?.contractReport ?? contractReport(),
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

function rowTexts(row: unknown[]): string[] {
  return row.flatMap((cell) => flattenText(cell));
}

function tableBodies(
  definition: ReturnType<typeof buildReportPdfDocDefinition>,
): unknown[][][] {
  const content = Array.isArray(definition.content)
    ? definition.content
    : [definition.content];
  const bodies: unknown[][][] = [];

  for (const item of content) {
    if (typeof item !== "object" || item === null || !("table" in item)) {
      continue;
    }
    const table = (item as { table?: { body?: unknown[][] } }).table;
    if (table?.body) {
      bodies.push(table.body);
    }
  }

  return bodies;
}

describe("buildReportPdfDocDefinition", () => {
  it("uses deterministic section order and period metadata", () => {
    const definition = buildReportPdfDocDefinition(source());
    const texts = flattenText(definition.content);

    expect(texts.indexOf("Reports")).toBeGreaterThanOrEqual(0);
    expect(texts.some((text) => text.includes("custom (2026-06-01"))).toBe(true);
    expect(texts.indexOf("Revenue")).toBeLessThan(texts.indexOf("Hours by Client"));
    expect(texts.indexOf("Hours by Client")).toBeLessThan(
      texts.indexOf("Contract Report"),
    );
    expect(definition.pageOrientation).toBe("landscape");
    expect(definition.footer).toBeTypeOf("function");
  });

  it("keeps Revenue metrics currency-separated without a mixed total", () => {
    const bodies = tableBodies(buildReportPdfDocDefinition(source()));
    const revenueBody = bodies[0];
    expect(revenueBody[0]).toEqual([
      expect.objectContaining({ text: "Metric" }),
      expect.objectContaining({ text: "Currency" }),
      expect.objectContaining({ text: "Amount" }),
    ]);
    expect(flattenText(revenueBody)).toEqual(
      expect.arrayContaining([
        "Accrued",
        "EUR",
        "160.00",
        "USD",
        "80.00",
        "Expected",
        "6,400.00",
        "Forecast",
        "Invoiced",
        "2,500.50",
        "Paid",
        "Outstanding",
      ]),
    );
    expect(flattenText(revenueBody).join(" ")).not.toMatch(/\btotal\b/i);
    expect(flattenText(revenueBody).join(" ")).not.toContain("160.4");
  });

  it("serializes Hours by Client headers and representative rows", () => {
    const bodies = tableBodies(buildReportPdfDocDefinition(source()));
    const hoursBody = bodies[1];
    expect(rowTexts(hoursBody[0])).toEqual([
      "Client",
      "Archived",
      "Total minutes",
      "Billable minutes",
      "Share %",
    ]);
    expect(rowTexts(hoursBody[1])).toEqual(["ACME", "No", "120", "120", "100"]);
  });

  it("serializes Contract Report headers and representative rows", () => {
    const bodies = tableBodies(buildReportPdfDocDefinition(source()));
    const contractBody = bodies[2];
    expect(rowTexts(contractBody[0])).toEqual([
      "Client",
      "Archived",
      "Ongoing",
      "Out of validity",
      "Consumed",
      "Capacity",
      "Util %",
      "Allocated",
      "Alloc. consumed",
      "Remaining",
      "Status",
    ]);
    expect(rowTexts(contractBody[1])).toEqual([
      "ACME",
      "No",
      "No",
      "No",
      "120",
      "4,800",
      "2.5",
      "1,000",
      "800",
      "200",
      "WARNING",
    ]);
  });

  it("renders clear empty states for empty datasets", () => {
    const definition = buildReportPdfDocDefinition(
      source({
        revenueOverview: revenueOverview({
          accrued: { ...accrued, byCurrency: [] },
          expected: { ...expected, byCurrency: [] },
          forecast: null,
          invoiced: [],
          paid: [],
          outstanding: [],
        }),
        hoursByClient: hoursReport({ clientAllocations: [] }),
        contractReport: contractReport({
          contractUtilizations: [],
          contractAllocations: [],
        }),
      }),
    );
    const texts = flattenText(definition.content);
    expect(texts).toContain("No revenue metrics for this period.");
    expect(texts).toContain("No hours by client for this period.");
    expect(texts).toContain("No contracts for this period.");
    expect(tableBodies(definition)).toHaveLength(0);
  });
});

describe("serializeReportPdf", () => {
  it("produces a valid PDF buffer from the reporting DTOs", async () => {
    const buffer = await serializeReportPdf(source());
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("produces a valid PDF for empty datasets", async () => {
    const buffer = await serializeReportPdf(
      source({
        revenueOverview: revenueOverview({
          accrued: { ...accrued, byCurrency: [] },
          expected: { ...expected, byCurrency: [] },
          forecast: null,
          invoiced: [],
          paid: [],
          outstanding: [],
        }),
        hoursByClient: hoursReport({ clientAllocations: [] }),
        contractReport: contractReport({
          contractUtilizations: [],
          contractAllocations: [],
        }),
      }),
    );
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("keeps serializer free of persistence access and marks server-only", () => {
    const serializer = readFileSync("src/features/reporting/report-pdf.ts", "utf8");
    const definition = readFileSync(
      "src/features/reporting/report-pdf-definition.ts",
      "utf8",
    );
    expect(serializer).toContain('import "server-only"');
    expect(serializer).not.toMatch(/prisma|createRepositories|@\/infrastructure/i);
    expect(definition).not.toMatch(/prisma|createRepositories|@\/infrastructure/i);
    expect(definition).not.toMatch(
      /getContractReport|getHoursByClient|getRevenueOverview/,
    );
  });

  it("embeds Roboto via VFS and never opens node_modules TTF paths", async () => {
    const serializer = readFileSync("src/features/reporting/report-pdf.ts", "utf8");
    expect(serializer).toContain('pdfmake/build/vfs_fonts');
    expect(serializer).toContain("virtualfs.writeFileSync");
    expect(serializer).toContain("setLocalAccessPolicy(() => false)");
    expect(serializer).not.toContain("pdfmake/fonts/Roboto");
    expect(serializer).not.toMatch(/ALLOWED_FONT_PATHS|readFileSync/);

    const buffer = await serializeReportPdf(source());
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});

describe("reportPdfFilename", () => {
  it("derives a deterministic pdf name from the resolved period", () => {
    expect(reportPdfFilename(contractReport({ periodKind: { kind: "month" } }))).toBe(
      "reports-month-2026-06-01-2026-06-30.pdf",
    );
  });
});

describe("createReportPdfResponse", () => {
  it("sets PDF content type and sanitized attachment filename", async () => {
    const body = Buffer.from("%PDF-test");
    const response = createReportPdfResponse(
      body,
      "reports-month-2026-06-01-2026-06-15.pdf",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reports-month-2026-06-01-2026-06-15.pdf"',
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(body);
  });
});
