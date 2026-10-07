// src/features/reporting/monthly-timesheet-pdf.ts
import "server-only";

import pdfmake from "pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";

import type { MonthlyTimesheetExportDataset } from "@/features/reporting/monthly-timesheet-export";
import {
  formatTimesheetDate,
  formatTimesheetHours,
  formatTimesheetCurrency,
} from "@/features/reporting/monthly-timesheet-export";

type PdfMakeVirtualFs = {
  writeFileSync(filename: string, content: Buffer): void;
};

type PdfMakeRuntime = typeof pdfmake & {
  virtualfs: PdfMakeVirtualFs;
};

const pdfMakeRuntime = pdfmake as PdfMakeRuntime;

const ROBOTO_VFS_FILES = {
  normal: "Roboto-Regular.ttf",
  bold: "Roboto-Medium.ttf",
  italics: "Roboto-Italic.ttf",
  bolditalics: "Roboto-MediumItalic.ttf",
} as const;

let fontsConfigured = false;

/**
 * Monthly Timesheet PDF serializer (R2.2-STABILIZATION-06).
 *
 * Professional printable structure:
 * - Title & metadata
 * - Summary
 * - Amount to invoice (by currency)
 * - Daily breakdown
 * - Entry detail
 *
 * Consumes shared MonthlyTimesheetExportDataset.
 * No billing recalculation. No currency mixing.
 * Uses production-safe VFS font strategy (cc532d4).
 */
export async function serializeMonthlyTimesheetPdf(
  dataset: MonthlyTimesheetExportDataset,
): Promise<Buffer> {
  ensurePdfFonts();
  const definition = buildTimesheetPdfDefinition(dataset);
  const pdf = pdfMakeRuntime.createPdf(definition);
  const buffer = await pdf.getBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

function buildTimesheetPdfDefinition(
  dataset: MonthlyTimesheetExportDataset,
): TDocumentDefinitions {
  const content: Content = [
    {
      text: "Monthly Timesheet",
      style: "header",
      margin: [0, 0, 0, 20],
    },
    {
      table: {
        widths: [120, "*"],
        body: [
          ["Client", dataset.clientName],
          [
            "Period",
            `${formatTimesheetDate(dataset.period.startDate)} - ${formatTimesheetDate(dataset.period.endDate)}`,
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 20],
    },
    {
      text: "Summary",
      style: "subheader",
      margin: [0, 0, 0, 10],
    },
    {
      table: {
        widths: [120, "*"],
        body: [
          ["Total Hours", formatTimesheetHours(dataset.totalMinutes)],
          ["Billable Hours", formatTimesheetHours(dataset.billableMinutes)],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 15],
    },
    {
      text: "Amount to Invoice",
      style: "subheader",
      margin: [0, 0, 0, 10],
    },
  ];

  if (dataset.accrued.byCurrency.length === 0) {
    content.push({
      text: "No billable work",
      margin: [0, 0, 0, 20],
    });
  } else {
    const currencyRows = dataset.accrued.byCurrency.map((row) => [
      row.currency,
      row.published.toString(),
    ]);

    content.push({
      table: {
        widths: [60, "*"],
        body: [["Currency", "Amount"], ...currencyRows],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 20],
    });
  }

  if (dataset.dailyBreakdown.length > 0) {
    content.push({
      text: "Daily Breakdown",
      style: "subheader",
      margin: [0, 0, 0, 10],
      pageBreak: "before",
    });

    const dailyRows = dataset.dailyBreakdown.map((day) => [
      formatTimesheetDate(day.workDate),
      formatTimesheetHours(day.totalMinutes),
      formatTimesheetHours(day.billableMinutes),
    ]);

    content.push({
      table: {
        widths: [80, "*", "*"],
        body: [["Date", "Total Hours", "Billable Hours"], ...dailyRows],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 20],
    });

    content.push({
      text: "Entry Detail",
      style: "subheader",
      margin: [0, 0, 0, 10],
      pageBreak: "before",
    });

    const entryRows: (string | number)[][] = [];
    for (const day of dataset.dailyBreakdown) {
      for (const entry of day.entries) {
        entryRows.push([
          formatTimesheetDate(day.workDate),
          formatTimesheetHours(entry.durationMinutes),
          entry.billable ? "Yes" : "No",
          entry.description ?? "",
        ]);
      }
    }

    content.push({
      table: {
        widths: [70, 60, 50, "*"],
        body: [
          ["Date", "Duration", "Billable", "Description"],
          ...entryRows,
        ],
      },
      layout: "lightHorizontalLines",
    });
  }

  return {
    content,
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
    },
    styles: {
      header: {
        fontSize: 18,
        bold: true,
      },
      subheader: {
        fontSize: 14,
        bold: true,
      },
    },
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
  };
}

function ensurePdfFonts(): void {
  if (fontsConfigured) {
    return;
  }

  for (const filename of Object.values(ROBOTO_VFS_FILES)) {
    const base64 = resolveEmbeddedFontBase64(filename);
    pdfMakeRuntime.virtualfs.writeFileSync(filename, Buffer.from(base64, "base64"));
  }

  pdfMakeRuntime.setFonts({
    Roboto: {
      normal: ROBOTO_VFS_FILES.normal,
      bold: ROBOTO_VFS_FILES.bold,
      italics: ROBOTO_VFS_FILES.italics,
      bolditalics: ROBOTO_VFS_FILES.bolditalics,
    },
  });
  pdfMakeRuntime.setUrlAccessPolicy(() => false);
  pdfMakeRuntime.setLocalAccessPolicy(() => false);
  fontsConfigured = true;
}

function resolveEmbeddedFontBase64(filename: string): string {
  const base64 = vfsFonts[filename];
  if (typeof base64 !== "string" || base64.length === 0) {
    throw new Error(`Missing embedded PDF font: ${filename}`);
  }
  return base64;
}
