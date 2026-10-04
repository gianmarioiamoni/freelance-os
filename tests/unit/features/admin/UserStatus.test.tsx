// @vitest-environment jsdom
// tests/unit/features/admin/UserStatus.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserStatus } from "@/features/admin/UserStatus";
import type { AdminUserListItem } from "@/application/admin/list-users";

describe("UserStatus", () => {
  const baseUser: AdminUserListItem = {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    createdAt: new Date(),
    disabledAt: null,
    deletedAt: null,
    isAdmin: false,
  };

  it("should display Active status for active users", () => {
    render(<UserStatus user={baseUser} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("should display Disabled status for disabled users", () => {
    const disabledUser = {
      ...baseUser,
      disabledAt: new Date(),
    };
    render(<UserStatus user={disabledUser} />);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("should display Deleted status for deleted users", () => {
    const deletedUser = {
      ...baseUser,
      deletedAt: new Date(),
    };
    render(<UserStatus user={deletedUser} />);
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("should prioritize Deleted over Disabled status", () => {
    const deletedUser = {
      ...baseUser,
      disabledAt: new Date(),
      deletedAt: new Date(),
    };
    render(<UserStatus user={deletedUser} />);
    expect(screen.getByText("Deleted")).toBeInTheDocument();
    expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
  });
});
