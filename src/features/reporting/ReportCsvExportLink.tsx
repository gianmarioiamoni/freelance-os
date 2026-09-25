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
};

export function ReportCsvExportLink({
  period,
  filter,
}: ReportCsvExportLinkProps): JSX.Element {
  return (
    <a
      href={reportExportHrefFromState(period, filter)}
      className="justify-self-start text-sm font-medium underline-offset-4 hover:underline"
    >
      Export CSV
    </a>
  );
}
