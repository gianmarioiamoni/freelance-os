// src/features/reporting/ReportCsvExportLink.tsx
import {
  reportExportHrefFromState,
  type ReportEntityFilterParam,
  type ReportPeriodParam,
} from "@/features/reporting/reporting-types";
import type { JSX } from "react";

type ReportCsvExportLinkProps = {
  period: ReportPeriodParam;
  filter: ReportEntityFilterParam;
  disabled?: boolean;
};

export function ReportCsvExportLink({
  period,
  filter,
  disabled = false,
}: ReportCsvExportLinkProps): JSX.Element {
  return (
    <a
      href={reportExportHrefFromState(period, filter)}
      className="justify-self-start text-sm font-medium underline-offset-4 hover:underline aria-disabled:opacity-50 aria-disabled:pointer-events-none"
      aria-disabled={disabled}
    >
      Export CSV
    </a>
  );
}
