// src/infrastructure/auth/e2e-runtime.ts

/**
 * E2E isolation marker for Playwright against `next start`.
 * Never enable this on Vercel. Production Better Auth rate-limit
 * defaults remain unchanged when this flag is absent.
 */
export const AUTH_E2E_RUNTIME_ENV = "AUTH_E2E_RUNTIME";

export function isE2EAuthRuntime(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.VERCEL === "1" || env.VERCEL_ENV === "production") {
    return false;
  }

  return env[AUTH_E2E_RUNTIME_ENV] === "true";
}

export function getBetterAuthRateLimitOptions(
  env: Record<string, string | undefined> = process.env,
): { enabled: false } | undefined {
  if (!isE2EAuthRuntime(env)) {
    return undefined;
  }

  return { enabled: false };
}
