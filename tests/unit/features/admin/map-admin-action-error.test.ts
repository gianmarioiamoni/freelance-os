// tests/unit/features/admin/map-admin-action-error.test.ts
import {
  InvalidAdminConfigurationError,
  UnauthorizedAdminAccessError,
} from "@/application/admin/admin-errors";
import {
  AdminSelfProtectionError,
  UserAlreadyDeletedError,
  UserAlreadyDisabledError,
  UserDeletedError,
  UserNotDisabledError,
  UserNotFoundError,
} from "@/application/admin/user-lifecycle-errors";
import { mapAdminActionError } from "@/features/admin/map-admin-action-error";
import { describe, expect, it } from "vitest";

describe("mapAdminActionError", () => {
  it("maps unauthorized and configuration errors without leaking internals", () => {
    expect(mapAdminActionError(new UnauthorizedAdminAccessError(), "fallback")).toBe(
      "Unauthorized admin access.",
    );
    expect(
      mapAdminActionError(new InvalidAdminConfigurationError(), "fallback"),
    ).toBe("Unauthorized admin access.");
  });

  it("maps lifecycle errors to human-readable messages", () => {
    expect(mapAdminActionError(new UserNotFoundError("user-1"), "fallback")).toBe(
      "User not found.",
    );
    expect(
      mapAdminActionError(new UserAlreadyDisabledError("user-1"), "fallback"),
    ).toBe("User is already disabled.");
    expect(
      mapAdminActionError(new UserNotDisabledError("user-1"), "fallback"),
    ).toBe("User is not disabled.");
    expect(
      mapAdminActionError(new UserAlreadyDeletedError("user-1"), "fallback"),
    ).toBe("User has already been deleted.");
    expect(mapAdminActionError(new UserDeletedError("user-1"), "fallback")).toBe(
      "User has been deleted.",
    );
    expect(
      mapAdminActionError(new AdminSelfProtectionError("disable"), "fallback"),
    ).toBe("Admin cannot disable itself.");
    expect(
      mapAdminActionError(new AdminSelfProtectionError("delete"), "fallback"),
    ).toBe("Admin cannot delete itself.");
  });

  it("returns the fallback for unknown errors", () => {
    expect(mapAdminActionError(new Error("prisma explode"), "Failed to delete user.")).toBe(
      "Failed to delete user.",
    );
  });
});
