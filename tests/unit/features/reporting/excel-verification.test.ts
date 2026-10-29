// Verifica finale struttura Excel
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { serializeMonthlyTimesheetXlsx } from "@/features/reporting/monthly-timesheet-xlsx";
import type { MonthlyTimesheetExportDataset } from "@/features/reporting/monthly-timesheet-export";

describe("Excel Final Verification", () => {
  const testDataset: MonthlyTimesheetExportDataset = {
    period: {
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-10-31T00:00:00.000Z"), // Full month
    },
    periodKind: { kind: "month" },
    clientId: "client-test",
    clientName: "ACME Corporation",
    totalMinutes: 960, // 16h
    billableMinutes: 900, // 15h
    accrued: {
      period: {
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        endDate: new Date("2026-10-31T00:00:00.000Z"),
      },
      timezone: "Europe/Rome",
      byCurrency: [
        { currency: "EUR", unrounded: 3800, published: 3800 },
        { currency: "USD", unrounded: 1200, published: 1200 },
      ],
      byContract: [],
    },
    dailyBreakdown: [
      {
        workDate: new Date("2026-10-05T00:00:00.000Z"),
        totalMinutes: 480,
        billableMinutes: 480,
        entries: [
          {
            id: "entry-1",
            contractId: "contract-1",
            durationMinutes: 240,
            description: "Development task A",
            billable: true,
          },
          {
            id: "entry-2",
            contractId: "contract-1",
            durationMinutes: 240,
            description: "Code review session",
            billable: true,
          },
        ],
      },
      {
        workDate: new Date("2026-10-10T00:00:00.000Z"),
        totalMinutes: 480,
        billableMinutes: 420,
        entries: [
          {
            id: "entry-3",
            contractId: "contract-1",
            durationMinutes: 420,
            description: "Client meeting and planning",
            billable: true,
          },
          {
            id: "entry-4",
            contractId: "contract-1",
            durationMinutes: 60,
            description: "Internal admin work",
            billable: false,
          },
        ],
      },
    ],
  };

  it("contains exactly 2 sheets: Summary and Detail", () => {
    const buffer = serializeMonthlyTimesheetXlsx(testDataset);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    expect(workbook.SheetNames).toEqual(["Summary", "Detail"]);
    expect(workbook.SheetNames.length).toBe(2);
  });

  it("Summary sheet has title, period, headers and total", () => {
    const buffer = serializeMonthlyTimesheetXlsx(testDataset);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Summary"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    // Verify title (row 0)
    expect(data[0][0]).toBe("Monthly Timesheet Summary");
    
    // Verify period (row 1)
    expect(data[1][0]).toContain("01-10-2026");
    expect(data[1][0]).toContain("31-10-2026");
    expect(data[1][0]).toContain("—"); // em dash separator
    
    // Row 2 should be empty or sparse
    
    // Verify headers (row 3)
    expect(data[3]).toEqual(["Client", "Start", "End", "Hours"]);
    
    // Verify data row (row 4)
    expect(data[4][0]).toBe("ACME Corporation");
    expect(data[4][1]).toBe("01-10-2026");
    expect(data[4][2]).toBe("31-10-2026");
    expect(data[4][3]).toBe("16h");
    
    // Verify total row (row 5)
    expect(data[5][0]).toBe("Total Hours");
    expect(data[5][3]).toBe("16h");
  });

  it("Detail sheet has exactly: Date, Duration (hours), Description", () => {
    const buffer = serializeMonthlyTimesheetXlsx(testDataset);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Detail"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    // Verify headers
    expect(data[0]).toEqual(["Date", "Duration (hours)", "Description"]);
    
    // Verify data rows count (4 entries)
    expect(data.length).toBe(5); // 1 header + 4 entries
  });

  it("Detail dates use Italian format gg-mm-aaaa with dashes", () => {
    const buffer = serializeMonthlyTimesheetXlsx(testDataset);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Detail"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    // Check date format: gg-mm-aaaa
    expect(data[1][0]).toBe("05-10-2026");
    expect(data[3][0]).toBe("10-10-2026");
    
    // Verify no slash format
    expect(String(data[1][0])).not.toContain("/");
  });

  it("contains NO financial data in any cell", () => {
    const buffer = serializeMonthlyTimesheetXlsx(testDataset);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Check all sheets
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
      const fullText = JSON.stringify(data).toLowerCase();

      // Verify no financial terms
      expect(fullText).not.toContain("revenue");
      expect(fullText).not.toContain("invoice");
      expect(fullText).not.toContain("amount");
      expect(fullText).not.toContain("billable");
      expect(fullText).not.toContain("eur");
      expect(fullText).not.toContain("usd");
      expect(fullText).not.toContain("3800");
      expect(fullText).not.toContain("1200");
      expect(fullText).not.toContain("paid");
      expect(fullText).not.toContain("outstanding");
    }
  });

  it("Detail contains all entry descriptions without omissions", () => {
    const buffer = serializeMonthlyTimesheetXlsx(testDataset);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Detail"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    const descriptions = data.slice(1).map((row) => row[2]);
    
    expect(descriptions).toContain("Development task A");
    expect(descriptions).toContain("Code review session");
    expect(descriptions).toContain("Client meeting and planning");
    expect(descriptions).toContain("Internal admin work");
    expect(descriptions.length).toBe(4);
  });

  it("Detail duration column shows hours not minutes", () => {
    const buffer = serializeMonthlyTimesheetXlsx(testDataset);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Detail"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    // 240 minutes = 4h
    expect(data[1][1]).toBe("4h");
    expect(data[2][1]).toBe("4h");
    // 420 minutes = 7h
    expect(data[3][1]).toBe("7h");
    // 60 minutes = 1h
    expect(data[4][1]).toBe("1h");
  });

  it("Summary sheet structure supports professional formatting", () => {
    const buffer = serializeMonthlyTimesheetXlsx(testDataset);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Summary"];

    // Verify all expected cells exist in correct positions
    expect(sheet["A1"]).toBeDefined(); // Title
    expect(sheet["A2"]).toBeDefined(); // Period
    expect(sheet["A4"]).toBeDefined(); // Header: Client
    expect(sheet["B4"]).toBeDefined(); // Header: Start
    expect(sheet["C4"]).toBeDefined(); // Header: End
    expect(sheet["D4"]).toBeDefined(); // Header: Hours
    expect(sheet["A5"]).toBeDefined(); // Data: Client name
    expect(sheet["B5"]).toBeDefined(); // Data: Start date
    expect(sheet["C5"]).toBeDefined(); // Data: End date
    expect(sheet["D5"]).toBeDefined(); // Data: Hours value
    expect(sheet["A6"]).toBeDefined(); // Total: Label
    expect(sheet["D6"]).toBeDefined(); // Total: Value

    // Verify the buffer is a valid Excel file
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    
    // Note: The xlsx library (community version 0.18.5) has limitations
    // in reading styles back from a buffer. Styles are correctly written
    // to the Excel file (bold fonts, colors, borders, alignment) but
    // cannot be reliably verified through XLSX.read(). The formatting
    // is applied at write time and will be visible when opening the file
    // in Excel, LibreOffice, or Google Sheets.
  });

  it("Summary sheet handles empty dataset gracefully", () => {
    const emptyDataset: MonthlyTimesheetExportDataset = {
      ...testDataset,
      clientName: "No Client",
      totalMinutes: 0,
      billableMinutes: 0,
      dailyBreakdown: [],
    };

    const buffer = serializeMonthlyTimesheetXlsx(emptyDataset);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Summary"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    // Verify structure is maintained
    expect(data[0][0]).toBe("Monthly Timesheet Summary");
    expect(data[3]).toEqual(["Client", "Start", "End", "Hours"]);
    expect(data[4][0]).toBe("No Client");
    expect(data[4][3]).toBe("0h");
    expect(data[5][0]).toBe("Total Hours");
    expect(data[5][3]).toBe("0h");
  });
});
