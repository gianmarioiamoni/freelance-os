// src/features/reporting/report-csv.ts
import type {
  ContractReport,
  HoursByClientReport,
} from "@/application/reporting/reporting-service";
import { allocationByContractId } from "@/features/reporting/report-allocation-display";
import { getCalendarDateKey } from "@/lib/analytics-periods";
import { serializeCsv, type CsvValue } from "@/lib/csv";

export type ReportCsvSource = {
  hoursByClient: HoursByClientReport;
  contractReport: ContractReport;
};

/**
 * Native CSV of the approved filtered /reports dataset.
 *
 * Sections, in page order, excluding unfiltered Annual Overview:
 *   meta, revenue, hours_by_client, contract_report
 *
 * Numbers and status values come from the published read model.
 * Null/absent values are empty cells. Currencies stay per-row; no mixed total.
 */
export function serializeReportCsv(source: ReportCsvSource): string {
  return serializeCsv(
    joinSections([
      metaSection(source.contractReport),
      revenueSection(source.contractReport),
      hoursSection(source.hoursByClient),
      contractSection(source.contractReport),
    ]),
  );
}

export function reportCsvFilename(
  report: Pick<ContractReport, "period" | "periodKind">,
): string {
  const kind = sanitizeFilenameToken(report.periodKind.kind);
  const start = getCalendarDateKey(report.period.startDate);
  const end = getCalendarDateKey(report.period.endDate);
  return `reports-${kind}-${start}-${end}.csv`;
}

export function createReportCsvResponse(csv: string, filename: string): Response {
  const safeName = sanitizeFilenameToken(filename) || "reports.csv";
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}"`,
    },
  });
}

function metaSection(report: ContractReport): CsvValue[][] {
  return [
    ["section", "meta"],
    ["period_kind", "period_start", "period_end", "client_id", "contract_id"],
    [
      report.periodKind.kind,
      getCalendarDateKey(report.period.startDate),
      getCalendarDateKey(report.period.endDate),
      report.filter.clientId,
      report.filter.contractId,
    ],
  ];
}

function revenueSection(report: ContractReport): CsvValue[][] {
  const rows: CsvValue[][] = [
    ["section", "revenue"],
    ["metric", "currency", "published"],
  ];

  for (const row of report.accrued.byCurrency) {
    rows.push(["accrued", row.currency, row.published]);
  }
  for (const row of report.expected.byCurrency) {
    rows.push(["expected", row.currency, row.published]);
  }
  if (report.forecast) {
    for (const row of report.forecast.byCurrency) {
      rows.push(["forecast", row.currency, row.published]);
    }
  }

  return rows;
}

function hoursSection(report: HoursByClientReport): CsvValue[][] {
  const rows: CsvValue[][] = [
    ["section", "hours_by_client"],
    [
      "client_name",
      "is_archived",
      "total_minutes",
      "billable_minutes",
      "share_percent",
    ],
  ];

  for (const row of report.clientAllocations) {
    rows.push([
      row.clientName,
      row.isArchived,
      row.totalMinutes,
      row.billableMinutes,
      row.percentage,
    ]);
  }

  return rows;
}

function contractSection(report: ContractReport): CsvValue[][] {
  const allocations = allocationByContractId(report.contractAllocations);
  const rows: CsvValue[][] = [
    ["section", "contract_report"],
    [
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
    ],
  ];

  for (const utilization of report.contractUtilizations) {
    const allocation = allocations.get(utilization.contractId);
    const allocationConfigured =
      allocation !== undefined && allocation.allocatedMinutes !== null
        ? allocation
        : undefined;

    rows.push([
      utilization.clientName,
      utilization.isArchived,
      utilization.isOngoing,
      utilization.isOutOfValidity,
      utilization.consumedMinutes,
      utilization.contractedMinutes,
      utilization.utilizationPercentage,
      allocationConfigured?.allocatedMinutes ?? null,
      allocationConfigured?.consumedMinutes ?? null,
      allocationConfigured?.remainingMinutes ?? null,
      allocationConfigured?.allocationStatus ?? null,
    ]);
  }

  return rows;
}

function joinSections(sections: readonly CsvValue[][][]): CsvValue[][] {
  const rows: CsvValue[][] = [];
  for (const [index, section] of sections.entries()) {
    if (index > 0) {
      rows.push([]);
    }
    rows.push(...section);
  }
  return rows;
}

function sanitizeFilenameToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "");
}
