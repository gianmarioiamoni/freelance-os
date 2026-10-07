// src/features/reporting/report-pdf.ts
import "server-only";

import pdfmake from "pdfmake";
import Roboto from "pdfmake/fonts/Roboto";

import type { ContractReport } from "@/application/reporting/reporting-service";
import {
  buildReportPdfDocDefinition,
  type ReportPdfSource,
} from "@/features/reporting/report-pdf-definition";
import { getCalendarDateKey } from "@/lib/analytics-periods";

export type { ReportPdfSource } from "@/features/reporting/report-pdf-definition";
export { buildReportPdfDocDefinition } from "@/features/reporting/report-pdf-definition";

const ALLOWED_FONT_PATHS = new Set(
  Object.values(Roboto.Roboto).filter((value): value is string => typeof value === "string"),
);

let fontsConfigured = false;

/**
 * Server-only PDF of the approved reporting datasets.
 *
 * Sections (deterministic order): Revenue, Hours by Client, Contract Report.
 * Values come from already-computed reporting DTOs — no recalculation.
 * Currencies stay per-row; no mixed-currency total and no FX.
 */
export async function serializeReportPdf(source: ReportPdfSource): Promise<Buffer> {
  ensurePdfFonts();
  const definition = buildReportPdfDocDefinition(source);
  const pdf = pdfmake.createPdf(definition);
  const buffer = await pdf.getBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

export function reportPdfFilename(
  report: Pick<ContractReport, "period" | "periodKind">,
): string {
  const kind = sanitizeFilenameToken(report.periodKind.kind);
  const start = getCalendarDateKey(report.period.startDate);
  const end = getCalendarDateKey(report.period.endDate);
  return `reports-${kind}-${start}-${end}.pdf`;
}

export function createReportPdfResponse(
  buffer: Buffer,
  filename: string,
): Response {
  const safeName = sanitizeFilenameToken(filename) || "reports.pdf";
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
    },
  });
}

function ensurePdfFonts(): void {
  if (fontsConfigured) {
    return;
  }

  pdfmake.setFonts(Roboto);
  pdfmake.setUrlAccessPolicy(() => false);
  pdfmake.setLocalAccessPolicy((filePath) => ALLOWED_FONT_PATHS.has(filePath));
  fontsConfigured = true;
}

function sanitizeFilenameToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "");
}
