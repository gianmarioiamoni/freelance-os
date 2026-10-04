// src/features/admin/delete-user-action.ts
"use server";

import { deleteUser } from "@/application/admin/delete-user";
import { mapAdminActionError } from "@/features/admin/map-admin-action-error";
import { revalidatePath } from "next/cache";

export type DeleteUserActionState = {
  error: string;
} | null;

export async function deleteUserAction(
  userId: string,
): Promise<DeleteUserActionState> {
  try {
    await deleteUser(userId);
    revalidatePath("/admin");
    return null;
  } catch (error) {
    return { error: mapAdminActionError(error, "Failed to delete user.") };
  }
}
