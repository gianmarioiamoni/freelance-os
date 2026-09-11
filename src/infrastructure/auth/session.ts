// src/infrastructure/auth/session.ts
import "server-only";

import { headers } from "next/headers";

import { auth } from "@/infrastructure/auth/auth";

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export async function getAuthSessionFromHeaders(
  requestHeaders: Headers,
): Promise<AuthSession | null> {
  return auth.api.getSession({
    headers: requestHeaders,
  });
}

export async function getServerAuthSession(): Promise<AuthSession | null> {
  return getAuthSessionFromHeaders(await headers());
}
