// src/infrastructure/email/resend-anomaly-status-notification.ts
import "server-only";

import { Resend } from "resend";

export type AnomalyStatusNotificationPayload = {
  viewerEmail: string;
  workspaceName: string;
  workDate: Date;
  engagement: string;
  anomalyMessage: string;
  newStatus: "ACKNOWLEDGED" | "RESOLVED";
  freelanceNotes: string | null;
};

export const ANOMALY_STATUS_EMAIL_UNCONFIGURED_MESSAGE =
  "Anomaly status notification email was not delivered: Resend is not configured.";

export const ANOMALY_STATUS_EMAIL_SENT_MESSAGE =
  "Anomaly status notification email was accepted by Resend.";

export const ANOMALY_STATUS_EMAIL_FAILED_MESSAGE =
  "Anomaly status notification email was not delivered: Resend request failed.";

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

function anomalyStatusNotificationText(
  data: AnomalyStatusNotificationPayload,
): string {
  const workDateStr = data.workDate.toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statusText =
    data.newStatus === "ACKNOWLEDGED"
      ? "è stata presa in carico"
      : "è stata risolta";

  const lines: string[] = [
    `Aggiornamento segnalazione anomalia - ${data.workspaceName}`,
    "",
    `La tua segnalazione anomalia ${statusText} dal Freelancer.`,
    "",
    "DETTAGLI REGISTRAZIONE:",
    `- Data: ${workDateStr}`,
    `- Impegno: ${data.engagement}`,
    "",
    "TUA SEGNALAZIONE:",
    data.anomalyMessage,
  ];

  if (data.freelanceNotes) {
    lines.push(
      "",
      "NOTE DEL FREELANCER:",
      data.freelanceNotes,
    );
  }

  lines.push(
    "",
    "---",
    "FreelanceOS - Timesheet Management",
  );

  return lines.join("\n");
}

export async function deliverAnomalyStatusNotificationEmail(
  data: AnomalyStatusNotificationPayload,
  env: Record<string, string | undefined> = process.env,
  send?: SendTransactionalEmail,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);

  if (!config) {
    console.warn(ANOMALY_STATUS_EMAIL_UNCONFIGURED_MESSAGE);
    return "skipped";
  }

  const statusText =
    data.newStatus === "ACKNOWLEDGED" ? "Presa in carico" : "Risolta";

  try {
    const input: TransactionalEmailInput = {
      from: config.from,
      to: data.viewerEmail,
      subject: `[FreelanceOS] Anomalia ${statusText} - ${data.workspaceName}`,
      text: anomalyStatusNotificationText(data),
    };

    await (send ? send(input) : sendViaResend(input, config));
    console.info(ANOMALY_STATUS_EMAIL_SENT_MESSAGE);
    return "sent";
  } catch (error) {
    console.warn(ANOMALY_STATUS_EMAIL_FAILED_MESSAGE, error);
    return "skipped";
  }
}
