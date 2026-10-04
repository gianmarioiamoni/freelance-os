// src/features/admin/DisableUserDialog.tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { disableUserAction } from "@/features/admin/disable-user-action";
import { Loader2 } from "lucide-react";
import { useState, type JSX } from "react";

type DisableUserDialogProps = {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function DisableUserDialog({
  userId,
  userName,
  open,
  onOpenChange,
  onSuccess,
}: DisableUserDialogProps): JSX.Element {
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisable(): Promise<void> {
    if (disabling) {
      return;
    }

    setDisabling(true);
    setError(null);
    const result = await disableUserAction(userId);
    if (result?.error) {
      setError(result.error);
      setDisabling(false);
      return;
    }

    setDisabling(false);
    onOpenChange(false);
    onSuccess();
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (disabling) {
      return;
    }
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disable User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to disable {userName}? The user will no longer
            be able to access the application. Their workspace and data will NOT
            be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabling}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleDisable();
            }}
            disabled={disabling}
            aria-busy={disabling}
          >
            {disabling ? (
              <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Disable
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
