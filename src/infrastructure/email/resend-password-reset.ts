// src/infrastructure/email/resend-password-reset.ts
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
  "Password reset email was not delivered: Resend is not configured (RESEND_API_KEY and AUTH_EMAIL_FROM).";

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
  apiKey: string,
) => Promise<void>;

export function getResendProductionConfig(
  env: Record<string, string | undefined> = process.env,
): { apiKey: string; from: string } | undefined {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const from = env.AUTH_EMAIL_FROM?.trim() ?? "";

  if (!apiKey || !from) {
    return undefined;
  }

  return { apiKey, from };
}

export async function sendViaResend(
  input: TransactionalEmailInput,
  apiKey: string,
): Promise<void> {
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: input.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  if (result.error) {
    throw new Error(PRODUCTION_EMAIL_FAILED_MESSAGE);
  }
}

export async function deliverProductionPasswordResetEmail(
  data: PasswordResetEmailPayload,
  env: Record<string, string | undefined> = process.env,
  send: SendTransactionalEmail = sendViaResend,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);

  if (!config) {
    console.warn(PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE);
    return "skipped";
  }

  try {
    await send(
      {
        from: config.from,
        to: data.user.email,
        subject: "Reset your FreelanceOS password",
        text: [
          "Use the following link to reset your password.",
          "The link expires in one hour.",
          "",
          data.url,
        ].join("\n"),
      },
      config.apiKey,
    );
    console.info(PRODUCTION_EMAIL_SENT_MESSAGE);
    return "sent";
  } catch {
    console.warn(PRODUCTION_EMAIL_FAILED_MESSAGE);
    return "skipped";
  }
}
