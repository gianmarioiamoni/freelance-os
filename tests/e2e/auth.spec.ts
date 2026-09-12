// tests/e2e/auth.spec.ts
import { expect, test } from "@playwright/test";

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

test("should redirect unauthenticated users to sign-in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("should expose Google sign-in without requiring Google credentials", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();

  await page.goto("/sign-up");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});

test("should reject invalid credentials", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("WrongPass1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("should register, stay authenticated, and sign out", async ({ page }) => {
  const email = uniqueEmail();

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ValidPass1!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
});
