// src/infrastructure/email/auth-email-delivery-mode.ts
export const AUTH_EMAIL_DELIVERY_MODES = [
  "development",
  "test",
  "production",
] as const;

export type AuthEmailDeliveryMode = (typeof AUTH_EMAIL_DELIVERY_MODES)[number];

export function resolveAuthEmailDeliveryMode(
  env: Record<string, string | undefined> = process.env,
): AuthEmailDeliveryMode {
  const configured = env.AUTH_EMAIL_DELIVERY?.trim();

  if (
    configured === "development" ||
    configured === "test" ||
    configured === "production"
  ) {
    return configured;
  }

  if (env.NODE_ENV === "test") {
    return "test";
  }

  if (env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}
