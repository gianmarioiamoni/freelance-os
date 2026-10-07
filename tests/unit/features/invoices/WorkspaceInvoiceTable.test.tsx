// @vitest-environment jsdom
// tests/unit/features/invoices/WorkspaceInvoiceTable.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { WorkspaceInvoiceListItem } from "@/application/invoices/workspace-invoice-service";
import { WorkspaceInvoiceTable } from "@/features/invoices/WorkspaceInvoiceTable";

function invoiceItem(
  overrides: Partial<WorkspaceInvoiceListItem> = {},
): WorkspaceInvoiceListItem {
  return {
    id: "invoice-1",
    workspaceId: "workspace-1",
    contractId: "contract-1",
    invoiceDate: new Date("2026-09-01T00:00:00.000Z"),
    amount: "1500.0000",
    currency: "EUR",
    reference: "INV-1",
    paymentTermsDays: 30,
    dueDate: new Date("2026-10-01T00:00:00.000Z"),
    voidedAt: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    trackingState: "ACTIVE",
    paidAmount: "500.0000",
    amountStatus: "PARTIAL",
    overdue: false,
    clientId: "client-1",
    clientName: "Acme Corp",
    ...overrides,
  };
}

describe("WorkspaceInvoiceTable", () => {
  const contractLabels = {
    "contract-1": "Acme Corp · 2026-01-01 – ongoing",
  };

  it("renders invoice rows with client, contract, amounts, and status", () => {
    render(
      <WorkspaceInvoiceTable
        invoices={[invoiceItem()]}
        contractLabels={contractLabels}
        tracking="ACTIVE"
      />,
    );

    expect(screen.getByRole("table", { name: "Workspace invoices" })).toBeInTheDocument();
    expect(screen.getByText("2026-09-01")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp · 2026-01-01 – ongoing")).toBeInTheDocument();
    expect(screen.getByText("1500 EUR")).toBeInTheDocument();
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.getByText("500 EUR")).toBeInTheDocument();
    expect(screen.getByText("1000 EUR")).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("2026-10-01")).toBeInTheDocument();
    expect(screen.getByText("INV-1")).toBeInTheDocument();
  });

  it("renders overdue indication when applicable", () => {
    render(
      <WorkspaceInvoiceTable
        invoices={[invoiceItem({ overdue: true, amountStatus: "UNPAID", paidAmount: "0" })]}
        contractLabels={contractLabels}
        tracking="ACTIVE"
      />,
    );

    expect(screen.getByLabelText("Overdue")).toHaveTextContent("Overdue");
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
  });

  it("renders empty state when there are no invoices", () => {
    render(
      <WorkspaceInvoiceTable
        invoices={[]}
        contractLabels={{}}
        tracking="ACTIVE"
      />,
    );

    expect(screen.getByText("No active invoices")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Active invoices across contracts in this workspace for the selected filters will appear here.",
      ),
    ).toBeInTheDocument();
  });

  it("links each invoice to the existing detail workflow", () => {
    render(
      <WorkspaceInvoiceTable
        invoices={[invoiceItem()]}
        contractLabels={contractLabels}
        tracking="ACTIVE"
      />,
    );

    const detailLink = screen.getByRole("link", { name: "2026-09-01" });
    expect(detailLink).toHaveAttribute(
      "href",
      "/contracts/contract-1/invoices/invoice-1",
    );
  });
});
