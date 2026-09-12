// src/features/workspace/create-first-workspace-action.ts
"use server";

import {
  DEFAULT_AUTHENTICATED_PATH,
  SIGN_IN_PATH,
} from "@/application/auth/route-access";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import {
  FirstWorkspaceAlreadyExistsError,
  InvalidWorkspaceCreationInputError,
  type WorkspaceCreationInputField,
} from "@/domain/workspace-errors";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { runInTransaction } from "@/infrastructure/persistence/create-repositories";
import { redirect } from "next/navigation";

export type CreateFirstWorkspaceActionState = {
  error: string;
  field?: WorkspaceCreationInputField;
} | null;

const FIELD_ERROR_MESSAGES: Record<WorkspaceCreationInputField, string> = {
  name: "Enter a workspace name.",
  timezone: "Select a valid timezone.",
  currency: "Select a valid currency.",
};

export async function createFirstWorkspaceAction(
  _previousState: CreateFirstWorkspaceActionState,
  formData: FormData,
): Promise<CreateFirstWorkspaceActionState> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  try {
    await createFirstWorkspace(
      session.user.id,
      {
        name: String(formData.get("name") ?? ""),
        timezone: String(formData.get("timezone") ?? ""),
        currency: String(formData.get("currency") ?? ""),
      },
      { runInTransaction },
    );
  } catch (error) {
    if (error instanceof InvalidWorkspaceCreationInputError) {
      return {
        error: FIELD_ERROR_MESSAGES[error.field],
        field: error.field,
      };
    }

    if (error instanceof FirstWorkspaceAlreadyExistsError) {
      redirect(DEFAULT_AUTHENTICATED_PATH);
    }

    return { error: "Unable to create the workspace." };
  }

  redirect(DEFAULT_AUTHENTICATED_PATH);
}
