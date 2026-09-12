// src/features/clients/archive-client-action.ts
"use server";

import { archiveClient } from "@/application/clients/archive-client";
import { ClientNotFoundError } from "@/domain/client-errors";
import { getAuthenticatedClientContext } from "@/features/clients/authenticated-client-context";
import { redirect } from "next/navigation";

export type ArchiveClientActionState = {
  error: string;
} | null;

export async function archiveClientAction(
  clientId: string,
  _previousState: ArchiveClientActionState,
  formData: FormData,
): Promise<ArchiveClientActionState> {
  if (formData.get("confirm") !== "archive") {
    return { error: "Confirm that you want to archive this client." };
  }

  const { context, clients } = await getAuthenticatedClientContext();

  try {
    await archiveClient(context, clientId, clients);
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      return { error: "This client could not be found." };
    }

    return { error: "Unable to archive the client." };
  }

  redirect(`/clients/${clientId}`);
}
