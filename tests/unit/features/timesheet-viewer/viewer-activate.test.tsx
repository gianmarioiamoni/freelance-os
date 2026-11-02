// tests/unit/features/timesheet-viewer/viewer-activate.test.tsx
// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ViewerActivateForm } from "@/features/timesheet-viewer/ViewerActivateForm";
import { describe, it, expect, vi, beforeEach } from "vitest";

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

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Token expired")).toBeInTheDocument();
  });

  it("should display email form when token is present", () => {
    render(<ViewerActivateForm token="test-token" />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send sign-in link/i }),
    ).toBeInTheDocument();
  });

  it("should pre-populate email when provided", () => {
    render(<ViewerActivateForm token="test-token" email="test@example.com" />);

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(emailInput.value).toBe("test@example.com");
  });

  it("should show success message after sending magic link", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ViewerActivateForm token="test-token" email="test@example.com" />);

    const button = screen.getByRole("button", { name: /send sign-in link/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it("should show error message when magic link request fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid invitation" }),
    });

    render(<ViewerActivateForm token="test-token" email="test@example.com" />);

    const button = screen.getByRole("button", { name: /send sign-in link/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Invalid invitation")).toBeInTheDocument();
    });
  });
});
