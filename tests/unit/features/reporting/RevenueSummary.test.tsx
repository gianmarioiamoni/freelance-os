// @vitest-environment jsdom
// tests/unit/features/reporting/RevenueSummary.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RevenueSummary } from "@/features/reporting/RevenueSummary";
import type {
  AccruedRevenue,
  ExpectedRevenue,
  ForecastRevenue,
} from "@/domain/analytics-types";
import type { CurrencyAmount } from "@/application/invoices/workspace-invoice-service";

describe("RevenueSummary", () => {
  const period = {
    startDate: new Date("2026-10-01"),
    endDate: new Date("2026-10-31"),
  };

  const accrued: AccruedRevenue = {
    period,
    timezone: "Europe/Rome",
    byCurrency: [{ currency: "EUR", unrounded: 1000, published: 1000 }],
    byContract: [],
  };

  const expected: ExpectedRevenue = {
    period,
    timezone: "Europe/Rome",
    byCurrency: [{ currency: "EUR", unrounded: 5000, published: 5000 }],
    byContract: [],
  };

  const forecast: ForecastRevenue = {
    period,
    timezone: "Europe/Rome",
    byCurrency: [{ currency: "EUR", unrounded: 3000, published: 3000 }],
    byContract: [],
    elapsedPeriod: 15,
    totalPeriod: 31,
  };

  it("displays accrued revenue", () => {
    render(<RevenueSummary accrued={accrued} forecast={null} />);

    expect(screen.getByText("Accrued")).toBeInTheDocument();
    expect(screen.getByText("1000 EUR")).toBeInTheDocument();
  });

  it("displays expected revenue when provided", () => {
    render(
      <RevenueSummary accrued={accrued} forecast={null} expected={expected} />,
    );

    expect(screen.getByText("Expected")).toBeInTheDocument();
    expect(screen.getByText("5000 EUR")).toBeInTheDocument();
  });

  it("displays forecast when provided", () => {
    render(<RevenueSummary accrued={accrued} forecast={forecast} />);

    expect(screen.getByText("Forecast")).toBeInTheDocument();
    expect(screen.getByText("3000 EUR")).toBeInTheDocument();
  });

  it("displays invoice metrics when provided", () => {
    const invoiced: CurrencyAmount[] = [{ currency: "EUR", amount: "2000.0000" }];
    const paid: CurrencyAmount[] = [{ currency: "EUR", amount: "1500.0000" }];
    const outstanding: CurrencyAmount[] = [{ currency: "EUR", amount: "500.0000" }];

    render(
      <RevenueSummary
        accrued={accrued}
        forecast={null}
        invoiced={invoiced}
        paid={paid}
        outstanding={outstanding}
      />,
    );

    expect(screen.getByText("Invoiced")).toBeInTheDocument();
    expect(screen.getByText("2000 EUR")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("1500 EUR")).toBeInTheDocument();
    expect(screen.getByText("Outstanding")).toBeInTheDocument();
    expect(screen.getByText("500 EUR")).toBeInTheDocument();
  });

  it("shows dash empty state for invoice metrics", () => {
    render(
      <RevenueSummary
        accrued={accrued}
        forecast={null}
        invoiced={[]}
        paid={[]}
        outstanding={[]}
      />,
    );

    expect(screen.getByText("Invoiced")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Outstanding")).toBeInTheDocument();
    expect(screen.getAllByText("-")).toHaveLength(3);
  });

  it("displays multi-currency invoice data separately", () => {
    render(
      <RevenueSummary
        accrued={accrued}
        forecast={null}
        invoiced={[
          { currency: "EUR", amount: "1000.0000" },
          { currency: "USD", amount: "500.0000" },
        ]}
        paid={[{ currency: "EUR", amount: "600.0000" }]}
        outstanding={[
          { currency: "EUR", amount: "400.0000" },
          { currency: "USD", amount: "500.0000" },
        ]}
      />,
    );

    expect(screen.getByText(/1000 EUR, 500 USD/)).toBeInTheDocument();
    expect(screen.getByText("600 EUR")).toBeInTheDocument();
    expect(screen.getByText(/400 EUR, 500 USD/)).toBeInTheDocument();
  });

  it("displays all five revenue concepts together", () => {
    render(
      <RevenueSummary
        accrued={accrued}
        forecast={forecast}
        expected={expected}
        invoiced={[{ currency: "EUR", amount: "2000.0000" }]}
        paid={[{ currency: "EUR", amount: "1500.0000" }]}
        outstanding={[{ currency: "EUR", amount: "500.0000" }]}
      />,
    );

    expect(screen.getByText("Accrued")).toBeInTheDocument();
    expect(screen.getByText("Expected")).toBeInTheDocument();
    expect(screen.getByText("Invoiced")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Outstanding")).toBeInTheDocument();
  });
});
