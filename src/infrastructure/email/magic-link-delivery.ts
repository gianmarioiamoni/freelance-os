// src/infrastructure/email/magic-link-delivery.ts
import "server-only";

import { resolveAuthEmailDeliveryMode } from "@/infrastructure/email/auth-email-delivery-mode";
import {
  captureMagicLinkEmail,
  type CapturedMagicLinkEmail,
} from "@/infrastructure/email/magic-link-capture";
import {
  PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE,
  deliverProductionMagicLinkEmail,
} from "@/infrastructure/email/resend-magic-link";

export type MagicLinkEmailPayload = {
  email: string;
  url: string;
  token: string;
  metadata?: Record<string, unknown>;
};

const DEVELOPMENT_DELIVERY_MESSAGE =
  "Magic link email accepted by the development delivery adapter. No email is sent.";

function toCapturedMessage(data: MagicLinkEmailPayload): CapturedMagicLinkEmail {
  return {
    recipientEmail: data.email,
    url: data.url,
    token: data.token,
    metadata: data.metadata,
  };
}

export async function sendMagicLinkEmail(
  data: MagicLinkEmailPayload,
): Promise<void> {
  const mode = resolveAuthEmailDeliveryMode();
  const message = toCapturedMessage(data);

  if (mode === "test") {
    captureMagicLinkEmail(message);
    return;
  }

  if (mode === "production") {
    await deliverProductionMagicLinkEmail(data);
    return;
  }

  console.info(DEVELOPMENT_DELIVERY_MESSAGE);
}

export const MAGIC_LINK_DELIVERY_LOG_MESSAGES = {
  development: DEVELOPMENT_DELIVERY_MESSAGE,
  production: PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE,
} as const;
