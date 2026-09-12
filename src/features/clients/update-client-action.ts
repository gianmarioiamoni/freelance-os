// src/features/clients/update-client-action.ts
"use server";

import { updateClient } from "@/application/clients/update-client";
import {
  ClientNotFoundError,
  InvalidClientInputError,
} from "@/domain/client-errors";
import { getAuthenticatedClientContext } from "@/features/clients/authenticated-client-context";
import {
  CLIENT_FIELD_ERROR_MESSAGES,
  readClientFormValues,
  toClientWriteInput,
  type ClientFormActionState,
} from "@/features/clients/client-form-state";
import { redirect } from "next/navigation";

export async function updateClientAction(
  clientId: string,
  _previousState: ClientFormActionState,
  formData: FormData,
): Promise<ClientFormActionState> {
  const { context, clients } = await getAuthenticatedClientContext();
  const values = readClientFormValues(formData);

  try {
    await updateClient(
      context,
      clientId,
      toClientWriteInput(values),
      clients,
    );
  } catch (error) {
    if (error instanceof InvalidClientInputError) {
      return {
        error: CLIENT_FIELD_ERROR_MESSAGES[error.field],
        field: error.field,
        values,
      };
    }

    if (error instanceof ClientNotFoundError) {
      return {
        error: "This client could not be found.",
        values,
      };
    }

    return {
      error: "Unable to update the client.",
      values,
    };
  }

  redirect(`/clients/${clientId}`);
}
