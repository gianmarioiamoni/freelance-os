// @vitest-environment jsdom
// tests/unit/features/invoices/WorkspaceInvoiceFilters.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

import { WorkspaceInvoiceFilters } from "@/features/invoices/WorkspaceInvoiceFilters";

describe("WorkspaceInvoiceFilters", () => {
  beforeEach(() => {
    push.mockReset();
  });

  const clients = [
    { id: "11111111-1111-1111-1111-111111111111", label: "Acme Corp" },
    { id: "22222222-2222-2222-2222-222222222222", label: "Beta LLC" },
  ];

  it("renders period, tracking, and client filter controls", () => {
    render(
      <WorkspaceInvoiceFilters
        view={{ period: { kind: "month" }, tracking: "ACTIVE" }}
        clients={clients}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Invoice period" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "This Month" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "This Week" })).toHaveAttribute(
      "href",
      "/invoices?period=week",
    );
    expect(screen.getByRole("navigation", { name: "Invoice tracking" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Active" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Void" })).toHaveAttribute(
      "href",
      "/invoices?period=month&tracking=VOID",
    );
    expect(screen.getByLabelText("Client")).toBeInTheDocument();
  });

  it("updates client filter through navigation", () => {
    render(
      <WorkspaceInvoiceFilters
        view={{ period: { kind: "month" }, tracking: "ALL" }}
        clients={clients}
      />,
    );

    fireEvent.change(screen.getByLabelText("Client"), {
      target: { value: "11111111-1111-1111-1111-111111111111" },
    });

    expect(push).toHaveBeenCalledWith(
      "/invoices?period=month&tracking=ALL&clientId=11111111-1111-1111-1111-111111111111",
    );
  });

  it("preserves combined filters when changing tracking", () => {
    render(
      <WorkspaceInvoiceFilters
        view={{
          period: { kind: "year" },
          tracking: "ACTIVE",
          clientId: "11111111-1111-1111-1111-111111111111",
        }}
        clients={clients}
      />,
    );

    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute(
      "href",
      "/invoices?period=year&tracking=ALL&clientId=11111111-1111-1111-1111-111111111111",
    );
  });
});
