// src/features/admin/UserStatus.tsx
import type { AdminUserListItem } from "@/application/admin/list-users";
import type { JSX } from "react";

type UserStatusProps = {
  user: AdminUserListItem;
};

type StatusPresentation = {
  label: string;
  className: string;
};

function getStatusPresentation(user: AdminUserListItem): StatusPresentation {
  if (user.deletedAt) {
    return {
      label: "Deleted",
      className:
        "bg-destructive/10 text-destructive",
    };
  }

  if (user.disabledAt) {
    return {
      label: "Disabled",
      className: "bg-yellow-50 text-yellow-800",
    };
  }

  return {
    label: "Active",
    className: "bg-green-50 text-green-700",
  };
}

export function UserStatus({ user }: UserStatusProps): JSX.Element {
  const status = getStatusPresentation(user);

  return (
    <span
      role="status"
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${status.className}`}
    >
      {status.label}
    </span>
  );
}
