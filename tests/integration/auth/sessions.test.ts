// tests/integration/auth/sessions.test.ts
import { describe, expect, it } from "vitest";

import { getAuthSessionFromHeaders } from "@/infrastructure/auth/session";

import {
  auth,
  prisma,
  registerUser,
  signInHeaders,
  uniqueEmail,
} from "./helpers";

describe("Better Auth sessions", () => {
  it("retrieves the authenticated user from the server session", async () => {
    const email = uniqueEmail("session");
    const { userId } = await registerUser({ email });
    const headers = await signInHeaders({ email });

    const session = await getAuthSessionFromHeaders(headers);

    expect(session?.user.id).toBe(userId);
    expect(session?.user.email).toBe(email);
  });

  it("invalidates the session on sign-out", async () => {
    const email = uniqueEmail("signout");
    await registerUser({ email });
    const headers = await signInHeaders({ email });
    const authenticated = await getAuthSessionFromHeaders(headers);
    const token = authenticated?.session.token;

    expect(token).toBeTruthy();

    await auth.api.signOut({ headers });

    expect(await getAuthSessionFromHeaders(headers)).toBeNull();
    expect(
      await prisma.session.findUnique({
        where: { token: token ?? "" },
      }),
    ).toBeNull();
  });

  it("treats an expired session as unauthenticated", async () => {
    const email = uniqueEmail("expired");
    const { userId } = await registerUser({ email });
    const headers = await signInHeaders({ email });

    await prisma.session.updateMany({
      where: { userId },
      data: { expiresAt: new Date(0) },
    });

    expect(await getAuthSessionFromHeaders(headers)).toBeNull();
  });

  it("treats a missing session as unauthenticated", async () => {
    expect(await getAuthSessionFromHeaders(new Headers())).toBeNull();
  });
});
