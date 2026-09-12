// src/infrastructure/auth/google-provider.ts
export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/auth/callback/google";

export type GoogleSocialProviderConfig = {
  clientId: string;
  clientSecret: string;
};

export function getGoogleSocialProvider(
  env: Record<string, string | undefined> = process.env,
): GoogleSocialProviderConfig | undefined {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim() ?? "";

  if (!clientId || !clientSecret) {
    return undefined;
  }

  return { clientId, clientSecret };
}

export function getGoogleOAuthRedirectURL(baseURL: string): string {
  return new URL(GOOGLE_OAUTH_CALLBACK_PATH, baseURL).toString();
}
