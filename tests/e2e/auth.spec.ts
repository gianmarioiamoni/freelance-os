// tests/e2e/auth.spec.ts
import { expect, test } from "@playwright/test";

import { findPasswordResetTokenForEmail } from "./helpers/password-reset";

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

test("should redirect unauthenticated users to sign-in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByText("FreelanceOS", { exact: true })).toBeVisible();
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

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByText("FreelanceOS", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ValidPass1!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
});

test("should recover a password from the email/password flow", async ({
  page,
}) => {
  const email = uniqueEmail();
  const originalPassword = "ValidPass1!";
  const nextPassword = "NewValidPass1!";

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Recovery User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(originalPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByText("FreelanceOS", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Forgot password" }),
  ).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText(
      "If an account exists for that email, you will receive a password reset link.",
    ),
  ).toBeVisible();

  const token = await findPasswordResetTokenForEmail(email);
  expect(token).toBeTruthy();

  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("New password").fill(nextPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(originalPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(nextPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("should acknowledge password recovery for an unknown email", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(`missing-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText(
      "If an account exists for that email, you will receive a password reset link.",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/forgot-password$/);
});

test("should reject an invalid password reset token", async ({ page }) => {
  await page.goto("/reset-password?token=invalid-token");
  await page.getByLabel("New password").fill("NewValidPass1!");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(
    page.getByText("This reset link is invalid or has expired."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/reset-password/);
});
