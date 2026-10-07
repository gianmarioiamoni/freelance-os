// @vitest-environment jsdom
// tests/unit/features/invoices/invoices-page-states.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import InvoicesLoading from "@/app/(app)/invoices/loading";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

vi.mock("@/features/invoices/load-workspace-invoices", () => ({
  loadWorkspaceInvoicesPageData: vi.fn(),
}));

describe("invoices page states", () => {
  it("renders loading state for the invoices route", () => {
    render(<InvoicesLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading invoices…");
  });

  it("renders a meaningful error state message", () => {
    render(
      <ErrorState message="Unable to load invoices. Please try again later." />,
    );

    expect(
      screen.getByText("Unable to load invoices. Please try again later."),
    ).toBeInTheDocument();
  });

  it("exposes LoadingState accessibility role", () => {
    render(<LoadingState message="Loading invoices…" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
