// src/features/reporting/report-pdf-definition.ts
import type {
  Content,
  ContentTable,
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

import type {
  ContractReport,
  HoursByClientReport,
  RevenueOverview,
} from "@/application/reporting/reporting-service";
import { allocationByContractId } from "@/features/reporting/report-allocation-display";
import { getCalendarDateKey } from "@/lib/analytics-periods";

export type ReportPdfSource = {
  revenueOverview: RevenueOverview;
  hoursByClient: HoursByClientReport;
  contractReport: ContractReport;
};

/**
 * Builds the pdfmake document definition from authoritative reporting DTOs.
 * Presentation only — no recalculation.
 */
export function buildReportPdfDocDefinition(
  source: ReportPdfSource,
): TDocumentDefinitions {
  const periodLabel = formatPeriodLabel(source.contractReport);
  const filterLabel = formatFilterLabel(source.contractReport);

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [36, 48, 36, 48],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
    },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
      meta: { fontSize: 9, color: "#444444", margin: [0, 0, 0, 2] },
      section: { fontSize: 12, bold: true, margin: [0, 0, 0, 8] },
      empty: { italics: true, color: "#666666", margin: [0, 0, 0, 4] },
      tableHeader: { bold: true, fillColor: "#f0f0f0" },
    },
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: "Freelance OS Reports",
          alignment: "left",
          margin: [36, 0, 0, 0],
          fontSize: 8,
          color: "#666666",
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "right",
          margin: [0, 0, 36, 0],
          fontSize: 8,
          color: "#666666",
        },
      ],
    }),
    content: [
      { text: "Reports", style: "title" },
      { text: `Period: ${periodLabel}`, style: "meta" },
      ...(filterLabel
        ? [{ text: `Filters: ${filterLabel}`, style: "meta" } satisfies Content]
        : []),
      {
        text: "Export includes Revenue, Hours by Client, and Contract Report.",
        style: "meta",
        margin: [0, 0, 0, 12],
      },
      ...revenueSection(source.revenueOverview),
      ...hoursSection(source.hoursByClient),
      ...contractSection(source.contractReport),
    ],
  };
}

function revenueSection(overview: RevenueOverview): Content[] {
  const body: TableCell[][] = [
    [
      headerCell("Metric"),
      headerCell("Currency"),
      headerCell("Amount", "right"),
    ],
  ];

  for (const row of overview.accrued.byCurrency) {
    body.push(metricRow("Accrued", row.currency, row.published));
  }
  for (const row of overview.expected.byCurrency) {
    body.push(metricRow("Expected", row.currency, row.published));
  }
  if (overview.forecast) {
    for (const row of overview.forecast.byCurrency) {
      body.push(metricRow("Forecast", row.currency, row.published));
    }
  }
  for (const row of overview.invoiced) {
    body.push(metricRow("Invoiced", row.currency, parseAmount(row.amount)));
  }
  for (const row of overview.paid) {
    body.push(metricRow("Paid", row.currency, parseAmount(row.amount)));
  }
  for (const row of overview.outstanding) {
    body.push(metricRow("Outstanding", row.currency, parseAmount(row.amount)));
  }

  return [
    { text: "Revenue", style: "section" },
    body.length === 1
      ? emptyState("No revenue metrics for this period.")
      : dataTable(body, ["*", "auto", "auto"]),
  ];
}

function hoursSection(report: HoursByClientReport): Content[] {
  const body: TableCell[][] = [
    [
      headerCell("Client"),
      headerCell("Archived"),
      headerCell("Total minutes", "right"),
      headerCell("Billable minutes", "right"),
      headerCell("Share %", "right"),
    ],
  ];

  for (const row of report.clientAllocations) {
    body.push([
      textCell(row.clientName),
      textCell(formatBoolean(row.isArchived)),
      numberCell(row.totalMinutes),
      numberCell(row.billableMinutes),
      numberCell(row.percentage),
    ]);
  }

  return [
    { text: "Hours by Client", style: "section", pageBreak: "before" },
    body.length === 1
      ? emptyState("No hours by client for this period.")
      : dataTable(body, ["*", "auto", "auto", "auto", "auto"]),
  ];
}

function contractSection(report: ContractReport): Content[] {
  const allocations = allocationByContractId(report.contractAllocations);
  const body: TableCell[][] = [
    [
      headerCell("Client"),
      headerCell("Archived"),
      headerCell("Ongoing"),
      headerCell("Out of validity"),
      headerCell("Consumed", "right"),
      headerCell("Capacity", "right"),
      headerCell("Util %", "right"),
      headerCell("Allocated", "right"),
      headerCell("Alloc. consumed", "right"),
      headerCell("Remaining", "right"),
      headerCell("Status"),
    ],
  ];

  for (const utilization of report.contractUtilizations) {
    const allocation = allocations.get(utilization.contractId);
    const allocationConfigured =
      allocation !== undefined && allocation.allocatedMinutes !== null
        ? allocation
        : undefined;

    body.push([
      textCell(utilization.clientName),
      textCell(formatBoolean(utilization.isArchived)),
      textCell(formatBoolean(utilization.isOngoing)),
      textCell(formatBoolean(utilization.isOutOfValidity)),
      numberCell(utilization.consumedMinutes),
      numberCell(utilization.contractedMinutes),
      numberCell(utilization.utilizationPercentage),
      numberCell(allocationConfigured?.allocatedMinutes ?? null),
      numberCell(allocationConfigured?.consumedMinutes ?? null),
      numberCell(allocationConfigured?.remainingMinutes ?? null),
      textCell(allocationConfigured?.allocationStatus ?? "—"),
    ]);
  }

  return [
    { text: "Contract Report", style: "section", pageBreak: "before" },
    body.length === 1
      ? emptyState("No contracts for this period.")
      : dataTable(
          body,
          ["*", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
        ),
  ];
}

function dataTable(body: TableCell[][], widths: Array<number | string>): ContentTable {
  return {
    table: {
      headerRows: 1,
      keepWithHeaderRows: 1,
      dontBreakRows: true,
      widths,
      body,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#cccccc",
      vLineColor: () => "#cccccc",
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  };
}

function headerCell(text: string, alignment: "left" | "right" = "left"): TableCell {
  return { text, style: "tableHeader", alignment };
}

function textCell(text: string): TableCell {
  return { text };
}

function numberCell(value: number | null | undefined): TableCell {
  if (value === null || value === undefined) {
    return { text: "—", alignment: "right" };
  }
  return { text: formatNumber(value), alignment: "right" };
}

function metricRow(
  metric: string,
  currency: string,
  amount: number | string,
): TableCell[] {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  return [
    textCell(metric),
    textCell(currency),
    Number.isFinite(numeric)
      ? { text: formatMoney(numeric), alignment: "right" }
      : { text: String(amount), alignment: "right" },
  ];
}

function emptyState(message: string): Content {
  return { text: message, style: "empty" };
}

function formatPeriodLabel(report: ContractReport): string {
  const kind = report.periodKind.kind;
  const start = getCalendarDateKey(report.period.startDate);
  const end = getCalendarDateKey(report.period.endDate);
  return `${kind} (${start} – ${end})`;
}

function formatFilterLabel(report: ContractReport): string | null {
  const parts: string[] = [];
  if (report.filter.clientId) {
    parts.push(`clientId=${report.filter.clientId}`);
  }
  if (report.filter.contractId) {
    parts.push(`contractId=${report.filter.contractId}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseAmount(value: string): number | string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}
