// src/features/admin/UserActions.tsx
"use client";

import type { AdminUserListItem } from "@/application/admin/list-users";
import { Button } from "@/components/ui/button";
import type { AdminNoticeKey } from "@/features/admin/admin-notices";
import { DeleteUserDialog } from "@/features/admin/DeleteUserDialog";
import { DisableUserDialog } from "@/features/admin/DisableUserDialog";
import { EnableUserDialog } from "@/features/admin/EnableUserDialog";
import { useRouter } from "next/navigation";
import { useState, type JSX } from "react";

type UserActionsProps = {
  user: AdminUserListItem;
};

export function UserActions({ user }: UserActionsProps): JSX.Element {
  const router = useRouter();
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  function handleSuccess(notice: AdminNoticeKey): void {
    router.replace(`/admin?notice=${notice}`);
    router.refresh();
  }

  if (user.deletedAt) {
    return <span className="text-sm text-muted-foreground">No actions</span>;
  }

  if (user.isAdmin) {
    return (
      <span className="text-sm font-medium text-muted-foreground">
        Admin (protected)
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        {user.disabledAt ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnableDialogOpen(true)}
          >
            Enable
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisableDialogOpen(true)}
          >
            Disable
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete
        </Button>
      </div>

      <DisableUserDialog
        userId={user.id}
        userName={user.name}
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        onSuccess={() => handleSuccess("disabled")}
      />

      <EnableUserDialog
        userId={user.id}
        userName={user.name}
        open={enableDialogOpen}
        onOpenChange={setEnableDialogOpen}
        onSuccess={() => handleSuccess("enabled")}
      />

      <DeleteUserDialog
        userId={user.id}
        userName={user.name}
        userEmail={user.email}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={() => handleSuccess("deleted")}
      />
    </>
  );
}
