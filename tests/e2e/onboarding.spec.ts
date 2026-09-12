// tests/e2e/onboarding.spec.ts
import { expect, test, type Page } from "@playwright/test";

function uniqueEmail(): string {
  return `e2e-onboarding-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerUser(page: Page, email: string): Promise<void> {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Onboarding User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ValidPass1!");
  await page.getByRole("button", { name: "Create account" }).click();
}

test("should complete first-workspace onboarding into the authenticated application", async ({
  page,
}) => {
  const email = uniqueEmail();

  await registerUser(page, email);

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toHaveCount(0);

  await page.getByLabel("Workspace name").fill("Studio Iamoni");
  await page.getByLabel("Timezone").selectOption("Europe/Rome");
  await page.getByLabel("Currency").selectOption("EUR");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();

  await page.goto("/?workspaceId=00000000-0000-0000-0000-000000000001");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();

  await page.goto("/onboarding");
  await expect(page).toHaveURL("/");
});

test("should keep unauthenticated users out of onboarding and application routes", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goto("/clients");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goto("/?workspaceId=00000000-0000-0000-0000-000000000001");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("should send authenticated users without a workspace to onboarding", async ({
  page,
}) => {
  await registerUser(page, uniqueEmail());

  await expect(page).toHaveURL(/\/onboarding$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.goto("/clients");
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.goto("/?workspaceId=00000000-0000-0000-0000-000000000001");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.goto("/clients?workspaceId=00000000-0000-0000-0000-000000000001");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
});

test("should reject invalid onboarding input without creating a workspace", async ({
  page,
}) => {
  await registerUser(page, uniqueEmail());

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Workspace name").fill("   ");
  await page.getByLabel("Timezone").selectOption("Europe/Rome");
  await page.getByLabel("Currency").selectOption("EUR");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page.getByText("Enter a workspace name.")).toBeVisible();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
});
