// src/application/auth/route-access.ts
export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
export const RESET_PASSWORD_PATH = "/reset-password";
export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

const AUTH_PAGE_PATHS = new Set<string>([
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  FORGOT_PASSWORD_PATH,
  RESET_PASSWORD_PATH,
]);

const AUTH_PAGES_THAT_REDIRECT_WHEN_AUTHENTICATED = new Set<string>([
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  FORGOT_PASSWORD_PATH,
]);

export function isAuthPagePath(pathname: string): boolean {
  return AUTH_PAGE_PATHS.has(pathname);
}

export function getUnauthenticatedRedirectPath(
  pathname: string,
): string | null {
  if (isAuthPagePath(pathname)) {
    return null;
  }

  return SIGN_IN_PATH;
}

export function getAuthenticatedAuthPageRedirectPath(
  pathname: string,
): string | null {
  if (AUTH_PAGES_THAT_REDIRECT_WHEN_AUTHENTICATED.has(pathname)) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  return null;
}
