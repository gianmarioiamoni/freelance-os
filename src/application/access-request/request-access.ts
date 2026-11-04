// src/application/access-request/request-access.ts
import "server-only";

import type {
  AccessRequestRecord,
  CreateAccessRequestInput,
} from "@/domain/access-request/types";
import {
  createAccessRequest,
  findAccessRequestByEmail,
} from "@/infrastructure/access-request/repository";

type RequestAccessResult =
  | { success: true; request: AccessRequestRecord }
  | { success: false; error: string };

export async function requestAccess(
  input: CreateAccessRequestInput,
): Promise<RequestAccessResult> {
  // Check if email already has a request
  const existing = await findAccessRequestByEmail(input.email);

  if (existing) {
    if (existing.status === "PENDING") {
      return {
        success: false,
        error: "A request for this email is already pending review.",
      };
    }
    if (existing.status === "APPROVED") {
      return {
        success: false,
        error: "This email is already approved. Please proceed to sign up.",
      };
    }
    if (existing.status === "REJECTED") {
      return {
        success: false,
        error: "Access request for this email was previously rejected.",
      };
    }
  }

  const request = await createAccessRequest(input);

  // TODO: Send notification to admin
  // TODO: Send confirmation email to user

  return { success: true, request };
}
