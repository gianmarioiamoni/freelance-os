// tests/e2e/contracts.spec.ts
import { expect, test } from "@playwright/test";

import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";

const CLIENT_NAME = "Contract Studio";
const UNKNOWN_CONTRACT_ID = "00000000-0000-4000-8000-000000000099";

test("should create, edit, and isolate workspace contracts", async ({
  page,
}) => {
  const email = uniqueE2EEmail("e2e-contracts");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Contracts User",
    workspaceName: "Contracts Workspace",
  });

  await page.goto("/contracts");
  await expect(page).toHaveURL(/\/contracts$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Contracts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No contracts" }),
  ).toBeVisible();
  await expect(
    page.getByText("Create a client before you can add a contract."),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "New client" }).click();
  await expect(page).toHaveURL(/\/clients\/new$/);
  await page.getByLabel("Company name").fill(CLIENT_NAME);
  await page.getByRole("button", { name: "Create client" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: CLIENT_NAME }),
  ).toBeVisible();

  await page.goto("/contracts");
  await expect(
    page.getByRole("heading", { name: "No contracts" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "New contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "New contract" }),
  ).toBeVisible();

  await page.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill("0");
  await page.getByLabel("Currency").selectOption("EUR");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(
    page.getByText("Enter a rate greater than 0 with at most 4 decimal places."),
  ).toBeVisible();

  await page.getByLabel("Rate").fill("80");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/[^/]+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: CLIENT_NAME }),
  ).toBeVisible();
  await expect(page.getByText("Current", { exact: true })).toBeVisible();
  await expect(page.getByText("Hourly")).toBeVisible();
  await expect(page.getByText("80 EUR")).toBeVisible();
  await expect(page.getByText("Open-ended")).toBeVisible();

  await page.goto("/contracts");
  await expect(page.getByRole("link", { name: CLIENT_NAME })).toBeVisible();
  await expect(page.getByText("Current", { exact: true })).toBeVisible();
  await expect(page.getByText("2026-01-01 → Open-ended")).toBeVisible();

  await page.getByRole("link", { name: CLIENT_NAME }).click();
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/contracts\/[^/]+\/edit$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit contract" }),
  ).toBeVisible();
  await expect(page.getByLabel("Client")).toHaveValue(CLIENT_NAME);

  await page.getByLabel("Rate").fill("95");
  await page.getByLabel("Valid to").fill("2027-01-01");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/contracts\/[^/]+$/);
  await expect(page.getByText("95 EUR")).toBeVisible();
  await expect(page.getByText("2027-01-01")).toBeVisible();

  await page.goto("/contracts");
  await expect(page.getByText("95 EUR")).toBeVisible();
  await expect(page.getByText("2026-01-01 → 2027-01-01")).toBeVisible();

  await page.getByRole("link", { name: "New contract" }).click();
  await page.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  await page.getByLabel("Valid from").fill("2027-01-01");
  await page.getByLabel("Billing model").selectOption("DAILY");
  await page.getByLabel("Rate").fill("500");
  await page.getByLabel("Currency").selectOption("EUR");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/[^/]+$/);
  await expect(page.getByText("Scheduled", { exact: true })).toBeVisible();
  await expect(page.getByText("Daily")).toBeVisible();
  await expect(page.getByText("500 EUR")).toBeVisible();

  await page.goto("/contracts");
  await expect(page.getByText("2026-01-01 → 2027-01-01")).toBeVisible();
  await expect(page.getByText("2027-01-01 → Open-ended")).toBeVisible();
  await expect(page.getByText("Current", { exact: true })).toBeVisible();
  await expect(page.getByText("Scheduled", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "New contract" }).click();
  await page.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  await page.getByLabel("Valid from").fill("2026-06-15");
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill("90");
  await page.getByLabel("Currency").selectOption("EUR");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(
    page.getByText("This period overlaps another contract for this client."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/contracts\/new$/);

  await page.goto("/clients");
  await page.getByRole("link", { name: CLIENT_NAME }).click();
  await expect(page.getByRole("heading", { name: "Contracts" })).toBeVisible();
  await page.getByRole("link", { name: "Archive" }).click();
  await expect(page.getByText("Archive this client?")).toBeVisible();
  await page.getByRole("button", { name: "Confirm archive" }).click();
  await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "New contract" })).toHaveCount(0);
  await expect(page.getByText("2026-01-01 → 2027-01-01")).toBeVisible();

  await page.getByRole("link", { name: "2026-01-01 → 2027-01-01" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: CLIENT_NAME }),
  ).toBeVisible();
  await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();

  await page.goto("/contracts/new");
  await expect(
    page.getByRole("heading", { name: "No active clients" }),
  ).toBeVisible();
  await expect(page.getByLabel("Client")).toHaveCount(0);

  await page.goto(`/contracts/${UNKNOWN_CONTRACT_ID}`);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Application" }),
  ).toBeVisible();

  await page.goto("/contracts?workspaceId=00000000-0000-0000-0000-000000000001");
  await expect(page).toHaveURL(/\/contracts/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Contracts" }),
  ).toBeVisible();
  await expect(page.getByText("2026-01-01 → 2027-01-01")).toBeVisible();
  await expect(page.getByText("Archived client")).toHaveCount(2);
});
