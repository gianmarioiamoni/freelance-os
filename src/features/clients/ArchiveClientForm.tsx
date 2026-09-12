// src/features/clients/ArchiveClientForm.tsx
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  archiveClientAction,
  type ArchiveClientActionState,
} from "@/features/clients/archive-client-action";
import Link from "next/link";
import { useActionState, type JSX } from "react";

type ArchiveClientFormProps = {
  clientId: string;
};

const INITIAL_STATE: ArchiveClientActionState = null;

export function ArchiveClientForm({
  clientId,
}: ArchiveClientFormProps): JSX.Element {
  const action = archiveClientAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);

  return (
    <form className="grid gap-3" action={formAction}>
      <Alert>
        <AlertTitle>Archive this client?</AlertTitle>
        <AlertDescription>
          Archiving keeps the client readable in the archived view. This cannot
          be undone from the application.
        </AlertDescription>
      </Alert>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to archive</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="confirm" value="archive" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={isPending}>
          {isPending ? "Archiving…" : "Confirm archive"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/clients/${clientId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
