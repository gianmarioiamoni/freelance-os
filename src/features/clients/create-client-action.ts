// src/features/clients/create-client-action.ts
"use server";

import { createClient } from "@/application/clients/create-client";
import { InvalidClientInputError } from "@/domain/client-errors";
import { getAuthenticatedClientContext } from "@/features/clients/authenticated-client-context";
import {
  CLIENT_FIELD_ERROR_MESSAGES,
  readClientFormValues,
  toClientWriteInput,
  type ClientFormActionState,
} from "@/features/clients/client-form-state";
import { redirect } from "next/navigation";

export async function createClientAction(
  _previousState: ClientFormActionState,
  formData: FormData,
): Promise<ClientFormActionState> {
  const { context, clients } = await getAuthenticatedClientContext();
  const values = readClientFormValues(formData);

  let clientId: string;

  try {
    const client = await createClient(
      context,
      toClientWriteInput(values),
      clients,
    );
    clientId = client.id;
  } catch (error) {
    if (error instanceof InvalidClientInputError) {
      return {
        error: CLIENT_FIELD_ERROR_MESSAGES[error.field],
        field: error.field,
        values,
      };
    }

    return {
      error: "Unable to create the client.",
      values,
    };
  }

  redirect(`/clients/${clientId}`);
}
