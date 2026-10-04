// src/features/admin/admin-notices.ts
export const ADMIN_NOTICES = {
  disabled: "User disabled.",
  enabled: "User enabled.",
  deleted: "User deleted.",
} as const;

export type AdminNoticeKey = keyof typeof ADMIN_NOTICES;

export function getAdminNoticeMessage(
  notice: string | undefined,
): string | null {
  if (!notice) {
    return null;
  }

  if (notice in ADMIN_NOTICES) {
    return ADMIN_NOTICES[notice as AdminNoticeKey];
  }

  return null;
}
