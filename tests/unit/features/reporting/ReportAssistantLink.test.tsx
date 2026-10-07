// @vitest-environment jsdom
// tests/unit/features/reporting/ReportAssistantLink.test.tsx
import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportAssistantLink } from "@/features/reporting/ReportAssistantLink";

describe("ReportAssistantLink", () => {
  it("renders an accessible entry point to the AI Assistant", () => {
    render(<ReportAssistantLink />);

    expect(
      screen.getByRole("heading", { level: 2, name: "AI Assistant" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ask AI Assistant" }),
    ).toHaveAttribute("href", "/assistant");
    expect(
      screen.getByText(
        "Ask questions about this workspace's available analytics data.",
      ),
    ).toBeInTheDocument();
  });
});

describe("Reports page AI separation", () => {
  it("no longer embeds AnalyticsAskBox and links to /assistant instead", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/(app)/reports/page.tsx"),
      "utf8",
    );

    expect(source).not.toContain("AnalyticsAskBox");
    expect(source).toContain("ReportAssistantLink");
    expect(source).toContain("PeriodSelector");
    expect(source).toContain("ReportEntityFilters");
    expect(source).toContain("RevenueSummary");
    expect(source).toContain("HoursByClientTable");
    expect(source).toContain("ContractReportTable");
    expect(source).toContain("AnnualOverviewTable");
    expect(source).toContain("ReportCsvExportLink");
    expect(source).toContain("ReportExcelExportButton");
    expect(source).toContain("ReportPdfExportButton");
  });
});
