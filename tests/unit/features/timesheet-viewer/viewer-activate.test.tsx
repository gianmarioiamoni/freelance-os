// tests/unit/features/timesheet-viewer/viewer-activate.test.tsx
// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { ViewerActivateForm } from "@/features/timesheet-viewer/ViewerActivateForm";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("ViewerActivateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display error when no token is provided", () => {
    render(<ViewerActivateForm />);

    expect(screen.getByText("Invalid Link")).toBeInTheDocument();
    expect(
      screen.getByText(/this activation link is invalid/i),
    ).toBeInTheDocument();
  });

  it("should display error message when initialError is provided", () => {
    render(<ViewerActivateForm token="test-token" error="Token expired" />);

    expect(screen.getByText("Activation Failed")).toBeInTheDocument();
    expect(screen.getByText("Token expired")).toBeInTheDocument();
  });

  it("should display activate button when token is present", () => {
    render(<ViewerActivateForm token="test-token" />);

    expect(
      screen.getByRole("button", { name: /activate access/i }),
    ).toBeInTheDocument();
  });

  it("should show success message after successful activation", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ViewerActivateForm token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText(/activation successful/i)).toBeInTheDocument();
    });
  });

  it("should show error message when activation fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Token has expired" }),
    });

    render(<ViewerActivateForm token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText("Token has expired")).toBeInTheDocument();
    });
  });
});
