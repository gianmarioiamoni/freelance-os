// src/features/admin/enable-user-action.ts
"use server";

import { enableUser } from "@/application/admin/enable-user";
import { mapAdminActionError } from "@/features/admin/map-admin-action-error";
import { revalidatePath } from "next/cache";

export type EnableUserActionState = {
  error: string;
} | null;

export async function enableUserAction(
  userId: string,
): Promise<EnableUserActionState> {
  try {
    await enableUser(userId);
    revalidatePath("/admin");
    return null;
  } catch (error) {
    return { error: mapAdminActionError(error, "Failed to enable user.") };
  }
}
