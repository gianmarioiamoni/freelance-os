// src/infrastructure/auth/auth.ts
import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins/magic-link";

import { getBetterAuthRateLimitOptions } from "@/infrastructure/auth/e2e-runtime";
import { getGoogleSocialProvider } from "@/infrastructure/auth/google-provider";
import { sendPasswordResetEmail } from "@/infrastructure/email/password-reset-delivery";
import { sendMagicLinkEmail } from "@/infrastructure/email/magic-link-delivery";
import { prisma } from "@/infrastructure/prisma/client";

const google = getGoogleSocialProvider();
const rateLimit = getBetterAuthRateLimitOptions();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: sendPasswordResetEmail,
    revokeSessionsOnPasswordReset: true,
  },
  socialProviders: google
    ? {
        google,
      }
    : {},
  plugins: [
    magicLink({
      sendMagicLink: sendMagicLinkEmail,
      expiresIn: 60 * 5, // 5 minutes
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  ...(rateLimit ? { rateLimit } : {}),
});
