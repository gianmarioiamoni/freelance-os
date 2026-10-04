// src/features/admin/get-delete-impact-action.ts
"use server";

import {
  analyzeUserDeleteImpact,
  type DeleteImpactAnalysis,
} from "@/application/admin/analyze-user-delete-impact";
import { mapAdminActionError } from "@/features/admin/map-admin-action-error";

export type GetDeleteImpactState = {
  analysis: DeleteImpactAnalysis | null;
  error: string | null;
};

export async function getDeleteImpactAction(
  userId: string,
): Promise<GetDeleteImpactState> {
  try {
    const analysis = await analyzeUserDeleteImpact(userId);
    return { analysis, error: null };
  } catch (error) {
    return {
      analysis: null,
      error: mapAdminActionError(error, "Failed to analyze delete impact."),
    };
  }
}
