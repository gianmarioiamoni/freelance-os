// tests/integration/auth/email-password.test.ts
import { describe, expect, it } from "vitest";

import {
  TEST_PASSWORD,
  auth,
  countSessionsForUser,
  prisma,
  registerUser,
  uniqueEmail,
} from "./helpers";

describe("email/password authentication", () => {
  it("registers a user and persists Better Auth records", async () => {
    const email = uniqueEmail("register");
    const { userId } = await registerUser({ email, name: "Ada Lovelace" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const account = await prisma.account.findFirst({ where: { userId } });

    expect(user).toMatchObject({
      id: userId,
      email,
      name: "Ada Lovelace",
    });
    expect(account).toMatchObject({
      userId,
      providerId: "credential",
    });
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toBe(TEST_PASSWORD);
    expect(account?.password?.includes(TEST_PASSWORD)).toBe(false);
  });

  it("rejects duplicate registration", async () => {
    const email = uniqueEmail("duplicate");
    await registerUser({ email });

    await expect(registerUser({ email })).rejects.toMatchObject({
      status: "UNPROCESSABLE_ENTITY",
    });
  });

  it("rejects invalid registration input", async () => {
    await expect(
      auth.api.signUpEmail({
        body: {
          email: uniqueEmail("short-password"),
          password: "short",
          name: "Too Short",
        },
      }),
    ).rejects.toBeDefined();
  });

  it("signs in with valid credentials and creates a session", async () => {
    const email = uniqueEmail("signin");
    const { userId } = await registerUser({ email });

    const result = await auth.api.signInEmail({
      body: {
        email,
        password: TEST_PASSWORD,
      },
    });

    expect(result.user.id).toBe(userId);
    expect(await countSessionsForUser(userId)).toBeGreaterThan(0);
  });

  it("rejects invalid credentials without creating a session", async () => {
    const email = uniqueEmail("invalid-signin");
    const { userId } = await registerUser({ email });
    const sessionCountBefore = await countSessionsForUser(userId);

    await expect(
      auth.api.signInEmail({
        body: {
          email,
          password: "WrongPass1!",
        },
      }),
    ).rejects.toBeDefined();

    expect(await countSessionsForUser(userId)).toBe(sessionCountBefore);
  });
});
