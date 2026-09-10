// tests/e2e/app-shell.spec.ts
import { expect, test } from "@playwright/test";

test("should render the FreelanceOS application shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("FreelanceOS");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
