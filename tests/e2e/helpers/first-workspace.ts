// tests/e2e/helpers/first-workspace.ts
import { expect, type Page } from "@playwright/test";

const DEFAULT_PASSWORD = "ValidPass1!";

export function uniqueE2EEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export async function registerUser(
  page: Page,
  options: {
    email: string;
    name?: string;
    password?: string;
  },
): Promise<void> {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(options.name ?? "Onboarding User");
  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password ?? DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function createFirstWorkspace(
  page: Page,
  options: {
    name: string;
    timezone?: string;
    currency?: string;
  },
): Promise<void> {
  await page.getByLabel("Workspace name").fill(options.name);
  await page
    .getByLabel("Timezone")
    .selectOption(options.timezone ?? "Europe/Rome");
  await page.getByLabel("Currency").selectOption(options.currency ?? "EUR");
  await page.getByRole("button", { name: "Create workspace" }).click();
}

export async function registerAndCreateFirstWorkspace(
  page: Page,
  options: {
    email: string;
    name?: string;
    workspaceName: string;
  },
): Promise<void> {
  await registerUser(page, {
    email: options.email,
    name: options.name,
  });
  await expect(page).toHaveURL(/\/onboarding$/);
  await createFirstWorkspace(page, { name: options.workspaceName });
  await expect(page).toHaveURL("/dashboard");
}
