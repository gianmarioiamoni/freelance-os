// src/infrastructure/email/smtp-password-reset.ts
import "server-only";

import nodemailer from "nodemailer";

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
  "Password reset email was not delivered: SMTP is not configured.";

export const PRODUCTION_EMAIL_SENT_MESSAGE =
  "Password reset email was accepted by SMTP.";

export const PRODUCTION_EMAIL_FAILED_MESSAGE =
  "Password reset email was not delivered: SMTP request failed.";

export type TransactionalEmailInput = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export type SendTransactionalEmail = (
  input: TransactionalEmailInput,
) => Promise<void>;

export type SmtpProductionConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
};

function parseSmtpPort(value: string): number | undefined {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    return undefined;
  }

  return port;
}

function parseSmtpSecure(value: string): boolean | undefined {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

export function getSmtpProductionConfig(
  env: Record<string, string | undefined> = process.env,
): SmtpProductionConfig | undefined {
  const host = env.SMTP_HOST?.trim() ?? "";
  const port = parseSmtpPort(env.SMTP_PORT?.trim() ?? "");
  const secure = parseSmtpSecure(env.SMTP_SECURE?.trim() ?? "");
  const user = env.SMTP_USER?.trim() ?? "";
  const password = env.SMTP_PASSWORD?.trim() ?? "";

  if (!host || port === undefined || secure === undefined || !user || !password) {
    return undefined;
  }

  return { host, port, secure, user, password };
}

export async function sendViaSmtp(
  input: TransactionalEmailInput,
  config: SmtpProductionConfig,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  await transporter.sendMail({
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
  const config = getSmtpProductionConfig(env);

  if (!config) {
    console.warn(PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE);
    return "skipped";
  }

  try {
    const input: TransactionalEmailInput = {
      from: config.user,
      to: data.user.email,
      subject: "Reset your FreelanceOS password",
      text: passwordResetText(data.url),
    };

    await (send ? send(input) : sendViaSmtp(input, config));
    console.info(PRODUCTION_EMAIL_SENT_MESSAGE);
    return "sent";
  } catch {
    console.warn(PRODUCTION_EMAIL_FAILED_MESSAGE);
    return "skipped";
  }
}
