// src/features/admin/AdminActionNotice.tsx
import { getAdminNoticeMessage } from "@/features/admin/admin-notices";
import type { JSX } from "react";

type AdminActionNoticeProps = {
  notice: string | undefined;
};

export function AdminActionNotice({
  notice,
}: AdminActionNoticeProps): JSX.Element | null {
  const message = getAdminNoticeMessage(notice);

  if (!message) {
    return null;
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
    >
      {message}
    </p>
  );
}
