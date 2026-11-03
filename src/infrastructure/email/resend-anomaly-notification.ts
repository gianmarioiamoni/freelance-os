// src/infrastructure/email/resend-anomaly-notification.ts
import "server-only";

import { Resend } from "resend";

export type AnomalyNotificationPayload = {
  freelancerEmail: string;
  workspaceName: string;
  viewerEmail: string;
  workDate: Date;
  engagement: string;
  timeEntryDescription: string | null;
  anomalyMessage: string;
};

export const ANOMALY_EMAIL_UNCONFIGURED_MESSAGE =
  "Anomaly notification email was not delivered: Resend is not configured.";

export const ANOMALY_EMAIL_SENT_MESSAGE =
  "Anomaly notification email was accepted by Resend.";

export const ANOMALY_EMAIL_FAILED_MESSAGE =
  "Anomaly notification email was not delivered: Resend request failed.";

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

function anomalyNotificationText(data: AnomalyNotificationPayload): string {
  const workDateStr = data.workDate.toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines: string[] = [
    `Nuova segnalazione anomalia - ${data.workspaceName}`,
    "",
    `Il Viewer ${data.viewerEmail} ha segnalato un'anomalia per una registrazione timesheet.`,
    "",
    "DETTAGLI REGISTRAZIONE:",
    `- Data: ${workDateStr}`,
    `- Impegno: ${data.engagement}`,
  ];

  if (data.timeEntryDescription) {
    lines.push(`- Descrizione: ${data.timeEntryDescription}`);
  }

  lines.push(
    "",
    "ANOMALIA SEGNALATA:",
    data.anomalyMessage,
    "",
    "Accedi alla console di gestione Timesheet Viewer per visualizzare e gestire questa segnalazione.",
    "",
    "---",
    "FreelanceOS - Timesheet Management",
  );

  return lines.join("\n");
}

export async function deliverAnomalyNotificationEmail(
  data: AnomalyNotificationPayload,
  env: Record<string, string | undefined> = process.env,
  send?: SendTransactionalEmail,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);

  if (!config) {
    console.warn(ANOMALY_EMAIL_UNCONFIGURED_MESSAGE);
    return "skipped";
  }

  try {
    const input: TransactionalEmailInput = {
      from: config.from,
      to: data.freelancerEmail,
      subject: `[FreelanceOS] Nuova segnalazione anomalia - ${data.workspaceName}`,
      text: anomalyNotificationText(data),
    };

    await (send ? send(input) : sendViaResend(input, config));
    console.info(ANOMALY_EMAIL_SENT_MESSAGE);
    return "sent";
  } catch (error) {
    console.warn(ANOMALY_EMAIL_FAILED_MESSAGE, error);
    return "skipped";
  }
}
