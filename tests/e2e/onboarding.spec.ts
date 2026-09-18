// tests/e2e/onboarding.spec.ts
import { expect, test } from "@playwright/test";

import {
  createFirstWorkspace,
  registerUser,
  uniqueE2EEmail,
} from "./helpers/first-workspace";

function uniqueEmail(): string {
  return uniqueE2EEmail("e2e-onboarding");
}

test("should complete first-workspace onboarding into the authenticated application", async ({
  page,
}) => {
  const email = uniqueEmail();

  await registerUser(page, { email });

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toHaveCount(0);

  await createFirstWorkspace(page, { name: "Studio Iamoni" });

  await expect(page).toHaveURL("/dashboard");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();

  await page.goto("/?workspaceId=00000000-0000-0000-0000-000000000001");
  await expect(page).toHaveURL("/dashboard");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();

  await page.goto("/onboarding");
  await expect(page).toHaveURL("/dashboard");
});

test("should keep unauthenticated users out of onboarding and application routes", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "FreelanceOS" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toHaveCount(0);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goto("/clients");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goto("/?workspaceId=00000000-0000-0000-0000-000000000001");
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "FreelanceOS" }),
  ).toBeVisible();
});

test("should send authenticated users without a workspace to onboarding", async ({
  page,
}) => {
  await registerUser(page, { email: uniqueEmail() });

  await expect(page).toHaveURL(/\/onboarding$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.goto("/dashboard");
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
  await registerUser(page, { email: uniqueEmail() });

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
