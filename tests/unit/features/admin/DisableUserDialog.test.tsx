// @vitest-environment jsdom
// tests/unit/features/admin/DisableUserDialog.test.tsx
import { DisableUserDialog } from "@/features/admin/DisableUserDialog";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/admin/disable-user-action", () => ({
  disableUserAction: vi.fn(),
}));

import { disableUserAction } from "@/features/admin/disable-user-action";

describe("DisableUserDialog", () => {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a safe error message from the backend", async () => {
    vi.mocked(disableUserAction).mockResolvedValue({
      error: "User not found.",
    });

    render(
      <DisableUserDialog
        userId="user-1"
        userName="Casey"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("User not found.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("prevents duplicate disable submissions while pending", async () => {
    let resolveDisable: (value: null) => void = () => undefined;
    vi.mocked(disableUserAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDisable = resolve;
        }),
    );

    render(
      <DisableUserDialog
        userId="user-1"
        userName="Casey"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    const disableButton = screen.getByRole("button", { name: "Disable" });
    fireEvent.click(disableButton);
    fireEvent.click(disableButton);

    await waitFor(() => {
      expect(disableUserAction).toHaveBeenCalledTimes(1);
    });
    expect(disableButton).toBeDisabled();

    resolveDisable(null);
  });
});
