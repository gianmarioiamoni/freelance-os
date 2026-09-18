// tests/e2e/app-shell.spec.ts
import { expect, test } from "@playwright/test";

import { registerAndCreateFirstWorkspace, uniqueE2EEmail } from "./helpers/first-workspace";

const APPLICATION_NAV_LINKS = [
  "Dashboard",
  "Clients",
  "Contracts",
  "Time Tracking",
  "Reports",
  "Alerts",
  "Settings",
] as const;

test("should keep the application shell behind authentication", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveTitle("FreelanceOS");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toHaveCount(0);
});

test("should show authenticated shell identity, navigation, and skip link", async ({
  page,
}) => {
  const email = uniqueE2EEmail("e2e-shell");
  const accountName = "Shell Account";
  const workspaceName = "Shell Workspace";

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: accountName,
    workspaceName,
  });

  await expect(page.getByText(workspaceName)).toBeVisible();
  await expect(page.getByText(accountName)).toBeVisible();

  const applicationNav = page.getByRole("navigation", { name: "Application" });
  await expect(applicationNav).toBeVisible();

  for (const name of APPLICATION_NAV_LINKS) {
    await expect(applicationNav.getByRole("link", { name })).toBeVisible();
  }

  await expect(
    applicationNav.getByRole("link", { name: "Dashboard" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await expect(page.locator("#main-content")).toBeVisible();

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator("#main-content")).toBeVisible();

  await applicationNav.getByRole("link", { name: "Clients" }).click();
  await expect(page).toHaveURL(/\/clients$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clients" }),
  ).toBeVisible();
  await expect(
    applicationNav.getByRole("link", { name: "Clients" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    applicationNav.getByRole("link", { name: "Dashboard" }),
  ).not.toHaveAttribute("aria-current");

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileMenu = page.getByRole("button", { name: "Open navigation" });
  await expect(mobileMenu).toBeVisible();
  await mobileMenu.click();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }).getByRole("link", {
      name: "Clients",
    }),
  ).toHaveAttribute("aria-current", "page");

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("navigation", { name: "Application" }).getByRole("link", {
    name: "Settings",
  }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Settings" }),
  ).toBeVisible();
  await expect(
    page.getByText("Settings is not implemented yet."),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Workspace" })).toBeVisible();
  await expect(page.getByText("Europe/Rome")).toBeVisible();
  await expect(
    page.getByText("Timezone is used for reporting periods"),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Settings" }),
  ).toBeVisible();
  await expect(page.getByText("Europe/Rome")).toBeVisible();
});
