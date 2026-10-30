// src/features/timesheet-viewer/ViewerAccessList.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { revokeViewerAction } from "@/features/timesheet-viewer/timesheet-viewer-actions";
import { useState, type JSX } from "react";
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

type ViewerAccess = {
  id: string;
  email: string;
  status: string;
  userId: string | null;
  createdAt: Date;
  revokedAt: Date | null;
};

type ViewerAccessListProps = {
  viewers: ViewerAccess[];
  onManageContracts?: (viewerId: string) => void;
};

export function ViewerAccessList({
  viewers,
  onManageContracts,
}: ViewerAccessListProps): JSX.Element {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  async function handleRevoke(viewerId: string) {
    setRevoking(viewerId);
    await revokeViewerAction(viewerId);
    setRevoking(null);
    setConfirmRevoke(null);
  }

  if (viewers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No viewers have been invited yet.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {viewers.map((viewer) => (
            <TableRow key={viewer.id}>
              <TableCell>{viewer.email}</TableCell>
              <TableCell>
                <span
                  className={
                    viewer.status === "ACTIVE"
                      ? "text-green-600"
                      : viewer.status === "REVOKED"
                        ? "text-red-600"
                        : "text-yellow-600"
                  }
                >
                  {viewer.status}
                </span>
              </TableCell>
              <TableCell>
                {new Date(viewer.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {viewer.status === "ACTIVE" && onManageContracts ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onManageContracts(viewer.id)}
                    >
                      Manage Contracts
                    </Button>
                  ) : null}
                  {viewer.status !== "REVOKED" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={revoking === viewer.id}
                      onClick={() => setConfirmRevoke(viewer.id)}
                    >
                      {revoking === viewer.id ? "Revoking…" : "Revoke"}
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={confirmRevoke !== null}
        onOpenChange={() => setConfirmRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Access Revocation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke access for this viewer. They will no
              longer be able to view any timesheets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRevoke && handleRevoke(confirmRevoke)}
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
