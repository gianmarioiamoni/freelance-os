// src/lib/next-redirect-error.ts

/**
 * True when `error` is a Next.js `redirect()` control-flow signal.
 * Those errors carry a digest `NEXT_REDIRECT;…` and must not be logged
 * or mapped to application ErrorState (F-104-007).
 */
export function isNextRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }

  return typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT");
}
