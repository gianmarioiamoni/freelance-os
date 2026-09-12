// src/components/app-shell/account-label.ts
export function getAccountDisplayLabel(
  name: string | null | undefined,
  email: string,
): string {
  const trimmedName = name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  return email;
}
