// tests/integration/auth/google-oauth.test.ts
import { describe, expect, it } from "vitest";

import { getGoogleOAuthRedirectURL } from "@/infrastructure/auth/google-provider";

import {
  TEST_PASSWORD,
  auth,
  prisma,
  registerUser,
  signInHeaders,
  uniqueEmail,
} from "./helpers";

const GOOGLE_AUTHORIZE_ORIGIN = "https://accounts.google.com";

describe("Google OAuth authentication", () => {
  it("configures the Google provider on the Better Auth instance", () => {
    expect(auth.options.socialProviders?.google).toMatchObject({
      clientId: "test-google-client-id",
      clientSecret: "test-google-client-secret",
    });
  });

  it("starts Google authorization through Better Auth without calling Google", async () => {
    const result = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL: "/dashboard",
        disableRedirect: true,
      },
    });

    expect(result.redirect).toBe(false);
    expect(result.url).toEqual(expect.stringContaining(GOOGLE_AUTHORIZE_ORIGIN));
    expect(result.url).toEqual(
      expect.stringContaining("client_id=test-google-client-id"),
    );
    expect(result.url).toEqual(
      expect.stringContaining(
        encodeURIComponent(
          getGoogleOAuthRedirectURL(
            process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
          ),
        ),
      ),
    );
    expect(result.url).not.toContain("client_secret");
    expect(result.url).not.toContain("test-google-client-secret");
  });

  it("routes the Google callback through Better Auth", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/callback/google"),
    );

    expect(response.status).not.toBe(404);
  });

  it("keeps email/password authentication on the same identity model", async () => {
    const email = uniqueEmail("google-coexist");
    const { userId } = await registerUser({ email });

    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: "google-subject-id",
        providerId: "google",
        userId,
      },
    });

    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { providerId: true },
    });

    expect(accounts.map((account) => account.providerId).sort()).toEqual([
      "credential",
      "google",
    ]);

    const headers = await signInHeaders({ email, password: TEST_PASSWORD });
    const session = await auth.api.getSession({ headers });
    expect(session?.user.id).toBe(userId);
  });
});
