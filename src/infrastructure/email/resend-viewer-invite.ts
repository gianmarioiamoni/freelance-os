// src/infrastructure/email/resend-viewer-invite.ts
import "server-only";

import { Resend } from "resend";

export type ViewerInviteEmailPayload = {
  email: string;
  inviteUrl: string;
  workspaceName?: string;
  expiresAt: Date;
};

export const INVITE_EMAIL_UNCONFIGURED_MESSAGE =
  "Viewer invite email was not delivered: Resend is not configured.";

export const INVITE_EMAIL_SENT_MESSAGE =
  "Viewer invite email was accepted by Resend.";

export const INVITE_EMAIL_FAILED_MESSAGE =
  "Viewer invite email was not delivered: Resend request failed.";

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

function viewerInviteText(
  url: string,
  workspaceName: string | undefined,
  expiresAt: Date,
): string {
  const expiryDate = expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return [
    workspaceName
      ? `You've been invited to view timesheets for ${workspaceName}.`
      : "You've been invited to view timesheets.",
    "",
    "Use the following link to activate your access:",
    "",
    url,
    "",
    `This invitation link expires on ${expiryDate}.`,
    "",
    "If you didn't expect this invitation, you can safely ignore this email.",
  ].join("\n");
}

export async function deliverProductionViewerInviteEmail(
  data: ViewerInviteEmailPayload,
  env: Record<string, string | undefined> = process.env,
  send?: SendTransactionalEmail,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);

  if (!config) {
    console.warn(INVITE_EMAIL_UNCONFIGURED_MESSAGE);
    return "skipped";
  }

  try {
    const input: TransactionalEmailInput = {
      from: config.from,
      to: data.email,
      subject: "Timesheet Viewer Invitation",
      text: viewerInviteText(
        data.inviteUrl,
        data.workspaceName,
        data.expiresAt,
      ),
    };

    await (send ? send(input) : sendViaResend(input, config));
    console.info(INVITE_EMAIL_SENT_MESSAGE);
    return "sent";
  } catch (error) {
    console.warn(INVITE_EMAIL_FAILED_MESSAGE, error);
    return "skipped";
  }
}
