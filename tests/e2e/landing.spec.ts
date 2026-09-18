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

  await expect(
    page.getByRole("heading", { name: "How it works" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Set up", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Track", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Understand", exact: true }),
  ).toBeVisible();

  for (const name of APPROVED_CAPABILITIES) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(`Read more about ${name}`)).toBeVisible();
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

  for (const name of APPROVED_CAPABILITIES) {
    await page.getByText(`Read more about ${name}`).click();
  }

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

test("should expand and collapse capability details without navigating", async ({
  page,
}) => {
  await page.goto("/");

  const readMore = page.getByText("Read more about Clients");
  const readLess = page.getByText("Read less about Clients");
  const detail = page.getByText(
    "Clients are company records in your workspace.",
  );

  await expect(detail).toBeHidden();
  await readMore.click();
  await expect(page).toHaveURL("/");
  await expect(detail).toBeVisible();
  await expect(readLess).toBeVisible();

  await readLess.click();
  await expect(page).toHaveURL("/");
  await expect(detail).toBeHidden();
  await expect(readMore).toBeVisible();
});

test("should expand a capability detail with the keyboard", async ({
  page,
}) => {
  await page.goto("/");

  const readMore = page
    .locator("summary")
    .filter({ hasText: "Read more about Clients" });
  await readMore.focus();
  await expect(readMore).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Clients are company records in your workspace."),
  ).toBeVisible();
  await expect(page).toHaveURL("/");
});
