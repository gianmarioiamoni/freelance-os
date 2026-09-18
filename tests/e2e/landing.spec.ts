// tests/e2e/landing.spec.ts
import { expect, test } from "@playwright/test";

import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";

const APPROVED_CAPABILITIES = [
  "Clients",
  "Contracts",
  "Time Tracking",
  "Analytics / Dashboard",
  "Reports",
  "Alerts",
] as const;

test("should render the public landing for unauthenticated visitors", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "FreelanceOS" }),
  ).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sign in" }),
  ).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sign up" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toHaveCount(0);

  for (const name of APPROVED_CAPABILITIES) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
});

test("should send landing CTAs to sign-in and sign-up", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible();
});

test("should redirect authenticated workspace users from the landing to the dashboard", async ({
  page,
}) => {
  await registerAndCreateFirstWorkspace(page, {
    email: uniqueE2EEmail("e2e-landing-auth"),
    name: "Landing Auth User",
    workspaceName: "Landing Workspace",
  });

  await page.goto("/");
  await expect(page).toHaveURL("/dashboard");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();
});

test("should keep the landing usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "FreelanceOS" }),
  ).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sign in" }),
  ).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sign up" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();

  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyScrollWidth).toBeLessThanOrEqual(410);
});

test("should expose a skip link and a single page heading", async ({
  page,
}) => {
  await page.goto("/");

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});
