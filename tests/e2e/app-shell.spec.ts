// tests/e2e/app-shell.spec.ts
import { expect, test } from "@playwright/test";

test("should keep the application shell behind authentication", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("FreelanceOS");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toHaveCount(0);
});
