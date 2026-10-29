// @vitest-environment jsdom
// tests/unit/features/reporting/MonthlyTimesheetTable.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlyTimesheetTable } from "@/features/reporting/MonthlyTimesheetTable";
import type { MonthlyTimesheetReport } from "@/application/reporting/reporting-service";

describe("MonthlyTimesheetTable", () => {
  const mockReport: MonthlyTimesheetReport = {
    period: {
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-10-31T23:59:59.999Z"),
    },
    periodKind: { kind: "month" },
    clientId: "client-1",
    clientName: "Acme Corp",
    totalMinutes: 960,
    billableMinutes: 900,
    accrued: {
      period: {
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        endDate: new Date("2026-10-31T23:59:59.999Z"),
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
        workDate: new Date("2026-10-01T00:00:00.000Z"),
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
            description: "Afternoon work",
            billable: true,
          },
        ],
      },
      {
        workDate: new Date("2026-10-02T00:00:00.000Z"),
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
            description: "Internal admin",
            billable: false,
          },
        ],
      },
    ],
  };

  const emptyReport: MonthlyTimesheetReport = {
    ...mockReport,
    totalMinutes: 0,
    billableMinutes: 0,
    dailyBreakdown: [],
  };

  it("renders summary cards with hours and amounts", () => {
    render(<MonthlyTimesheetTable report={mockReport} />);

    expect(screen.getByText("Hours worked")).toBeInTheDocument();
    const hoursCards = screen.getAllByText("16h");
    expect(hoursCards.length).toBeGreaterThan(0);

    expect(screen.getByText("Billable hours")).toBeInTheDocument();
    const billableCards = screen.getAllByText("15h");
    expect(billableCards.length).toBeGreaterThan(0);

    expect(screen.getByText("Amount to invoice")).toBeInTheDocument();
    expect(screen.getByText("3800 EUR, 1200 USD")).toBeInTheDocument();
  });

  it("renders daily breakdown table with Italian date format", () => {
    render(<MonthlyTimesheetTable report={mockReport} />);

    expect(screen.getByText(/Daily Breakdown - Acme Corp/)).toBeInTheDocument();
    expect(screen.getByText("01-10-2026")).toBeInTheDocument();
    expect(screen.getByText("02-10-2026")).toBeInTheDocument();
    const eightHours = screen.getAllByText("8h");
    expect(eightHours.length).toBeGreaterThanOrEqual(2); // Two days with 8h each
  });

  it("renders monthly total in footer", () => {
    render(<MonthlyTimesheetTable report={mockReport} />);

    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
  });

  it("expands and collapses day details on click", () => {
    const { container } = render(<MonthlyTimesheetTable report={mockReport} />);

    const expandButton = screen.getAllByRole("button", { name: /Expand description/ })[0];
    
    expandButton.click();

    const detailRows = container.querySelectorAll("[class*='bg-muted']");
    expect(detailRows.length).toBeGreaterThan(0);
  });

  it("shows entry details when expanded", () => {
    const { container } = render(<MonthlyTimesheetTable report={mockReport} />);

    const expandButton = screen.getAllByRole("button", { name: /Expand description/ })[1];
    expandButton.click();

    const detailRows = container.querySelectorAll("[class*='bg-muted']");
    expect(detailRows.length).toBeGreaterThan(0);
  });

  it("shows empty state when no daily breakdown", () => {
    render(<MonthlyTimesheetTable report={emptyReport} />);

    expect(screen.getByText("No hours recorded for this period")).toBeInTheDocument();
    expect(
      screen.getByText(/No time entries found for Acme Corp in this period/),
    ).toBeInTheDocument();
  });

  it("renders accessible expand/collapse controls", () => {
    render(<MonthlyTimesheetTable report={mockReport} />);

    const expandButtons = screen.getAllByRole("button", { name: /Expand description/ });
    expect(expandButtons).toHaveLength(2);

    expandButtons.forEach((button) => {
      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("shows entry description or fallback", () => {
    const reportWithEmptyDesc: MonthlyTimesheetReport = {
      ...mockReport,
      dailyBreakdown: [
        {
          workDate: new Date("2026-10-01T00:00:00.000Z"),
          totalMinutes: 240,
          billableMinutes: 240,
          entries: [
            {
              id: "entry-1",
              contractId: "contract-1",
              durationMinutes: 240,
              description: null,
              billable: true,
            },
          ],
        },
      ],
    };

    const { container } = render(<MonthlyTimesheetTable report={reportWithEmptyDesc} />);

    const expandButton = screen.getByRole("button", { name: /Expand description/ });
    expandButton.click();

    const detailRows = container.querySelectorAll("[class*='bg-muted']");
    expect(detailRows.length).toBeGreaterThan(0);
  });

  it("renders multi-currency amounts in summary", () => {
    render(<MonthlyTimesheetTable report={mockReport} />);

    const amountCell = screen.getByText("3800 EUR, 1200 USD");
    expect(amountCell).toBeInTheDocument();
  });

  it("renders single currency when only one present", () => {
    const singleCurrencyReport: MonthlyTimesheetReport = {
      ...mockReport,
      accrued: {
        ...mockReport.accrued,
        byCurrency: [{ currency: "EUR", unrounded: 3800, published: 3800 }],
      },
    };

    render(<MonthlyTimesheetTable report={singleCurrencyReport} />);

    const amountCell = screen.getByText("3800 EUR");
    expect(amountCell).toBeInTheDocument();
  });
});
