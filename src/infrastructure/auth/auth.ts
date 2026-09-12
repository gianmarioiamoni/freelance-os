// src/infrastructure/auth/auth.ts
import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getGoogleSocialProvider } from "@/infrastructure/auth/google-provider";
import { prisma } from "@/infrastructure/prisma/client";

const google = getGoogleSocialProvider();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: google
    ? {
        google,
      }
    : {},
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
