// @vitest-environment jsdom
// tests/unit/features/admin/DeleteUserDialog.test.tsx
import type { DeleteImpactAnalysis } from "@/application/admin/analyze-user-delete-impact";
import { DeleteUserDialog } from "@/features/admin/DeleteUserDialog";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/admin/get-delete-impact-action", () => ({
  getDeleteImpactAction: vi.fn(),
}));

vi.mock("@/features/admin/delete-user-action", () => ({
  deleteUserAction: vi.fn(),
}));

import { deleteUserAction } from "@/features/admin/delete-user-action";
import { getDeleteImpactAction } from "@/features/admin/get-delete-impact-action";

function createImpact(
  overrides: Partial<DeleteImpactAnalysis> = {},
): DeleteImpactAnalysis {
  return {
    targetUserId: "user-1",
    targetUserEmail: "user@example.com",
    workspaces: [],
    canDelete: true,
    ...overrides,
  };
}

describe("DeleteUserDialog", () => {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows sole-owner workspaces as destructive", async () => {
    vi.mocked(getDeleteImpactAction).mockResolvedValue({
      analysis: createImpact({
        workspaces: [
          {
            workspaceId: "ws-1",
            workspaceName: "Solo Studio",
            isSoleOwner: true,
            willBeDeleted: true,
          },
        ],
      }),
      error: null,
    });

    render(
      <DeleteUserDialog
        userId="user-1"
        userName="Casey"
        userEmail="casey@example.com"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    expect(await screen.findByText("Workspaces That Will Be Deleted")).toBeInTheDocument();
    expect(screen.getByText("Solo Studio")).toBeInTheDocument();
    expect(
      screen.getByText(/permanently deleted because this user is the sole owner/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete User" })).toBeDisabled();
  });

  it("shows shared-owner workspaces as preserved", async () => {
    vi.mocked(getDeleteImpactAction).mockResolvedValue({
      analysis: createImpact({
        workspaces: [
          {
            workspaceId: "ws-2",
            workspaceName: "Shared Studio",
            isSoleOwner: false,
            willBeDeleted: false,
          },
        ],
      }),
      error: null,
    });

    render(
      <DeleteUserDialog
        userId="user-1"
        userName="Casey"
        userEmail="casey@example.com"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    expect(
      await screen.findByText("Workspaces That Will Be Preserved"),
    ).toBeInTheDocument();
    expect(screen.getByText("Shared Studio")).toBeInTheDocument();
    expect(
      screen.getByText(/remain because another OWNER exists/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete User" })).toBeEnabled();
  });

  it("handles the no-workspace case", async () => {
    vi.mocked(getDeleteImpactAction).mockResolvedValue({
      analysis: createImpact(),
      error: null,
    });

    render(
      <DeleteUserDialog
        userId="user-1"
        userName="Casey"
        userEmail="casey@example.com"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    expect(
      await screen.findByText(/no workspace will be deleted/i),
    ).toBeInTheDocument();
  });

  it("renders safe human-readable backend errors", async () => {
    vi.mocked(getDeleteImpactAction).mockResolvedValue({
      analysis: null,
      error: "Unauthorized admin access.",
    });

    render(
      <DeleteUserDialog
        userId="user-1"
        userName="Casey"
        userEmail="casey@example.com"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unauthorized admin access.",
    );
    expect(screen.queryByText(/prisma/i)).not.toBeInTheDocument();
  });

  it("prevents duplicate delete submissions while pending", async () => {
    vi.mocked(getDeleteImpactAction).mockResolvedValue({
      analysis: createImpact(),
      error: null,
    });

    let resolveDelete: (value: null) => void = () => undefined;
    vi.mocked(deleteUserAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve;
        }),
    );

    render(
      <DeleteUserDialog
        userId="user-1"
        userName="Casey"
        userEmail="casey@example.com"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    const deleteButton = await screen.findByRole("button", { name: "Delete User" });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteUserAction).toHaveBeenCalledTimes(1);
    });
    expect(deleteButton).toBeDisabled();

    resolveDelete(null);
  });
});
