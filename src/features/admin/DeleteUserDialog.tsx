// src/features/admin/DeleteUserDialog.tsx
"use client";

import type { DeleteImpactAnalysis } from "@/application/admin/analyze-user-delete-impact";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DeleteImpactPreview } from "@/features/admin/DeleteImpactPreview";
import { deleteUserAction } from "@/features/admin/delete-user-action";
import { getDeleteImpactAction } from "@/features/admin/get-delete-impact-action";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type JSX } from "react";

type DeleteUserDialogProps = {
  userId: string;
  userName: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function DeleteUserDialog({
  userId,
  userName,
  userEmail,
  open,
  onOpenChange,
  onSuccess,
}: DeleteUserDialogProps): JSX.Element {
  const [impact, setImpact] = useState<DeleteImpactAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setImpact(null);
      setError(null);
      setLoading(false);
      setDeleting(false);
      setConfirmed(false);
      return;
    }

    let cancelled = false;

    async function loadImpact(): Promise<void> {
      setImpact(null);
      setConfirmed(false);
      setError(null);
      setLoading(true);

      const result = await getDeleteImpactAction(userId);
      if (cancelled) {
        return;
      }

      if (result.error) {
        setError(result.error);
        setImpact(null);
      } else {
        setImpact(result.analysis);
      }
      setLoading(false);
    }

    void loadImpact();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  async function handleDelete(): Promise<void> {
    if (deleting || !impact) {
      return;
    }

    setDeleting(true);
    setError(null);
    const result = await deleteUserAction(userId);
    if (result?.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    onOpenChange(false);
    onSuccess();
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen && deleting) {
      return;
    }
    onOpenChange(nextOpen);
  }

  const hasDestructiveWorkspaces =
    impact?.workspaces.some((workspace) => workspace.willBeDeleted) ?? false;
  const canConfirmDelete =
    Boolean(impact) &&
    !loading &&
    !deleting &&
    impact?.canDelete !== false &&
    (!hasDestructiveWorkspaces || confirmed);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl" aria-busy={loading || deleting}>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Review the impact before deleting {userName}. This action cannot be
            undone through the Admin UI.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
          >
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            Analyzing delete impact…
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {impact && !loading ? (
          <>
            <DeleteImpactPreview
              userName={userName}
              userEmail={userEmail}
              impact={impact}
            />
            {hasDestructiveWorkspaces ? (
              <div className="flex items-start gap-2">
                <input
                  id="confirm-workspace-deletion"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 size-4 accent-destructive"
                />
                <Label htmlFor="confirm-workspace-deletion">
                  I understand these workspaces will be permanently deleted
                </Label>
              </div>
            ) : null}
          </>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={!canConfirmDelete}
            aria-busy={deleting}
          >
            {deleting ? (
              <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Delete User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
