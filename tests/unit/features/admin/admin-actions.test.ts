// tests/unit/features/admin/admin-actions.test.ts
import { UnauthorizedAdminAccessError } from "@/application/admin/admin-errors";
import {
  AdminSelfProtectionError,
  UserAlreadyDeletedError,
  UserAlreadyDisabledError,
  UserDeletedError,
  UserNotDisabledError,
  UserNotFoundError,
} from "@/application/admin/user-lifecycle-errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/application/admin/disable-user", () => ({
  disableUser: vi.fn(),
}));

vi.mock("@/application/admin/enable-user", () => ({
  enableUser: vi.fn(),
}));

vi.mock("@/application/admin/delete-user", () => ({
  deleteUser: vi.fn(),
}));

vi.mock("@/application/admin/analyze-user-delete-impact", () => ({
  analyzeUserDeleteImpact: vi.fn(),
}));

import { analyzeUserDeleteImpact } from "@/application/admin/analyze-user-delete-impact";
import { deleteUser } from "@/application/admin/delete-user";
import { disableUser } from "@/application/admin/disable-user";
import { enableUser } from "@/application/admin/enable-user";
import { deleteUserAction } from "@/features/admin/delete-user-action";
import { disableUserAction } from "@/features/admin/disable-user-action";
import { enableUserAction } from "@/features/admin/enable-user-action";
import { getDeleteImpactAction } from "@/features/admin/get-delete-impact-action";
import { revalidatePath } from "next/cache";

describe("admin server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates /admin after a successful disable", async () => {
    vi.mocked(disableUser).mockResolvedValue(undefined);

    await expect(disableUserAction("user-1")).resolves.toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("maps disable errors to safe messages", async () => {
    vi.mocked(disableUser).mockRejectedValueOnce(new UnauthorizedAdminAccessError());
    await expect(disableUserAction("user-1")).resolves.toEqual({
      error: "Unauthorized admin access.",
    });

    vi.mocked(disableUser).mockRejectedValueOnce(new UserNotFoundError("user-1"));
    await expect(disableUserAction("user-1")).resolves.toEqual({
      error: "User not found.",
    });

    vi.mocked(disableUser).mockRejectedValueOnce(
      new UserAlreadyDisabledError("user-1"),
    );
    await expect(disableUserAction("user-1")).resolves.toEqual({
      error: "User is already disabled.",
    });

    vi.mocked(disableUser).mockRejectedValueOnce(new AdminSelfProtectionError("disable"));
    await expect(disableUserAction("user-1")).resolves.toEqual({
      error: "Admin cannot disable itself.",
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("maps enable errors to safe messages", async () => {
    vi.mocked(enableUser).mockRejectedValueOnce(new UserNotDisabledError("user-1"));
    await expect(enableUserAction("user-1")).resolves.toEqual({
      error: "User is not disabled.",
    });

    vi.mocked(enableUser).mockRejectedValueOnce(new UserDeletedError("user-1"));
    await expect(enableUserAction("user-1")).resolves.toEqual({
      error: "User has been deleted.",
    });
  });

  it("maps delete and impact errors to safe messages", async () => {
    vi.mocked(deleteUser).mockRejectedValueOnce(new UserAlreadyDeletedError("user-1"));
    await expect(deleteUserAction("user-1")).resolves.toEqual({
      error: "User has already been deleted.",
    });

    vi.mocked(deleteUser).mockRejectedValueOnce(new AdminSelfProtectionError("delete"));
    await expect(deleteUserAction("user-1")).resolves.toEqual({
      error: "Admin cannot delete itself.",
    });

    vi.mocked(analyzeUserDeleteImpact).mockRejectedValueOnce(
      new UnauthorizedAdminAccessError(),
    );
    await expect(getDeleteImpactAction("user-1")).resolves.toEqual({
      analysis: null,
      error: "Unauthorized admin access.",
    });
  });
});
