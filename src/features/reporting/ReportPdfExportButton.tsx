// src/features/reporting/ReportPdfExportButton.tsx
"use client";

import { useState, type JSX } from "react";

import { Button } from "@/components/ui/button";
import { downloadReportPdf } from "@/features/reporting/report-pdf-download";
import {
  reportPdfExportHrefFromState,
  type ReportEntityFilterParam,
  type ReportPeriodParam,
} from "@/features/reporting/reporting-types";

type ReportPdfExportButtonProps = {
  period: ReportPeriodParam;
  filter: ReportEntityFilterParam;
};

export function ReportPdfExportButton({
  period,
  filter,
}: ReportPdfExportButtonProps): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const href = reportPdfExportHrefFromState(period, filter);

  async function handleExport(): Promise<void> {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);

    try {
      await downloadReportPdf(href);
    } catch {
      setErrorMessage("Unable to export PDF. Try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="grid gap-1 justify-self-start">
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto justify-self-start px-0 text-sm font-medium text-foreground"
        disabled={isExporting}
        aria-busy={isExporting}
        aria-label={
          isExporting
            ? "Exporting PDF report"
            : "Export PDF report with Revenue, Hours by Client, and Contract Report"
        }
        onClick={() => {
          void handleExport();
        }}
      >
        {isExporting ? "Exporting…" : "Export PDF"}
      </Button>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
