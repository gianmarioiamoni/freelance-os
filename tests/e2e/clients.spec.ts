// tests/e2e/clients.spec.ts
import { expect, test } from "@playwright/test";

import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";

test("should create, edit, and archive a workspace client", async ({
  page,
}) => {
  const email = uniqueE2EEmail("e2e-clients");
  const originalName = "Acme Studio";
  const updatedName = "Acme Studio Updated";

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Clients User",
    workspaceName: "Clients Workspace",
  });

  await page.goto("/clients");
  await expect(page).toHaveURL(/\/clients$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clients" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No active clients" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "New client" }).click();
  await expect(page).toHaveURL(/\/clients\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "New client" }),
  ).toBeVisible();

  await page.getByLabel("Company name").fill(originalName);
  await page.getByRole("button", { name: "Create client" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: originalName }),
  ).toBeVisible();

  await page.goto("/clients");
  await expect(page.getByRole("link", { name: originalName })).toBeVisible();

  await page.getByRole("link", { name: originalName }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: originalName }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/clients\/[^/]+\/edit$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit client" }),
  ).toBeVisible();

  await page.getByLabel("Company name").fill(updatedName);
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: updatedName }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Archive" }).click();
  await expect(page.getByText("Archive this client?")).toBeVisible();
  await page.getByRole("button", { name: "Confirm archive" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: updatedName }),
  ).toBeVisible();
  await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();

  await page.goto("/clients");
  await expect(
    page.getByRole("heading", { level: 1, name: "Clients" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No active clients" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: updatedName })).toHaveCount(0);

  await page.getByRole("link", { name: "View archived clients" }).click();
  await expect(page).toHaveURL(/\/clients\?status=archived/);
  await expect(page.getByRole("link", { name: updatedName })).toBeVisible();

  await page.getByRole("link", { name: updatedName }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: updatedName }),
  ).toBeVisible();
  await expect(page.getByText("Master data")).toBeVisible();
  await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();
});
