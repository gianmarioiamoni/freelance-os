// src/infrastructure/email/resend-password-reset.ts
import "server-only";

import { Resend } from "resend";

type PasswordResetEmailUser = {
  id: string;
  email: string;
};

type PasswordResetEmailPayload = {
  user: PasswordResetEmailUser;
  url: string;
  token: string;
};

export const PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE =
  "Password reset email was not delivered: Resend is not configured.";

export const PRODUCTION_EMAIL_SENT_MESSAGE =
  "Password reset email was accepted by Resend.";

export const PRODUCTION_EMAIL_FAILED_MESSAGE =
  "Password reset email was not delivered: Resend request failed.";

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

function passwordResetText(url: string): string {
  return [
    "Use the following link to reset your password.",
    "The link expires in one hour.",
    "",
    url,
  ].join("\n");
}

export async function deliverProductionPasswordResetEmail(
  data: PasswordResetEmailPayload,
  env: Record<string, string | undefined> = process.env,
  send?: SendTransactionalEmail,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);

  if (!config) {
    console.warn(PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE);
    return "skipped";
  }

  try {
    const input: TransactionalEmailInput = {
      from: config.from,
      to: data.user.email,
      subject: "Reset your FreelanceOS password",
      text: passwordResetText(data.url),
    };

    await (send ? send(input) : sendViaResend(input, config));
    console.info(PRODUCTION_EMAIL_SENT_MESSAGE);
    return "sent";
  } catch {
    console.warn(PRODUCTION_EMAIL_FAILED_MESSAGE);
    return "skipped";
  }
}
