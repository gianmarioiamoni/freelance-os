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

    // Total hours for the day (9h)
    expect(screen.getByText("9h")).toBeInTheDocument();
  });

  it("shows combined descriptions when collapsed", () => {
    render(<MonthlyTimesheetTable report={reportWithMultipleEntries} />);

    // Combined descriptions should be visible
    const combinedText = screen.getByText(/Morning meeting.*Development work.*Code review.*No description/);
    expect(combinedText).toBeInTheDocument();
  });

  it("expands to show all individual entries", () => {
    const { container } = render(<MonthlyTimesheetTable report={reportWithMultipleEntries} />);

    const expandButton = screen.getByRole("button", { name: /Expand description for 05-10-2026/ });
    expandButton.click();

    // All 4 entries should be visible when expanded
    expect(screen.getByText("Morning meeting")).toBeInTheDocument();
    expect(screen.getByText("Development work")).toBeInTheDocument();
    expect(screen.getByText("Code review")).toBeInTheDocument();
    expect(screen.getByText("No description")).toBeInTheDocument();

    // Individual durations should be visible
    expect(screen.getByText("2h")).toBeInTheDocument();
    expect(screen.getByText("3h")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
  });

  it("does not duplicate or omit entries when expanding", () => {
    const { container } = render(<MonthlyTimesheetTable report={reportWithMultipleEntries} />);

    const expandButton = screen.getByRole("button", { name: /Expand description for 05-10-2026/ });
    expandButton.click();

    // Count expanded rows (should be exactly 4)
    const expandedRows = container.querySelectorAll("[class*='bg-muted']");
    expect(expandedRows.length).toBe(4);
  });
});
