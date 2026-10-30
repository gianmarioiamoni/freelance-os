"use client";

import { Field } from "@/components/forms/Field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteViewerAction } from "@/features/timesheet-viewer/timesheet-viewer-actions";
import { useState, type JSX } from "react";

type InviteViewerFormProps = {
  onSuccess?: (viewerAccessId: string) => void;
  availableContracts: Array<{ id: string; label: string }>;
};

export function InviteViewerForm({
  onSuccess,
  availableContracts,
}: InviteViewerFormProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (selectedContracts.length === 0) {
      setError("At least one contract must be selected");
      return;
    }

    setIsPending(true);
    setError(null);
    setSuccess(false);

    const result = await inviteViewerAction(email, selectedContracts, 72);

    setIsPending(false);

    if (result.success) {
      setSuccess(true);
      setEmail("");
      setSelectedContracts([]);
      onSuccess?.(result.data.viewerAccessId);
    } else {
      setError(result.error);
    }
  }

  function toggleContract(contractId: string) {
    setSelectedContracts((prev) =>
      prev.includes(contractId)
        ? prev.filter((id) => id !== contractId)
        : [...prev, contractId],
    );
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

      <Field label="Authorized Contracts" htmlFor="contracts">
        <div className="grid gap-2 rounded-lg border p-3">
          {availableContracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contracts available</p>
          ) : (
            availableContracts.map((contract) => (
              <label
                key={contract.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedContracts.includes(contract.id)}
                  onChange={() => toggleContract(contract.id)}
                  disabled={isPending}
                  className="h-4 w-4"
                />
                <span className="text-sm">{contract.label}</span>
              </label>
            ))
          )}
        </div>
      </Field>

      <Button type="submit" disabled={isPending || !email.trim() || selectedContracts.length === 0}>
        {isPending ? "Inviting…" : "Invite Viewer"}
      </Button>
    </form>
  );
}
