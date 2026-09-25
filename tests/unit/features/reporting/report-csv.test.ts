// tests/unit/features/reporting/report-csv.test.ts
import { describe, expect, it } from "vitest";

import type {
  ContractReport,
  HoursByClientReport,
} from "@/application/reporting/reporting-service";
import {
  createReportCsvResponse,
  reportCsvFilename,
  serializeReportCsv,
} from "@/features/reporting/report-csv";
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

function sectionLines(csv: string, section: string): string[] {
  const marker = `section,${section}`;
  const lines = csv.split("\n");
  const start = lines.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("section,") || line === "");
  return rest.slice(0, end === -1 ? rest.length : end).filter((line) => line !== "");
}

describe("serializeReportCsv", () => {
  it("emits deterministic section order matching the filtered /reports surfaces", () => {
    const csv = serializeReportCsv({
      hoursByClient: hoursReport(),
      contractReport: contractReport(),
    });

    expect(csv.indexOf("section,meta")).toBeLessThan(csv.indexOf("section,revenue"));
    expect(csv.indexOf("section,revenue")).toBeLessThan(
      csv.indexOf("section,hours_by_client"),
    );
    expect(csv.indexOf("section,hours_by_client")).toBeLessThan(
      csv.indexOf("section,contract_report"),
    );
    expect(csv).not.toContain("annual");
    expect(csv).not.toContain("Annual");
    expect(csv.endsWith("\n")).toBe(true);
  });

  it("preserves published money, allocation, and currency rows from the read model", () => {
    const report = contractReport();
    const csv = serializeReportCsv({
      hoursByClient: hoursReport(),
      contractReport: report,
    });

    expect(sectionLines(csv, "revenue")).toEqual([
      "metric,currency,published",
      "accrued,EUR,160",
      "accrued,USD,80",
      "expected,EUR,6400",
      "expected,USD,1000",
      "forecast,EUR,320",
    ]);
    expect(csv).not.toContain("160.4");
    expect(csv).not.toMatch(/accrued,EUR,240/);

    expect(sectionLines(csv, "hours_by_client")).toEqual([
      "client_name,is_archived,total_minutes,billable_minutes,share_percent",
      "ACME,false,120,120,100",
    ]);

    expect(sectionLines(csv, "contract_report")).toEqual([
      "client_name,is_archived,is_ongoing,is_out_of_validity,consumed_minutes,capacity_minutes,utilization_percent,allocated_minutes,allocation_consumed_minutes,remaining_minutes,allocation_status",
      "ACME,false,false,false,120,4800,2.5,1000,800,200,WARNING",
    ]);
  });

  it("writes filter and period metadata from the read model", () => {
    const csv = serializeReportCsv({
      hoursByClient: hoursReport(),
      contractReport: contractReport({
        periodKind: { kind: "month" },
        filter: {
          clientId: "11111111-1111-4111-8111-111111111111",
          contractId: "22222222-2222-4222-8222-222222222222",
        },
      }),
    });

    expect(sectionLines(csv, "meta")).toEqual([
      "period_kind,period_start,period_end,client_id,contract_id",
      "month,2026-06-01,2026-06-30,11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("omits forecast rows when Forecast is null and keeps empty sections valid", () => {
    const csv = serializeReportCsv({
      hoursByClient: hoursReport({ clientAllocations: [] }),
      contractReport: contractReport({
        forecast: null,
        contractUtilizations: [],
        contractAllocations: [],
        accrued: { ...accrued, byCurrency: [] },
        expected: { ...expected, byCurrency: [] },
      }),
    });

    expect(sectionLines(csv, "revenue")).toEqual(["metric,currency,published"]);
    expect(sectionLines(csv, "hours_by_client")[0]).toBe(
      "client_name,is_archived,total_minutes,billable_minutes,share_percent",
    );
    expect(sectionLines(csv, "hours_by_client")).toHaveLength(1);
    expect(sectionLines(csv, "contract_report")).toHaveLength(1);
    expect(csv).not.toContain("forecast,");
  });

  it("leaves unlimited capacity, missing allocation, and null share empty", () => {
    const csv = serializeReportCsv({
      hoursByClient: hoursReport({
        clientAllocations: [
          {
            clientId: "client-1",
            clientName: 'Caffè, "Société"',
            isArchived: true,
            totalMinutes: 0,
            billableMinutes: 0,
            percentage: null,
          },
        ],
      }),
      contractReport: contractReport({
        contractUtilizations: [
          {
            contractId: "contract-open",
            clientName: "Unlimited Corp",
            isArchived: false,
            validFrom: new Date("2026-01-01T00:00:00.000Z"),
            validTo: null,
            isOngoing: true,
            consumedMinutes: 45,
            contractedMinutes: null,
            utilizationPercentage: null,
            isOutOfValidity: true,
          },
        ],
        contractAllocations: [
          {
            contractId: "contract-open",
            allocatedMinutes: null,
            consumedMinutes: 45,
            remainingMinutes: null,
            allocationStatus: null,
          },
        ],
      }),
    });

    expect(sectionLines(csv, "hours_by_client")[1]).toBe(
      '"Caffè, ""Société""",true,0,0,',
    );
    expect(sectionLines(csv, "contract_report")[1]).toBe(
      "Unlimited Corp,false,true,true,45,,,,,,",
    );
  });
});

describe("reportCsvFilename", () => {
  it("derives a deterministic name from the resolved period", () => {
    expect(reportCsvFilename(contractReport({ periodKind: { kind: "month" } }))).toBe(
      "reports-month-2026-06-01-2026-06-30.csv",
    );
    expect(reportCsvFilename(contractReport())).toBe(
      "reports-custom-2026-06-01-2026-06-30.csv",
    );
  });
});

describe("createReportCsvResponse", () => {
  it("sets CSV content type and a sanitized attachment filename", async () => {
    const response = createReportCsvResponse(
      "metric,currency\n",
      "reports-month-2026-06-01-2026-06-15.csv",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reports-month-2026-06-01-2026-06-15.csv"',
    );
    expect(await response.text()).toBe("metric,currency\n");
  });

  it("strips unsanitized characters from the filename", () => {
    const response = createReportCsvResponse("a\n", 'reports; filename="evil".csv');
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reportsfilenameevil.csv"',
    );
  });
});
