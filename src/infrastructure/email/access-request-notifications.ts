// src/infrastructure/email/access-request-notifications.ts
import "server-only";

import type { AccessRequestRecord } from "@/domain/access-request/types";
import {
  getResendProductionConfig,
  sendViaResend,
  type SendTransactionalEmail,
  type TransactionalEmailInput,
} from "@/infrastructure/email/resend-password-reset";

export async function sendAccessRequestConfirmationEmail(
  request: AccessRequestRecord,
  env: Record<string, string | undefined> = process.env,
  send?: SendTransactionalEmail,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);

  if (!config) {
    console.warn("Access request confirmation email: Resend not configured");
    return "skipped";
  }

  try {
    const input: TransactionalEmailInput = {
      from: config.from,
      to: request.email,
      subject: "FreelanceOS Access Request Received",
      text: [
        "Your access request for FreelanceOS has been received.",
        "",
        "An administrator will review your request shortly.",
        "You will receive an email with further instructions once your request is reviewed.",
        "",
        "Email: " + request.email,
      ].join("\n"),
    };

    await (send ? send(input) : sendViaResend(input, config));
    console.info("Access request confirmation email sent");
    return "sent";
  } catch (error) {
    console.warn("Failed to send access request confirmation email:", error);
    return "skipped";
  }
}

export async function sendAccessApprovedEmail(
  request: AccessRequestRecord,
  env: Record<string, string | undefined> = process.env,
  send?: SendTransactionalEmail,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);
  const baseUrl = env.BETTER_AUTH_URL ?? "http://localhost:3000";

  if (!config) {
    console.warn("Access approved email: Resend not configured");
    return "skipped";
  }

  try {
    const signUpUrl = `${baseUrl}/sign-up?token=${request.token}`;

    const input: TransactionalEmailInput = {
      from: config.from,
      to: request.email,
      subject: "FreelanceOS Access Approved",
      text: [
        "Great news! Your access request for FreelanceOS has been approved.",
        "",
        "Click the link below to complete your registration:",
        signUpUrl,
        "",
        "This link will expire in 7 days.",
        "",
        "Welcome to FreelanceOS!",
      ].join("\n"),
    };

    await (send ? send(input) : sendViaResend(input, config));
    console.info("Access approved email sent");
    return "sent";
  } catch (error) {
    console.warn("Failed to send access approved email:", error);
    return "skipped";
  }
}

export async function sendAccessRejectedEmail(
  request: AccessRequestRecord,
  env: Record<string, string | undefined> = process.env,
  send?: SendTransactionalEmail,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);

  if (!config) {
    console.warn("Access rejected email: Resend not configured");
    return "skipped";
  }

  try {
    const input: TransactionalEmailInput = {
      from: config.from,
      to: request.email,
      subject: "FreelanceOS Access Request Update",
      text: [
        "Your access request for FreelanceOS could not be approved at this time.",
        "",
        request.rejectionReason
          ? "Reason: " + request.rejectionReason
          : "Please contact the administrator for more information.",
        "",
        "Thank you for your interest in FreelanceOS.",
      ].join("\n"),
    };

    await (send ? send(input) : sendViaResend(input, config));
    console.info("Access rejected email sent");
    return "sent";
  } catch (error) {
    console.warn("Failed to send access rejected email:", error);
    return "skipped";
  }
}

export async function notifyAdminNewAccessRequest(
  request: AccessRequestRecord,
  adminEmail: string,
  env: Record<string, string | undefined> = process.env,
  send?: SendTransactionalEmail,
): Promise<"sent" | "skipped"> {
  const config = getResendProductionConfig(env);
  const baseUrl = env.BETTER_AUTH_URL ?? "http://localhost:3000";

  if (!config) {
    console.warn("Admin notification email: Resend not configured");
    return "skipped";
  }

  try {
    const adminUrl = `${baseUrl}/admin`;

    const input: TransactionalEmailInput = {
      from: config.from,
      to: adminEmail,
      subject: "New FreelanceOS Access Request",
      text: [
        "A new access request has been submitted:",
        "",
        "Email: " + request.email,
        "Requested: " + request.requestedAt.toLocaleString(),
        "",
        "Review and approve/reject at:",
        adminUrl,
      ].join("\n"),
    };

    await (send ? send(input) : sendViaResend(input, config));
    console.info("Admin notification email sent");
    return "sent";
  } catch (error) {
    console.warn("Failed to send admin notification email:", error);
    return "skipped";
  }
}
