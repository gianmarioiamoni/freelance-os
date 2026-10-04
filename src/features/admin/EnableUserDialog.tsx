// src/features/admin/EnableUserDialog.tsx
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
import { enableUserAction } from "@/features/admin/enable-user-action";
import { Loader2 } from "lucide-react";
import { useState, type JSX } from "react";

type EnableUserDialogProps = {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function EnableUserDialog({
  userId,
  userName,
  open,
  onOpenChange,
  onSuccess,
}: EnableUserDialogProps): JSX.Element {
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnable(): Promise<void> {
    if (enabling) {
      return;
    }

    setEnabling(true);
    setError(null);
    const result = await enableUserAction(userId);
    if (result?.error) {
      setError(result.error);
      setEnabling(false);
      return;
    }

    setEnabling(false);
    onOpenChange(false);
    onSuccess();
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (enabling) {
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
          <AlertDialogTitle>Enable User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to enable {userName}? The user will be able to
            access the application again.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enabling}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleEnable();
            }}
            disabled={enabling}
            aria-busy={enabling}
          >
            {enabling ? (
              <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Enable
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
