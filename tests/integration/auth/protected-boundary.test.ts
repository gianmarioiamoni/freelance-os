// tests/integration/auth/protected-boundary.test.ts
import { describe, expect, it } from "vitest";

import {
  FORGOT_PASSWORD_PATH,
  getAuthenticatedAuthPageRedirectPath,
  getUnauthenticatedRedirectPath,
  RESET_PASSWORD_PATH,
  SIGN_IN_PATH,
} from "@/application/auth/route-access";
import { getAuthSessionFromHeaders } from "@/infrastructure/auth/session";

import { registerUser, signInHeaders, uniqueEmail } from "./helpers";

describe("protected server boundary", () => {
  it("rejects unauthenticated access to application routes", () => {
    expect(getUnauthenticatedRedirectPath("/")).toBeNull();
    expect(getUnauthenticatedRedirectPath("/dashboard")).toBe(SIGN_IN_PATH);
    expect(getUnauthenticatedRedirectPath("/clients")).toBe(SIGN_IN_PATH);
    expect(getUnauthenticatedRedirectPath("/onboarding")).toBe(SIGN_IN_PATH);
    expect(getUnauthenticatedRedirectPath(SIGN_IN_PATH)).toBeNull();
    expect(getUnauthenticatedRedirectPath(FORGOT_PASSWORD_PATH)).toBeNull();
    expect(getUnauthenticatedRedirectPath(RESET_PASSWORD_PATH)).toBeNull();
  });

  it("allows authenticated access and reads identity from Better Auth", async () => {
    const email = uniqueEmail("boundary");
    const { userId } = await registerUser({ email });
    const headers = await signInHeaders({ email });

    const session = await getAuthSessionFromHeaders(headers);

    expect(getUnauthenticatedRedirectPath("/dashboard")).toBe(SIGN_IN_PATH);
    expect(session?.user.id).toBe(userId);
    expect(getAuthenticatedAuthPageRedirectPath(SIGN_IN_PATH)).toBe(
      "/dashboard",
    );
  });
});
