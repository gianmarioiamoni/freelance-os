// tests/integration/auth/helpers.ts
import { setCookieToHeader } from "better-auth/cookies";

import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/prisma/client";

export { auth, prisma };

export const TEST_PASSWORD = "ValidPass1!";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}@example.com`;
}

export async function registerUser(input: {
  email: string;
  password?: string;
  name?: string;
}): Promise<{ userId: string }> {
  const result = await auth.api.signUpEmail({
    body: {
      email: input.email,
      password: input.password ?? TEST_PASSWORD,
      name: input.name ?? "Phase 2 User",
    },
  });

  return { userId: result.user.id };
}

export async function signInHeaders(input: {
  email: string;
  password?: string;
}): Promise<Headers> {
  const headers = new Headers();
  const response = await auth.api.signInEmail({
    body: {
      email: input.email,
      password: input.password ?? TEST_PASSWORD,
    },
    asResponse: true,
  });

  setCookieToHeader(headers)({ response });
  return headers;
}

export async function countSessionsForUser(userId: string): Promise<number> {
  return prisma.session.count({
    where: { userId },
  });
}
