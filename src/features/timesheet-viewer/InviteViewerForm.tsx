// src/features/timesheet-viewer/InviteViewerForm.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteViewerAction } from "@/features/timesheet-viewer/timesheet-viewer-actions";
import { useState, type JSX } from "react";

type InviteViewerFormProps = {
  onSuccess?: (viewerAccessId: string) => void;
};

export function InviteViewerForm({
  onSuccess,
}: InviteViewerFormProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);

    const result = await inviteViewerAction(email, 72);

    setIsPending(false);

    if (result.success) {
      setSuccess(true);
      setEmail("");
      onSuccess?.(result.data.viewerAccessId);
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to invite viewer</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      
      {success ? (
        <Alert>
          <AlertTitle>Invitation sent</AlertTitle>
          <AlertDescription className="grid gap-2">
            <p className="text-sm">
              Viewer invited successfully. An email with the invitation link will be sent.
            </p>
            <p className="text-xs text-muted-foreground">
              TODO: Email integration - token is generated but email service is not yet implemented.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <Field label="Viewer Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          placeholder="viewer@example.com"
        />
      </Field>

      <Button type="submit" disabled={isPending || !email.trim()}>
        {isPending ? "Inviting…" : "Invite Viewer"}
      </Button>
    </form>
  );
}
