// tests/unit/application/auth/route-access.test.ts
import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTHENTICATED_PATH,
  FORGOT_PASSWORD_PATH,
  getAuthenticatedAuthPageRedirectPath,
  getUnauthenticatedRedirectPath,
  isAuthPagePath,
  isPublicPagePath,
  LANDING_PATH,
  RESET_PASSWORD_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
} from "@/application/auth/route-access";

describe("auth route access", () => {
  it("identifies auth pages as reachable without a session", () => {
    expect(isAuthPagePath(SIGN_IN_PATH)).toBe(true);
    expect(isAuthPagePath(SIGN_UP_PATH)).toBe(true);
    expect(isAuthPagePath(FORGOT_PASSWORD_PATH)).toBe(true);
    expect(isAuthPagePath(RESET_PASSWORD_PATH)).toBe(true);
    expect(isAuthPagePath(LANDING_PATH)).toBe(false);
    expect(isAuthPagePath("/dashboard")).toBe(false);
    expect(isAuthPagePath("/onboarding")).toBe(false);
    expect(isPublicPagePath(LANDING_PATH)).toBe(true);
    expect(isPublicPagePath("/dashboard")).toBe(false);
    expect(isPublicPagePath(SIGN_IN_PATH)).toBe(false);
    expect(getUnauthenticatedRedirectPath(SIGN_IN_PATH)).toBeNull();
    expect(getUnauthenticatedRedirectPath(FORGOT_PASSWORD_PATH)).toBeNull();
    expect(getUnauthenticatedRedirectPath(RESET_PASSWORD_PATH)).toBeNull();
    expect(getUnauthenticatedRedirectPath(LANDING_PATH)).toBeNull();
    expect(getUnauthenticatedRedirectPath("/dashboard")).toBe(SIGN_IN_PATH);
    expect(getUnauthenticatedRedirectPath("/settings")).toBe(SIGN_IN_PATH);
    expect(getUnauthenticatedRedirectPath("/onboarding")).toBe(SIGN_IN_PATH);
  });

  it("redirects authenticated users away from auth pages except reset", () => {
    expect(getAuthenticatedAuthPageRedirectPath(SIGN_IN_PATH)).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
    expect(getAuthenticatedAuthPageRedirectPath(FORGOT_PASSWORD_PATH)).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
    expect(
      getAuthenticatedAuthPageRedirectPath(RESET_PASSWORD_PATH),
    ).toBeNull();
    expect(getAuthenticatedAuthPageRedirectPath(LANDING_PATH)).toBeNull();
    expect(getAuthenticatedAuthPageRedirectPath("/dashboard")).toBeNull();
  });
});
