// tests/integration/admin/admin-authorization.test.ts
import { describe, expect, it } from "vitest";

import {
  InvalidAdminConfigurationError,
  UnauthorizedAdminAccessError,
} from "@/application/admin/admin-errors";
import {
  isAuthenticatedUserAdminFromHeaders,
  requireAdminAuthorizationFromHeaders,
} from "@/application/admin/admin-authorization";
import { getAuthSessionFromHeaders } from "@/infrastructure/auth/session";

import { prisma, registerUser, uniqueEmail } from "../auth/helpers";
import { createGoogleAccount, signInHeadersWithGoogleAccount } from "./helpers";

describe("requireAdminAuthorization", () => {
  it("rejects unauthenticated access", async () => {
    const headers = new Headers();

    await expect(requireAdminAuthorizationFromHeaders(headers)).rejects.toThrow(
      UnauthorizedAdminAccessError,
    );
  });

  it("rejects authenticated normal user without matching email", async () => {
    const email = uniqueEmail("normal-user");
    await registerUser({ email });
    const headers = await signInHeadersWithGoogleAccount({ email });

    const session = await getAuthSessionFromHeaders(headers);
    expect(session).toBeTruthy();

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    process.env.ADMIN_GOOGLE_EMAIL = "admin@example.com";

    try {
      await expect(
        requireAdminAuthorizationFromHeaders(headers),
      ).rejects.toThrow(UnauthorizedAdminAccessError);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });

  it("rejects authenticated user with matching email but non-Google identity", async () => {
    const adminEmail = "admin@example.com";
    const { userId } = await registerUser({ email: adminEmail });

    const emailAccount = await prisma.account.findFirst({
      where: { userId, providerId: "credential" },
    });
    expect(emailAccount).toBeTruthy();

    const headers = await signInHeadersWithGoogleAccount({ email: adminEmail });

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    process.env.ADMIN_GOOGLE_EMAIL = adminEmail;

    try {
      await expect(
        requireAdminAuthorizationFromHeaders(headers),
      ).rejects.toThrow(UnauthorizedAdminAccessError);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });

  it("accepts configured Google Admin", async () => {
    const adminEmail = "admin@example.com";
    const { userId } = await registerUser({ email: adminEmail });
    await createGoogleAccount(userId);

    const headers = await signInHeadersWithGoogleAccount({
      email: adminEmail,
    });
    const session = await getAuthSessionFromHeaders(headers);
    expect(session).toBeTruthy();

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    process.env.ADMIN_GOOGLE_EMAIL = adminEmail;

    try {
      const result = await requireAdminAuthorizationFromHeaders(headers);
      expect(result.userId).toBe(userId);
      expect(result.email).toBe(adminEmail);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });

  it("rejects when ADMIN_GOOGLE_EMAIL is missing", async () => {
    const adminEmail = "admin@example.com";
    const { userId } = await registerUser({ email: adminEmail });
    await createGoogleAccount(userId);

    const headers = await signInHeadersWithGoogleAccount({
      email: adminEmail,
    });

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    delete process.env.ADMIN_GOOGLE_EMAIL;

    try {
      await expect(
        requireAdminAuthorizationFromHeaders(headers),
      ).rejects.toThrow(InvalidAdminConfigurationError);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });

  it("normalizes email consistently (case insensitive)", async () => {
    const adminEmail = "Admin@Example.COM";
    const normalizedEmail = "admin@example.com";

    const { userId } = await registerUser({ email: normalizedEmail });
    await createGoogleAccount(userId);

    const headers = await signInHeadersWithGoogleAccount({
      email: normalizedEmail,
    });
    const session = await getAuthSessionFromHeaders(headers);
    expect(session).toBeTruthy();

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    process.env.ADMIN_GOOGLE_EMAIL = adminEmail;

    try {
      const result = await requireAdminAuthorizationFromHeaders(headers);
      expect(result.userId).toBe(userId);
      expect(result.email).toBe(normalizedEmail);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });

  it("normalizes email consistently (whitespace)", async () => {
    const adminEmail = "  admin@example.com  ";
    const normalizedEmail = "admin@example.com";

    const { userId } = await registerUser({ email: normalizedEmail });
    await createGoogleAccount(userId);

    const headers = await signInHeadersWithGoogleAccount({
      email: normalizedEmail,
    });
    const session = await getAuthSessionFromHeaders(headers);
    expect(session).toBeTruthy();

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    process.env.ADMIN_GOOGLE_EMAIL = adminEmail;

    try {
      const result = await requireAdminAuthorizationFromHeaders(headers);
      expect(result.userId).toBe(userId);
      expect(result.email).toBe(normalizedEmail);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });
});

describe("isAuthenticatedUserAdmin", () => {
  it("returns false for unauthenticated users", async () => {
    const headers = new Headers();

    expect(await isAuthenticatedUserAdminFromHeaders(headers)).toBe(false);
  });

  it("returns false for normal user without matching email", async () => {
    const email = uniqueEmail("normal-user");
    await registerUser({ email });
    const headers = await signInHeadersWithGoogleAccount({ email });

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    process.env.ADMIN_GOOGLE_EMAIL = "other@example.com";

    try {
      expect(await isAuthenticatedUserAdminFromHeaders(headers)).toBe(false);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });

  it("returns false for user with matching email but non-Google identity", async () => {
    const adminEmail = "admin@example.com";
    const { userId } = await registerUser({ email: adminEmail });

    const emailAccount = await prisma.account.findFirst({
      where: { userId, providerId: "credential" },
    });
    expect(emailAccount).toBeTruthy();

    const headers = await signInHeadersWithGoogleAccount({ email: adminEmail });

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    process.env.ADMIN_GOOGLE_EMAIL = adminEmail;

    try {
      expect(await isAuthenticatedUserAdminFromHeaders(headers)).toBe(false);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });

  it("returns true for configured Google Admin", async () => {
    const adminEmail = "admin@example.com";
    const { userId } = await registerUser({ email: adminEmail });
    await createGoogleAccount(userId);

    const headers = await signInHeadersWithGoogleAccount({
      email: adminEmail,
    });

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    process.env.ADMIN_GOOGLE_EMAIL = adminEmail;

    try {
      expect(await isAuthenticatedUserAdminFromHeaders(headers)).toBe(true);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });

  it("returns false when ADMIN_GOOGLE_EMAIL is missing", async () => {
    const headers = new Headers();

    const originalEnv = process.env.ADMIN_GOOGLE_EMAIL;
    delete process.env.ADMIN_GOOGLE_EMAIL;

    try {
      expect(await isAuthenticatedUserAdminFromHeaders(headers)).toBe(false);
    } finally {
      process.env.ADMIN_GOOGLE_EMAIL = originalEnv;
    }
  });
});
