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
import {
  notifyAdminNewAccessRequest,
  sendAccessRequestConfirmationEmail,
} from "@/infrastructure/email/access-request-notifications";

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

  // Send confirmation email to user
  await sendAccessRequestConfirmationEmail(request);

  // Notify admin
  const adminEmail = process.env.ADMIN_GOOGLE_EMAIL;
  if (adminEmail) {
    await notifyAdminNewAccessRequest(request, adminEmail);
  }

  return { success: true, request };
}
