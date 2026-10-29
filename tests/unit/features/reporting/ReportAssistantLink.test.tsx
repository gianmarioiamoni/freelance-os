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
  it("no longer embeds AnalyticsAskBox or ReportAssistantLink in the reports page", () => {
    const pageSource = readFileSync(
      path.join(process.cwd(), "src/app/(app)/reports/page.tsx"),
      "utf8",
    );
    const clientSource = readFileSync(
      path.join(process.cwd(), "src/features/reporting/ReportsPageClient.tsx"),
      "utf8",
    );

    expect(pageSource).not.toContain("AnalyticsAskBox");
    expect(pageSource).not.toContain("ReportAssistantLink");
    expect(clientSource).not.toContain("ReportAssistantLink");
    
    // Core components are present
    expect(pageSource).toContain("PeriodSelector");
    expect(pageSource).toContain("ReportEntityFilters");
    expect(clientSource).toContain("RevenueSummary");
    expect(clientSource).toContain("HoursByClientTable");
    expect(clientSource).toContain("ContractReportTable");
    expect(clientSource).toContain("AnnualOverviewTable");
    expect(clientSource).toContain("ReportCsvExportLink");
    expect(clientSource).toContain("ReportExcelExportButton");
    expect(clientSource).toContain("ReportPdfExportButton");
  });
});
