// @vitest-environment jsdom
// tests/unit/features/admin/UserActions.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserActions } from "@/features/admin/UserActions";
import type { AdminUserListItem } from "@/application/admin/list-users";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("UserActions", () => {
  const baseUser: AdminUserListItem = {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    createdAt: new Date(),
    disabledAt: null,
    deletedAt: null,
    isAdmin: false,
  };

  it("should show Disable and Delete for active non-admin users", () => {
    render(<UserActions user={baseUser} />);
    expect(screen.getByRole("button", { name: /disable/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("should show Enable and Delete for disabled non-admin users", () => {
    const disabledUser = {
      ...baseUser,
      disabledAt: new Date(),
    };
    render(<UserActions user={disabledUser} />);
    expect(screen.getByRole("button", { name: /enable/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("should show no actions for deleted users", () => {
    const deletedUser = {
      ...baseUser,
      deletedAt: new Date(),
    };
    render(<UserActions user={deletedUser} />);
    expect(screen.queryByRole("button", { name: /disable/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enable/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getByText("No actions")).toBeInTheDocument();
  });

  it("should show Admin protected message for admin users", () => {
    const adminUser = {
      ...baseUser,
      isAdmin: true,
    };
    render(<UserActions user={adminUser} />);
    expect(screen.getByText(/admin \(protected\)/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /disable/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});
