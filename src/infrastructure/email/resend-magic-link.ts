// src/infrastructure/email/resend-magic-link.ts
import "server-only";

import { Resend } from "resend";

export type MagicLinkEmailPayload = {
  email: string;
  url: string;
  token: string;
  metadata?: Record<string, unknown>;
};

export const PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE =
  "Magic link email was not delivered: Resend is not configured.";

export const PRODUCTION_EMAIL_SENT_MESSAGE =
  "Magic link email was accepted by Resend.";

export const PRODUCTION_EMAIL_FAILED_MESSAGE =
  "Magic link email was not delivered: Resend request failed.";

export type TransactionalEmailInput = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export type SendTransactionalEmail = (
  input: TransactionalEmailInput,
) => Promise<void>;

export type ResendProductionConfig = {
  apiKey: string;
  from: string;
};

export function getResendProductionConfig(
  env: Record<string, string | undefined> = process.env,
): ResendProductionConfig | undefined {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const from = env.EMAIL_FROM?.trim() ?? "";

  if (!apiKey || !from) {
    return undefined;
  }

  return { apiKey, from };
}

export async function sendViaResend(
  input: TransactionalEmailInput,
  config: ResendProductionConfig,
): Promise<void> {
  const resend = new Resend(config.apiKey);

  await resend.emails.send({
    from: input.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}

function magicLinkText(url: string, isViewerActivation: boolean): string {
  if (isViewerActivation) {
    return [
      "Click the link below to access your timesheet viewer dashboard:",
      "",
      url,
      "",
      "This link expires in 5 minutes and can only be used once.",
      "",
      "If you didn't request this link, you can safely ignore this email.",
    ].join("\n");
  }

  return [
    "Click the link below to sign in to FreelanceOS:",
    "",
    url,
    "",
    "This link expires in 5 minutes and can only be used once.",
    "",
    "If you didn't request this link, you can safely ignore this email.",
  ].join("\n");
}

export async function deliverProductionMagicLinkEmail(
  data: MagicLinkEmailPayload,
  env: Record<string, string | undefined> = process.env,
  send?: SendTransactionalEmail,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);

  if (!config) {
    console.warn(PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE);
    return "skipped";
  }

  try {
    const isViewerActivation = data.metadata?.type === "viewer-activation";
    const input: TransactionalEmailInput = {
      from: config.from,
      to: data.email,
      subject: isViewerActivation
        ? "Access Your Timesheet Dashboard"
        : "Sign in to FreelanceOS",
      text: magicLinkText(data.url, isViewerActivation),
    };

    await (send ? send(input) : sendViaResend(input, config));
    console.info(PRODUCTION_EMAIL_SENT_MESSAGE);
    return "sent";
  } catch (error) {
    console.warn(PRODUCTION_EMAIL_FAILED_MESSAGE, error);
    return "skipped";
  }
}
