// src/features/admin/map-admin-action-error.ts
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

const UNAUTHORIZED_MESSAGE = "Unauthorized admin access.";

export function mapAdminActionError(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof UnauthorizedAdminAccessError ||
    error instanceof InvalidAdminConfigurationError
  ) {
    return UNAUTHORIZED_MESSAGE;
  }

  if (error instanceof UserNotFoundError) {
    return "User not found.";
  }

  if (error instanceof UserAlreadyDisabledError) {
    return "User is already disabled.";
  }

  if (error instanceof UserNotDisabledError) {
    return "User is not disabled.";
  }

  if (error instanceof UserAlreadyDeletedError) {
    return "User has already been deleted.";
  }

  if (error instanceof UserDeletedError) {
    return "User has been deleted.";
  }

  if (error instanceof AdminSelfProtectionError) {
    return error.message.endsWith("disable itself")
      ? "Admin cannot disable itself."
      : "Admin cannot delete itself.";
  }

  return fallback;
}
