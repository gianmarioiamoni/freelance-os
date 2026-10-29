// tests/unit/features/reporting/monthly-timesheet-export.test.ts
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { serializeMonthlyTimesheetCsv } from "@/features/reporting/monthly-timesheet-csv";
import { serializeMonthlyTimesheetXlsx } from "@/features/reporting/monthly-timesheet-xlsx";
import { serializeMonthlyTimesheetPdf } from "@/features/reporting/monthly-timesheet-pdf";
import {
  formatTimesheetHours,
  formatTimesheetDate,
  formatTimesheetCurrency,
  monthlyTimesheetFilename,
  type MonthlyTimesheetExportDataset,
} from "@/features/reporting/monthly-timesheet-export";

describe("Monthly Timesheet Export Dataset", () => {
  const mockDataset: MonthlyTimesheetExportDataset = {
    period: {
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T23:59:59.999Z"),
    },
    periodKind: { kind: "month" },
    clientId: "client-1",
    clientName: "Acme Corp",
    totalMinutes: 960,
    billableMinutes: 900,
    accrued: {
      period: {
        startDate: new Date("2026-06-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T23:59:59.999Z"),
      },
      timezone: "Europe/Rome",
      byCurrency: [
        { currency: "EUR", unrounded: 720, published: 720 },
        { currency: "USD", unrounded: 480, published: 480 },
      ],
      byContract: [],
    },
    dailyBreakdown: [
      {
        workDate: new Date("2026-06-01T00:00:00.000Z"),
        totalMinutes: 480,
        billableMinutes: 480,
        entries: [
          {
            id: "entry-1",
            contractId: "contract-1",
            durationMinutes: 240,
            description: "Morning work",
            billable: true,
          },
          {
            id: "entry-2",
            contractId: "contract-1",
            durationMinutes: 240,
            description: null,
            billable: true,
          },
        ],
      },
      {
        workDate: new Date("2026-06-02T00:00:00.000Z"),
        totalMinutes: 480,
        billableMinutes: 420,
        entries: [
          {
            id: "entry-3",
            contractId: "contract-1",
            durationMinutes: 420,
            description: "Client meeting",
            billable: true,
          },
          {
            id: "entry-4",
            contractId: "contract-1",
            durationMinutes: 60,
            description: "Admin",
            billable: false,
          },
        ],
      },
    ],
  };

  const emptyDataset: MonthlyTimesheetExportDataset = {
    ...mockDataset,
    totalMinutes: 0,
    billableMinutes: 0,
    accrued: {
      ...mockDataset.accrued,
      byCurrency: [],
    },
    dailyBreakdown: [],
  };

  describe("formatters", () => {
    it("formats hours correctly", () => {
      expect(formatTimesheetHours(0)).toBe("0h");
      expect(formatTimesheetHours(60)).toBe("1h");
      expect(formatTimesheetHours(90)).toBe("1h 30m");
      expect(formatTimesheetHours(480)).toBe("8h");
    });

    it("formats dates correctly", () => {
      expect(formatTimesheetDate(new Date("2026-06-01T00:00:00.000Z"))).toBe("2026-06-01");
    });

    it("formats single currency", () => {
      expect(
        formatTimesheetCurrency([{ currency: "EUR", published: 720 }]),
      ).toBe("720 EUR");
    });

    it("formats multiple currencies", () => {
      expect(
        formatTimesheetCurrency([
          { currency: "EUR", published: 720 },
          { currency: "USD", published: 480 },
        ]),
      ).toBe("720 EUR, 480 USD");
    });

    it("formats empty currency list", () => {
      expect(formatTimesheetCurrency([])).toBe("-");
    });
  });

  describe("filename generation", () => {
    it("generates CSV filename", () => {
      const filename = monthlyTimesheetFilename(mockDataset, "csv");
      expect(filename).toBe("timesheet-acme-corp-2026-06-01-2026-06-30.csv");
    });

    it("generates Excel filename", () => {
      const filename = monthlyTimesheetFilename(mockDataset, "xlsx");
      expect(filename).toBe("timesheet-acme-corp-2026-06-01-2026-06-30.xlsx");
    });

    it("generates PDF filename", () => {
      const filename = monthlyTimesheetFilename(mockDataset, "pdf");
      expect(filename).toBe("timesheet-acme-corp-2026-06-01-2026-06-30.pdf");
    });
  });

  describe("CSV serialization", () => {
    it("serializes normal dataset", () => {
      const csv = serializeMonthlyTimesheetCsv(mockDataset);

      expect(csv).toContain("section,meta");
      expect(csv).toContain("Acme Corp");
      expect(csv).toContain("section,summary");
      expect(csv).toContain("16h");
      expect(csv).toContain("15h");
      expect(csv).toContain("section,accrued");
      expect(csv).toContain("EUR,720");
      expect(csv).toContain("USD,480");
      expect(csv).toContain("section,daily_breakdown");
      expect(csv).toContain("2026-06-01");
      expect(csv).toContain("2026-06-02");
      expect(csv).toContain("section,entries");
      expect(csv).toContain("Morning work");
    });

    it("serializes empty dataset", () => {
      const csv = serializeMonthlyTimesheetCsv(emptyDataset);

      expect(csv).toContain("section,meta");
      expect(csv).toContain("section,summary");
      expect(csv).toContain("0h");
      expect(csv).toContain("section,accrued");
    });

    it("includes billable state", () => {
      const csv = serializeMonthlyTimesheetCsv(mockDataset);

      expect(csv).toContain("yes");
      expect(csv).toContain("no");
    });
  });

  describe("Excel serialization", () => {
    it("generates valid buffer", () => {
      const buffer = serializeMonthlyTimesheetXlsx(mockDataset);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("handles empty dataset", () => {
      const buffer = serializeMonthlyTimesheetXlsx(emptyDataset);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("contains only operational data, no financial data", () => {
      const buffer = serializeMonthlyTimesheetXlsx(mockDataset);
      const workbook = XLSX.read(buffer, { type: "buffer" });

      // Verify exactly 2 sheets
      expect(workbook.SheetNames).toHaveLength(2);
      expect(workbook.SheetNames[0]).toBe("Summary");
      expect(workbook.SheetNames[1]).toBe("Detail");

      // Check Summary sheet structure
      const summarySheet = workbook.Sheets["Summary"];
      const summaryData = XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as unknown[][];
      
      // Headers should be: Client, Start, End, Hours
      expect(summaryData[0]).toEqual(["Client", "Start", "End", "Hours"]);
      
      // Verify no financial columns
      const summaryText = JSON.stringify(summaryData).toLowerCase();
      expect(summaryText).not.toContain("revenue");
      expect(summaryText).not.toContain("invoice");
      expect(summaryText).not.toContain("amount");
      expect(summaryText).not.toContain("eur");
      expect(summaryText).not.toContain("usd");
      expect(summaryText).not.toContain("billable");

      // Check Detail sheet structure
      const detailSheet = workbook.Sheets["Detail"];
      const detailData = XLSX.utils.sheet_to_json(detailSheet, { header: 1 }) as unknown[][];
      
      // Headers should be: Date, Duration (hours), Description
      expect(detailData[0]).toEqual(["Date", "Duration (hours)", "Description"]);
      
      // Verify dates in Italian format (gg-mm-aaaa)
      expect(detailData[1]?.[0]).toMatch(/^\d{2}-\d{2}-\d{4}$/);
      
      // Verify no financial columns
      const detailText = JSON.stringify(detailData).toLowerCase();
      expect(detailText).not.toContain("billable");
      expect(detailText).not.toContain("revenue");
      expect(detailText).not.toContain("amount");
      expect(detailText).not.toContain("eur");
      expect(detailText).not.toContain("usd");
    });
  });

  describe("PDF serialization", () => {
    it("generates valid PDF", async () => {
      const buffer = await serializeMonthlyTimesheetPdf(mockDataset);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.toString("utf8", 0, 5)).toBe("%PDF-");
    });

    it("handles empty dataset", async () => {
      const buffer = await serializeMonthlyTimesheetPdf(emptyDataset);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.toString("utf8", 0, 5)).toBe("%PDF-");
    });
  });
});
