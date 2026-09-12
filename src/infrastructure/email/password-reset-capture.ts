// src/infrastructure/email/password-reset-capture.ts
import "server-only";

export type CapturedPasswordResetEmail = {
  recipientEmail: string;
  userId: string;
  url: string;
  token: string;
};

const capturedPasswordResetEmails: CapturedPasswordResetEmail[] = [];

export function capturePasswordResetEmail(
  message: CapturedPasswordResetEmail,
): void {
  capturedPasswordResetEmails.push(message);
}

export function getCapturedPasswordResetEmails(): readonly CapturedPasswordResetEmail[] {
  return capturedPasswordResetEmails;
}

export function clearCapturedPasswordResetEmails(): void {
  capturedPasswordResetEmails.length = 0;
}
