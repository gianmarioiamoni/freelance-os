// @vitest-environment jsdom
// tests/unit/features/reporting/ReportPdfExportButton.test.tsx
import { readFileSync } from "node:fs";
import path from "node:path";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReportPdfExportButton } from "@/features/reporting/ReportPdfExportButton";
import * as downloadModule from "@/features/reporting/report-pdf-download";
import { reportPdfExportHrefFromState } from "@/features/reporting/reporting-types";

const clientId = "11111111-1111-4111-8111-111111111111";
const contractId = "22222222-2222-4222-8222-222222222222";

describe("reportPdfExportHrefFromState", () => {
  it("targets the pdf export route with the current report filters", () => {
    expect(
      reportPdfExportHrefFromState(
        { kind: "year" },
        { clientId, contractId },
      ),
    ).toBe(
      `/reports/export/pdf?period=year&clientId=${clientId}&contractId=${contractId}`,
    );
  });

  it("preserves custom period params and omits unsupported filters", () => {
    const href = reportPdfExportHrefFromState(
      { kind: "custom", start: "2026-01-01", end: "2026-03-31" },
      { clientId, contractId },
    );

    expect(href).toBe(
      `/reports/export/pdf?period=custom&start=2026-01-01&end=2026-03-31&clientId=${clientId}&contractId=${contractId}`,
    );
    expect(href).not.toContain("workspaceId");
    expect(href).not.toContain("amountStatus");
    expect(href).not.toContain("overdue");
  });
});

describe("ReportPdfExportButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an accessible Export PDF control for the current filters", () => {
    render(
      <ReportPdfExportButton
        period={{ kind: "month" }}
        filter={{ clientId, contractId }}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Export PDF report with Revenue, Hours by Client, and Contract Report",
    });
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent("Export PDF");
  });

  it("requests the pdf route with forwarded filters and disables while loading", async () => {
    let resolveDownload: (() => void) | undefined;
    const downloadPromise = new Promise<void>((resolve) => {
      resolveDownload = resolve;
    });
    const downloadSpy = vi
      .spyOn(downloadModule, "downloadReportPdf")
      .mockImplementation(() => downloadPromise);

    render(
      <ReportPdfExportButton
        period={{ kind: "year" }}
        filter={{ clientId, contractId }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Export PDF report with Revenue, Hours by Client, and Contract Report",
      }),
    );

    const busyButton = await screen.findByRole("button", {
      name: "Exporting PDF report",
    });
    expect(busyButton).toBeDisabled();
    expect(busyButton).toHaveAttribute("aria-busy", "true");
    expect(busyButton).toHaveTextContent("Exporting…");
    expect(downloadSpy).toHaveBeenCalledWith(
      `/reports/export/pdf?period=year&clientId=${clientId}&contractId=${contractId}`,
    );

    resolveDownload?.();
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Export PDF report with Revenue, Hours by Client, and Contract Report",
        }),
      ).toBeEnabled();
    });
  });

  it("surfaces an error alert when the download fails", async () => {
    vi.spyOn(downloadModule, "downloadReportPdf").mockRejectedValue(
      new Error("network"),
    );

    render(<ReportPdfExportButton period={{ kind: "month" }} filter={{}} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Export PDF report with Revenue, Hours by Client, and Contract Report",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to export PDF. Try again.",
    );
    expect(
      screen.getByRole("button", {
        name: "Export PDF report with Revenue, Hours by Client, and Contract Report",
      }),
    ).toBeEnabled();
  });
});

describe("Reports page pdf export wiring", () => {
  it("keeps CSV and Excel exports and adds PDF without altering report sections", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/(app)/reports/page.tsx"),
      "utf8",
    );

    expect(source).toContain("ReportCsvExportLink");
    expect(source).toContain("ReportExcelExportButton");
    expect(source).toContain("ReportPdfExportButton");
    expect(source).toContain('aria-label="Report exports"');
    expect(source).toContain("RevenueSummary");
    expect(source).toContain("HoursByClientTable");
    expect(source).toContain("ContractReportTable");
    expect(source).toContain("AnnualOverviewTable");
    expect(source).not.toContain("serializeReportPdf");
    expect(source).not.toContain("downloadReportPdf");
    expect(source).not.toContain("serializeReportXlsx");
  });
});

describe("filenameFromContentDisposition", () => {
  it("reads a quoted attachment filename", () => {
    expect(
      downloadModule.filenameFromContentDisposition(
        'attachment; filename="reports-month-2026-06-01-2026-06-30.pdf"',
      ),
    ).toBe("reports-month-2026-06-01-2026-06-30.pdf");
    expect(downloadModule.filenameFromContentDisposition(null)).toBeNull();
  });
});
