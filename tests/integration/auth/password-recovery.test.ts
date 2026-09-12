// tests/integration/auth/password-recovery.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthSessionFromHeaders } from "@/infrastructure/auth/session";
import {
  clearCapturedPasswordResetEmails,
  getCapturedPasswordResetEmails,
} from "@/infrastructure/email/password-reset-capture";

import {
  TEST_PASSWORD,
  auth,
  countSessionsForUser,
  prisma,
  registerUser,
  signInHeaders,
  uniqueEmail,
} from "./helpers";

const NEW_PASSWORD = "NewValidPass1!";
const UNKNOWN_RECOVERY_MESSAGE =
  "If this email exists in our system, check your email for the reset link";

async function requestPasswordReset(email: string) {
  return auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: "/reset-password",
    },
  });
}

async function findResetVerification(userId: string) {
  return prisma.verification.findFirst({
    where: {
      value: userId,
      identifier: { startsWith: "reset-password:" },
    },
    orderBy: { createdAt: "desc" },
  });
}

function tokenFromIdentifier(identifier: string): string {
  return identifier.slice("reset-password:".length);
}

describe("password recovery", () => {
  afterEach(() => {
    clearCapturedPasswordResetEmails();
    vi.restoreAllMocks();
  });

  it("returns the same response for known and unknown emails", async () => {
    const email = uniqueEmail("recovery-known");
    await registerUser({ email });

    const known = await requestPasswordReset(email);
    const unknown = await requestPasswordReset(uniqueEmail("recovery-unknown"));

    expect(known).toEqual(unknown);
    expect(known).toMatchObject({
      status: true,
      message: UNKNOWN_RECOVERY_MESSAGE,
    });
  });

  it("creates a verification record and invokes the email boundary for a known user", async () => {
    const email = uniqueEmail("recovery-deliver");
    const { userId } = await registerUser({ email });

    await requestPasswordReset(email);

    const verification = await findResetVerification(userId);
    const captured = getCapturedPasswordResetEmails();

    expect(verification).toBeTruthy();
    expect(verification?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(captured).toHaveLength(1);
    expect(captured[0]?.userId).toBe(userId);
    expect(captured[0]?.recipientEmail).toBe(email);
    expect(captured[0]?.token).toBe(
      tokenFromIdentifier(verification?.identifier ?? ""),
    );
    expect(captured[0]?.url).toContain("/reset-password/");
    expect(captured[0]?.url).not.toContain(TEST_PASSWORD);
  });

  it("does not create a recovery record or capture email for an unknown address", async () => {
    await requestPasswordReset(uniqueEmail("recovery-missing"));

    expect(await prisma.verification.count()).toBe(0);
    expect(getCapturedPasswordResetEmails()).toEqual([]);
  });

  it("replaces the password with a valid token and rejects the old password", async () => {
    const email = uniqueEmail("recovery-reset");
    const { userId } = await registerUser({ email });

    await requestPasswordReset(email);
    const captured = getCapturedPasswordResetEmails()[0];
    expect(captured?.token).toBeTruthy();

    const result = await auth.api.resetPassword({
      body: {
        newPassword: NEW_PASSWORD,
        token: captured?.token ?? "",
      },
    });

    expect(result).toEqual({ status: true });

    const account = await prisma.account.findFirst({
      where: { userId, providerId: "credential" },
    });
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toBe(NEW_PASSWORD);
    expect(account?.password?.includes(NEW_PASSWORD)).toBe(false);
    expect(account?.password?.includes(TEST_PASSWORD)).toBe(false);

    await expect(
      auth.api.signInEmail({
        body: { email, password: TEST_PASSWORD },
      }),
    ).rejects.toBeDefined();

    const signedIn = await auth.api.signInEmail({
      body: { email, password: NEW_PASSWORD },
    });
    expect(signedIn.user.id).toBe(userId);
  });

  it("rejects invalid, malformed, expired, and reused tokens", async () => {
    const email = uniqueEmail("recovery-tokens");
    const { userId } = await registerUser({ email });

    await expect(
      auth.api.resetPassword({
        body: { newPassword: NEW_PASSWORD, token: "not-a-real-token" },
      }),
    ).rejects.toBeDefined();

    await expect(
      auth.api.resetPassword({
        body: { newPassword: NEW_PASSWORD, token: "" },
      }),
    ).rejects.toBeDefined();

    await requestPasswordReset(email);
    const expiredVerification = await findResetVerification(userId);
    expect(expiredVerification).toBeTruthy();

    await prisma.verification.update({
      where: { id: expiredVerification?.id ?? "" },
      data: { expiresAt: new Date(0) },
    });

    await expect(
      auth.api.resetPassword({
        body: {
          newPassword: NEW_PASSWORD,
          token: tokenFromIdentifier(expiredVerification?.identifier ?? ""),
        },
      }),
    ).rejects.toBeDefined();

    await requestPasswordReset(email);
    const reusable = getCapturedPasswordResetEmails().at(-1);
    expect(reusable?.token).toBeTruthy();

    await auth.api.resetPassword({
      body: {
        newPassword: NEW_PASSWORD,
        token: reusable?.token ?? "",
      },
    });

    await expect(
      auth.api.resetPassword({
        body: {
          newPassword: "AnotherValid1!",
          token: reusable?.token ?? "",
        },
      }),
    ).rejects.toBeDefined();
  });

  it("revokes existing sessions after a successful password reset", async () => {
    const email = uniqueEmail("recovery-sessions");
    const { userId } = await registerUser({ email });
    const headers = await signInHeaders({ email });

    expect(await countSessionsForUser(userId)).toBeGreaterThan(0);
    expect(await getAuthSessionFromHeaders(headers)).not.toBeNull();

    await requestPasswordReset(email);
    const token = getCapturedPasswordResetEmails()[0]?.token ?? "";

    await auth.api.resetPassword({
      body: { newPassword: NEW_PASSWORD, token },
    });

    expect(await countSessionsForUser(userId)).toBe(0);
    expect(await getAuthSessionFromHeaders(headers)).toBeNull();
  });

  it("does not log reset tokens or passwords during recovery", async () => {
    const records: string[] = [];
    const collect = (...args: unknown[]) => {
      records.push(args.map(String).join(" "));
    };

    vi.spyOn(console, "info").mockImplementation(collect);
    vi.spyOn(console, "warn").mockImplementation(collect);
    vi.spyOn(console, "error").mockImplementation(collect);
    vi.spyOn(console, "log").mockImplementation(collect);

    const email = uniqueEmail("recovery-logs");
    await registerUser({ email });
    await requestPasswordReset(email);

    const captured = getCapturedPasswordResetEmails()[0];
    expect(captured?.token).toBeTruthy();

    await auth.api.resetPassword({
      body: {
        newPassword: NEW_PASSWORD,
        token: captured?.token ?? "",
      },
    });

    const output = records.join("\n");
    expect(output).not.toContain(captured?.token ?? "missing-token");
    expect(output).not.toContain(TEST_PASSWORD);
    expect(output).not.toContain(NEW_PASSWORD);
    expect(output).not.toContain(captured?.url ?? "missing-url");
  });

  it("leaves Google provider configuration unchanged", () => {
    expect(auth.options.socialProviders?.google).toMatchObject({
      clientId: "test-google-client-id",
      clientSecret: "test-google-client-secret",
    });
    expect(auth.options.emailAndPassword.requireEmailVerification).toBe(false);
  });
});
