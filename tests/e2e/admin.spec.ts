// tests/e2e/admin.spec.ts
import { expect, test } from "@playwright/test";

import { registerAndCreateFirstWorkspace } from "./helpers/first-workspace";

test("unauthenticated users cannot access /admin", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/sign-in$/);
});

test("authenticated normal users cannot access /admin", async ({ page }) => {
  const email = `e2e-normal-${Date.now()}@example.com`;
  await registerAndCreateFirstWorkspace(page, {
    email,
    workspaceName: "Test Workspace",
  });

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByText(/unauthorized admin access/i),
  ).toBeVisible();
});

test("admin route does not require workspace context", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
