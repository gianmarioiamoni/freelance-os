// src/features/reporting/ReportExcelExportButton.tsx
"use client";

import { useState, type JSX } from "react";

import { Button } from "@/components/ui/button";
import { downloadReportExcel } from "@/features/reporting/report-excel-download";
import {
  reportExcelExportHrefFromState,
  type ReportEntityFilterParam,
  type ReportPeriodParam,
} from "@/features/reporting/reporting-types";

type ReportExcelExportButtonProps = {
  period: ReportPeriodParam;
  filter: ReportEntityFilterParam;
};

export function ReportExcelExportButton({
  period,
  filter,
}: ReportExcelExportButtonProps): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const href = reportExcelExportHrefFromState(period, filter);

  async function handleExport(): Promise<void> {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);

    try {
      await downloadReportExcel(href);
    } catch {
      setErrorMessage("Unable to export Excel. Try again.");
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
            ? "Exporting Excel report"
            : "Export Excel report with Revenue, Hours by Client, and Contract Report"
        }
        onClick={() => {
          void handleExport();
        }}
      >
        {isExporting ? "Exporting…" : "Export Excel"}
      </Button>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
