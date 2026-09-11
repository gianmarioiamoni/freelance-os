// tests/unit/application/auth/route-access.test.ts
import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTHENTICATED_PATH,
  getAuthenticatedAuthPageRedirectPath,
  getUnauthenticatedRedirectPath,
  isAuthPagePath,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
} from "@/application/auth/route-access";

describe("auth route access", () => {
  it("identifies auth pages as reachable without a session", () => {
    expect(isAuthPagePath(SIGN_IN_PATH)).toBe(true);
    expect(isAuthPagePath(SIGN_UP_PATH)).toBe(true);
    expect(isAuthPagePath("/")).toBe(false);
    expect(getUnauthenticatedRedirectPath(SIGN_IN_PATH)).toBeNull();
    expect(getUnauthenticatedRedirectPath("/settings")).toBe(SIGN_IN_PATH);
  });

  it("redirects authenticated users away from auth pages", () => {
    expect(getAuthenticatedAuthPageRedirectPath(SIGN_IN_PATH)).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
    expect(getAuthenticatedAuthPageRedirectPath("/")).toBeNull();
  });
});
