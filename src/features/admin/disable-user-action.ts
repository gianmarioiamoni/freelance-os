// src/features/admin/disable-user-action.ts
"use server";

import { disableUser } from "@/application/admin/disable-user";
import { mapAdminActionError } from "@/features/admin/map-admin-action-error";
import { revalidatePath } from "next/cache";

export type DisableUserActionState = {
  error: string;
} | null;

export async function disableUserAction(
  userId: string,
): Promise<DisableUserActionState> {
  try {
    await disableUser(userId);
    revalidatePath("/admin");
    return null;
  } catch (error) {
    return { error: mapAdminActionError(error, "Failed to disable user.") };
  }
}
