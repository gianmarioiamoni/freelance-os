// src/infrastructure/email/password-reset-delivery.ts
import "server-only";

import { resolveAuthEmailDeliveryMode } from "@/infrastructure/email/auth-email-delivery-mode";
import {
  capturePasswordResetEmail,
  type CapturedPasswordResetEmail,
} from "@/infrastructure/email/password-reset-capture";
import {
  PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE,
  deliverProductionPasswordResetEmail,
} from "@/infrastructure/email/resend-password-reset";

export type PasswordResetEmailUser = {
  id: string;
  email: string;
};

export type PasswordResetEmailPayload = {
  user: PasswordResetEmailUser;
  url: string;
  token: string;
};

const DEVELOPMENT_DELIVERY_MESSAGE =
  "Password reset email accepted by the development delivery adapter. No email is sent.";

function toCapturedMessage(
  data: PasswordResetEmailPayload,
): CapturedPasswordResetEmail {
  return {
    recipientEmail: data.user.email,
    userId: data.user.id,
    url: data.url,
    token: data.token,
  };
}

export async function sendPasswordResetEmail(
  data: PasswordResetEmailPayload,
): Promise<void> {
  const mode = resolveAuthEmailDeliveryMode();
  const message = toCapturedMessage(data);

  if (mode === "test") {
    capturePasswordResetEmail(message);
    return;
  }

  if (mode === "production") {
    await deliverProductionPasswordResetEmail(data);
    return;
  }

  console.info(DEVELOPMENT_DELIVERY_MESSAGE);
}

export const PASSWORD_RESET_DELIVERY_LOG_MESSAGES = {
  development: DEVELOPMENT_DELIVERY_MESSAGE,
  production: PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE,
} as const;
