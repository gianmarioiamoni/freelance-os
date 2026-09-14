// src/features/time-entries/DeleteTimeEntryForm.tsx
"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteTimeEntryAction } from "@/features/time-entries/delete-time-entry-action";
import { useState, type JSX } from "react";

type DeleteTimeEntryFormProps = {
  timeEntryId: string;
  clientName: string;
  workDate: string;
  description?: string | null;
};

export function DeleteTimeEntryForm({
  timeEntryId,
  clientName,
  workDate,
  description,
}: DeleteTimeEntryFormProps): JSX.Element {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteTimeEntryAction(timeEntryId, workDate);
    } catch {
      // Error handling is done in the server action
      setIsDeleting(false);
    }
  }

  if (!isConfirming) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Delete Time Entry</CardTitle>
          <CardDescription>
            Permanently remove this time entry. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            <p><strong>Client:</strong> {clientName}</p>
            <p><strong>Date:</strong> {new Date(workDate + "T00:00:00.000Z").toLocaleDateString()}</p>
            {description && <p><strong>Description:</strong> {description}</p>}
          </div>
          <Button 
            variant="destructive" 
            onClick={() => setIsConfirming(true)}
          >
            Delete Entry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Confirm Deletion</CardTitle>
        <CardDescription>
          Are you sure you want to permanently delete this time entry?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            <strong>Warning:</strong> This will permanently remove the time entry from your workspace. 
            This action cannot be undone.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Yes, Delete Entry"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsConfirming(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}