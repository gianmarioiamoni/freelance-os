// tests/unit/infrastructure/google-provider.test.ts
import { describe, expect, it } from "vitest";

import {
  GOOGLE_OAUTH_CALLBACK_PATH,
  getGoogleOAuthRedirectURL,
  getGoogleSocialProvider,
} from "@/infrastructure/auth/google-provider";

describe("Google OAuth provider configuration", () => {
  it("enables the provider only when both credentials are present", () => {
    expect(getGoogleSocialProvider({})).toBeUndefined();
    expect(
      getGoogleSocialProvider({
        GOOGLE_CLIENT_ID: "client-id",
      }),
    ).toBeUndefined();
    expect(
      getGoogleSocialProvider({
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toBeUndefined();
    expect(
      getGoogleSocialProvider({
        GOOGLE_CLIENT_ID: "  ",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toBeUndefined();

    expect(
      getGoogleSocialProvider({
        GOOGLE_CLIENT_ID: " client-id ",
        GOOGLE_CLIENT_SECRET: " client-secret ",
      }),
    ).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
    });
  });

  it("builds the Better Auth callback URL from BETTER_AUTH_URL", () => {
    expect(GOOGLE_OAUTH_CALLBACK_PATH).toBe("/api/auth/callback/google");
    expect(getGoogleOAuthRedirectURL("http://localhost:3000")).toBe(
      "http://localhost:3000/api/auth/callback/google",
    );
    expect(getGoogleOAuthRedirectURL("https://app.example.com")).toBe(
      "https://app.example.com/api/auth/callback/google",
    );
  });
});
