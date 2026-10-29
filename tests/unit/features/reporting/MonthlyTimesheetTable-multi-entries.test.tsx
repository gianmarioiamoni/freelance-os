// @vitest-environment jsdom
// Verifica registrazioni multiple nello stesso giorno
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlyTimesheetTable } from "@/features/reporting/MonthlyTimesheetTable";
import type { MonthlyTimesheetReport } from "@/application/reporting/reporting-service";

describe("MonthlyTimesheetTable - Multiple entries per day", () => {
  const reportWithMultipleEntries: MonthlyTimesheetReport = {
    period: {
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-10-31T23:59:59.999Z"),
    },
    periodKind: { kind: "month" },
    clientId: "client-1",
    clientName: "Test Client",
    totalMinutes: 540, // 9h total
    billableMinutes: 480,
    accrued: {
      period: {
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        endDate: new Date("2026-10-31T23:59:59.999Z"),
      },
      timezone: "Europe/Rome",
      byCurrency: [],
      byContract: [],
    },
    dailyBreakdown: [
      {
        workDate: new Date("2026-10-05T00:00:00.000Z"),
        totalMinutes: 540, // 9h total for the day
        billableMinutes: 480,
        entries: [
          {
            id: "entry-1",
            contractId: "contract-1",
            durationMinutes: 120, // 2h
            description: "Morning meeting",
            billable: true,
          },
          {
            id: "entry-2",
            contractId: "contract-1",
            durationMinutes: 180, // 3h
            description: "Development work",
            billable: true,
          },
          {
            id: "entry-3",
            contractId: "contract-1",
            durationMinutes: 180, // 3h
            description: "Code review",
            billable: true,
          },
          {
            id: "entry-4",
            contractId: "contract-1",
            durationMinutes: 60, // 1h
            description: null, // Entry without description
            billable: false,
          },
        ],
      },
    ],
  };

  it("shows correct total hours for day with multiple entries", () => {
    render(<MonthlyTimesheetTable report={reportWithMultipleEntries} />);

    // Date in Italian format with dashes
    expect(screen.getByText("05-10-2026")).toBeInTheDocument();

    // Total hours for the day (9h) appears in multiple places (summary, table row, footer)
    const nineHours = screen.getAllByText("9h");
    expect(nineHours.length).toBeGreaterThan(0);
  });

  it("shows combined descriptions in a single row", () => {
    render(<MonthlyTimesheetTable report={reportWithMultipleEntries} />);

    // Combined descriptions should be visible in the format "desc1 | desc2 | desc3 | desc4"
    expect(screen.getByText("Morning meeting | Development work | Code review | No description")).toBeInTheDocument();
  });

  it("displays all entry durations correctly", () => {
    render(<MonthlyTimesheetTable report={reportWithMultipleEntries} />);

    // The combined duration for the day should be visible in multiple places
    const nineHours = screen.getAllByText("9h");
    expect(nineHours.length).toBeGreaterThan(0);
  });
});
