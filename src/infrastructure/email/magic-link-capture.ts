// src/infrastructure/email/magic-link-capture.ts
import "server-only";

export type CapturedMagicLinkEmail = {
  recipientEmail: string;
  url: string;
  token: string;
  metadata?: Record<string, unknown>;
};

const captured: CapturedMagicLinkEmail[] = [];

export function captureMagicLinkEmail(email: CapturedMagicLinkEmail): void {
  captured.push(email);
}

export function getCapturedMagicLinkEmails(): CapturedMagicLinkEmail[] {
  return [...captured];
}

export function clearCapturedMagicLinkEmails(): void {
  captured.length = 0;
}
