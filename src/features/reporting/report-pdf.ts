// src/features/reporting/report-pdf.ts
import "server-only";

import pdfmake from "pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";

import type { ContractReport } from "@/application/reporting/reporting-service";
import {
  buildReportPdfDocDefinition,
  type ReportPdfSource,
} from "@/features/reporting/report-pdf-definition";
import { getCalendarDateKey } from "@/lib/analytics-periods";

export type { ReportPdfSource } from "@/features/reporting/report-pdf-definition";
export { buildReportPdfDocDefinition } from "@/features/reporting/report-pdf-definition";

type PdfMakeVirtualFs = {
  writeFileSync(filename: string, content: Buffer): void;
};

type PdfMakeRuntime = typeof pdfmake & {
  virtualfs: PdfMakeVirtualFs;
};

const pdfMakeRuntime = pdfmake as PdfMakeRuntime;

/**
 * Virtual filenames for Roboto faces embedded via pdfmake's VFS (base64 in JS).
 * Avoids absolute node_modules TTF paths that are missing on Vercel/serverless.
 */
const ROBOTO_VFS_FILES = {
  normal: "Roboto-Regular.ttf",
  bold: "Roboto-Medium.ttf",
  italics: "Roboto-Italic.ttf",
  bolditalics: "Roboto-MediumItalic.ttf",
} as const;

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
  const pdf = pdfMakeRuntime.createPdf(definition);
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
  // Fonts are served exclusively from the in-memory VFS — never from the filesystem.
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

function sanitizeFilenameToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "");
}
