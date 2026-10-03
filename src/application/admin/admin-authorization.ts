// src/application/admin/admin-authorization.ts
import "server-only";

import type { AuthSession } from "@/infrastructure/auth/session";
import {
  getAuthSessionFromHeaders,
  getServerAuthSession,
} from "@/infrastructure/auth/session";
import { prisma } from "@/infrastructure/prisma/client";

import {
  InvalidAdminConfigurationError,
  UnauthorizedAdminAccessError,
} from "./admin-errors";

export type AdminAuthorizationResult = {
  userId: string;
  email: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getConfiguredAdminEmail(
  env: Record<string, string | undefined> = process.env,
): string {
  const adminEmail = env.ADMIN_GOOGLE_EMAIL?.trim();

  if (!adminEmail) {
    throw new InvalidAdminConfigurationError();
  }

  return normalizeEmail(adminEmail);
}

async function verifyGoogleIdentity(
  userId: string,
  email: string,
): Promise<void> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "google",
    },
  });

  if (!account) {
    throw new UnauthorizedAdminAccessError();
  }

  const accountEmail = normalizeEmail(email);
  const configuredEmail = getConfiguredAdminEmail();

  if (accountEmail !== configuredEmail) {
    throw new UnauthorizedAdminAccessError();
  }
}

function validateAuthenticatedSession(
  session: AuthSession | null,
): AuthSession {
  if (!session) {
    throw new UnauthorizedAdminAccessError();
  }
  return session;
}

async function requireAdminAuthorizationFromSession(
  session: AuthSession | null,
): Promise<AdminAuthorizationResult> {
  const validatedSession = validateAuthenticatedSession(session);

  await verifyGoogleIdentity(validatedSession.user.id, validatedSession.user.email);

  return {
    userId: validatedSession.user.id,
    email: validatedSession.user.email,
  };
}

export async function requireAdminAuthorizationFromHeaders(
  headers: Headers,
): Promise<AdminAuthorizationResult> {
  const session = await getAuthSessionFromHeaders(headers);
  return requireAdminAuthorizationFromSession(session);
}

export async function requireAdminAuthorization(): Promise<AdminAuthorizationResult> {
  const session = await getServerAuthSession();
  return requireAdminAuthorizationFromSession(session);
}

async function isSessionAdmin(session: AuthSession | null): Promise<boolean> {
  try {
    if (!session) {
      return false;
    }

    const configuredEmail = getConfiguredAdminEmail();
    const userEmail = normalizeEmail(session.user.email);

    if (userEmail !== configuredEmail) {
      return false;
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "google",
      },
    });

    return account !== null;
  } catch {
    return false;
  }
}

export async function isAuthenticatedUserAdmin(): Promise<boolean> {
  const session = await getServerAuthSession();
  return isSessionAdmin(session);
}

export async function isAuthenticatedUserAdminFromHeaders(
  headers: Headers,
): Promise<boolean> {
  const session = await getAuthSessionFromHeaders(headers);
  return isSessionAdmin(session);
}
