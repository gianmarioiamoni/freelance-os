// tests/integration/admin/helpers.ts
import { setCookieToHeader } from "better-auth/cookies";

import { auth, prisma } from "../auth/helpers";

export async function createGoogleAccount(userId: string): Promise<void> {
  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: `google-${userId}`,
      providerId: "google",
      userId,
      accessToken: "mock-access-token",
      idToken: "mock-id-token",
      scope: "openid email profile",
    },
  });
}

export async function signInHeadersWithGoogleAccount(input: {
  email: string;
  password?: string;
}): Promise<Headers> {
  const headers = new Headers();
  const response = await auth.api.signInEmail({
    body: {
      email: input.email,
      password: input.password ?? "ValidPass1!",
    },
    asResponse: true,
  });

  setCookieToHeader(headers)({ response });
  return headers;
}
