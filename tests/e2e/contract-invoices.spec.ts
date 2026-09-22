// tests/e2e/contract-invoices.spec.ts
import { expect, test } from "@playwright/test";

import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";
import { submitAndFollowActionRedirect } from "./helpers/server-action";

const CLIENT_NAME = "Invoice Studio";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000099";

test("should create, edit, void, and isolate contract invoices", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const email = uniqueE2EEmail("e2e-invoices");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Invoice User",
    workspaceName: "Invoice Workspace",
  });

  await page.goto("/clients/new");
  await page.getByLabel("Company name").fill(CLIENT_NAME);
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Create client" }),
    /\/clients\/[0-9a-f-]{36}$/,
  );

  await page.goto("/contracts/new");
  await page.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByLabel("Valid to").fill("2027-01-01");
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill("80");
  await page.getByLabel("Currency").selectOption("EUR");
  await page.getByLabel("Payment terms (days)").fill("30");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Create contract" }),
    /\/contracts\/[0-9a-f-]{36}$/,
  );

  const contractUrl = page.url();
  const contractId = contractUrl.split("/").at(-1) ?? "";

  await expect(page.getByRole("heading", { name: "Invoices", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No active invoices" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Invoice status" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "New invoice" }).click();
  await expect(page).toHaveURL(/\/contracts\/[^/]+\/invoices\/new$/);
  await expect(page.getByText("Recorded in EUR.")).toBeVisible();
  await expect(page.getByLabel("Currency")).toHaveText("EUR");
  await expect(page.locator('input[name="currency"], select[name="currency"]')).toHaveCount(0);
  await expect(page.getByLabel("Payment terms")).toHaveText("Net 30 days");

  await page.getByLabel("Invoice date").fill("2026-09-01");
  await page.getByLabel("Amount").fill("0");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(
    page.getByText("Enter an amount greater than 0 with at most 4 decimal places."),
  ).toBeVisible();

  await page.getByLabel("Amount").fill("1500.25");
  await page.getByLabel("Reference").fill("INV-100");
  await expect(page.getByText("2026-10-01")).toBeVisible();
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Create invoice" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );

  await expect(page.getByRole("heading", { level: 1, name: "INV-100" })).toBeVisible();
  await expect(page.locator("dt", { hasText: /^Amount$/ }).locator("+ dd")).toHaveText(
    "1500.25 EUR",
  );
  await expect(page.getByText("EUR", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("2026-09-01")).toBeVisible();
  await expect(page.getByText("2026-10-01")).toBeVisible();
  await expect(page.getByText("Unpaid")).toBeVisible();
  await expect(page.getByText("Active")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();

  const invoiceUrl = page.url();
  const invoiceId = invoiceUrl.split("/").at(-1) ?? "";

  await page.getByRole("link", { name: "Back to contract" }).click();
  await expect(page.getByRole("link", { name: "INV-100" })).toBeVisible();
  await expect(page.getByText("1500.25 EUR")).toBeVisible();
  await expect(page.getByText("Unpaid")).toBeVisible();

  await page.getByRole("link", { name: "INV-100" }).click();
  await expect(page).toHaveURL(/\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/contracts\/[^/]+\/invoices\/[^/]+\/edit$/);
  await expect(page.getByLabel("Currency")).toHaveText("EUR");
  await expect(page.locator('input[name="currency"], select[name="currency"]')).toHaveCount(0);
  await page.getByLabel("Invoice date").fill("2026-09-10");
  await expect(page.getByText("2026-10-10")).toBeVisible();
  await page.getByLabel("Amount").fill("1750");
  await page.getByLabel("Reference").fill("INV-100B");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Save changes" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );
  await expect(page.getByRole("heading", { level: 1, name: "INV-100B" })).toBeVisible();
  await expect(page.locator("dt", { hasText: /^Amount$/ }).locator("+ dd")).toHaveText("1750 EUR");
  await expect(page.getByText("2026-10-10")).toBeVisible();

  await page.getByRole("link", { name: "Void" }).click();
  await expect(page).toHaveURL(/confirm=void/);
  await expect(page.getByText("Void this invoice?")).toBeVisible();
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Confirm void" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );
  await expect(page.getByText("Void").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Void" })).toHaveCount(0);

  await page.goto(`/contracts/${contractId}/invoices/${invoiceId}/edit`);
  await expect(page).toHaveURL(new RegExp(`/contracts/${contractId}/invoices/${invoiceId}$`));
  await expect(page.getByText("Void").first()).toBeVisible();

  await page.goto(`/contracts/${contractId}`);
  await expect(
    page.getByRole("heading", { name: "No active invoices" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "INV-100B" })).toHaveCount(0);

  await page
    .getByRole("navigation", { name: "Invoice status" })
    .getByRole("link", { name: "Void" })
    .click();
  await expect(page).toHaveURL(/tracking=VOID/);
  await expect(page.getByRole("link", { name: "INV-100B" })).toBeVisible();
  await expect(page.getByText("Void").first()).toBeVisible();

  await page.getByRole("link", { name: "INV-100B" }).click();
  await expect(page.getByText("Void").first()).toBeVisible();
  await expect(page.locator("dt", { hasText: /^Amount$/ }).locator("+ dd")).toHaveText("1750 EUR");

  await page.goto(`/contracts/${contractId}/edit`);
  await page.getByLabel("Currency").selectOption("USD");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Contract currency cannot change after an invoice exists."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/contracts\/[^/]+\/edit$/);

  await page.goto("/contracts/new");
  await page.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  await page.getByLabel("Valid from").fill("2027-01-01");
  await page.getByLabel("Billing model").selectOption("DAILY");
  await page.getByLabel("Rate").fill("500");
  await page.getByLabel("Currency").selectOption("EUR");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Create contract" }),
    /\/contracts\/[0-9a-f-]{36}$/,
  );
  const otherContractId = page.url().split("/").at(-1) ?? "";

  await page.getByRole("link", { name: "New invoice" }).click();
  await page.getByLabel("Invoice date").fill("2026-09-01");
  await page.getByLabel("Amount").fill("50");
  await expect(page.getByText("No due date")).toBeVisible();
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Create invoice" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );
  await expect(page.getByText("No due date")).toBeVisible();
  await expect(page.getByText("Overdue")).toHaveCount(0);

  await page.goto(`/contracts/${otherContractId}/invoices/${invoiceId}`);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();

  await page.goto(`/contracts/${UNKNOWN_ID}/invoices/${UNKNOWN_ID}`);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();

  const foreignPage = await browser.newPage();
  await registerAndCreateFirstWorkspace(foreignPage, {
    email: uniqueE2EEmail("e2e-invoices-b"),
    name: "Foreign User",
    workspaceName: "Foreign Workspace",
  });
  await foreignPage.goto(invoiceUrl);
  await expect(
    foreignPage.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await foreignPage.close();
});
