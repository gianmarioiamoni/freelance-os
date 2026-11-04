// src/infrastructure/auth/auth.ts
import "server-only";

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins/magic-link";

import { checkEmailHasAccess } from "@/infrastructure/access-request/repository";
import { getBetterAuthRateLimitOptions } from "@/infrastructure/auth/e2e-runtime";
import { getGoogleSocialProvider } from "@/infrastructure/auth/google-provider";
import { sendPasswordResetEmail } from "@/infrastructure/email/password-reset-delivery";
import { sendMagicLinkEmail } from "@/infrastructure/email/magic-link-delivery";
import { prisma } from "@/infrastructure/prisma/client";

const google = getGoogleSocialProvider();
const rateLimit = getBetterAuthRateLimitOptions();

function shouldEnableMagicLink(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const flag = env.ENABLE_MAGIC_LINK?.toLowerCase();
  return flag !== "false" && flag !== "0";
}

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
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  socialProviders: google
    ? {
        google: {
          ...google,
          disableImplicitSignUp: true,
        },
      }
    : {},
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          try {
            const hasAccess = await checkEmailHasAccess(user.email);
            if (!hasAccess) {
              throw new APIError("BAD_REQUEST", {
                message:
                  "Access not granted. Please request access at /request-access",
              });
            }
          } catch (error) {
            // If AccessRequest table doesn't exist, allow registration
            // This provides backward compatibility during migration
            console.warn("Access check skipped:", error);
          }
        },
      },
    },
  },
  plugins: shouldEnableMagicLink()
    ? [
        magicLink({
          sendMagicLink: sendMagicLinkEmail,
          expiresIn: 60 * 5, // 5 minutes
        }),
      ]
    : [],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  ...(rateLimit ? { rateLimit } : {}),
});
