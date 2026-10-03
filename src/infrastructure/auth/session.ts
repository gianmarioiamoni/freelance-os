// src/infrastructure/auth/session.ts
import "server-only";

import { headers } from "next/headers";

import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/prisma/client";

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

async function validateUserLifecycleState(
  session: AuthSession | null,
): Promise<AuthSession | null> {
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disabledAt: true, deletedAt: true },
  });

  if (!user || user.disabledAt || user.deletedAt) {
    return null;
  }

  return session;
}

export async function getAuthSessionFromHeaders(
  requestHeaders: Headers,
): Promise<AuthSession | null> {
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  return validateUserLifecycleState(session);
}

export async function getServerAuthSession(): Promise<AuthSession | null> {
  return getAuthSessionFromHeaders(await headers());
}
