// tests/e2e/invoice-payments.spec.ts
import { expect, test } from "@playwright/test";

import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";
import { submitAndFollowActionRedirect } from "./helpers/server-action";

const CLIENT_NAME = "Payment Studio";

test("should record, edit, delete, and freeze payments on an invoice", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const email = uniqueE2EEmail("e2e-payments");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Payment User",
    workspaceName: "Payment Workspace",
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

  await page.getByRole("link", { name: "New invoice" }).click();
  await page.getByLabel("Invoice date").fill("2026-01-01");
  await page.getByLabel("Amount").fill("1500");
  await page.getByLabel("Reference").fill("INV-PAY-1");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Create invoice" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );

  const invoiceUrl = page.url();
  await expect(page.getByText("Unpaid")).toBeVisible();
  await expect(page.locator("dt", { hasText: /^Paid$/ }).locator("+ dd")).toHaveText("0 EUR");
  await expect(page.locator("dt", { hasText: /^Outstanding$/ }).locator("+ dd")).toHaveText(
    "1500 EUR",
  );
  await expect(page.locator("dt", { hasText: /^Overdue$/ }).locator("+ dd")).toHaveText(
    "Overdue",
  );
  await expect(page.getByRole("heading", { name: "No payments recorded" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Record payment" })).toBeVisible();

  await page.getByRole("link", { name: "Record payment" }).click();
  await expect(page).toHaveURL(/\/payments\/new$/);
  await expect(page.getByText("Recorded in EUR.")).toBeVisible();
  await expect(page.getByLabel("Currency")).toHaveText("EUR");
  await expect(page.locator('input[name="currency"], select[name="currency"]')).toHaveCount(0);
  await expect(page.locator('input[name="invoiceId"]')).toHaveCount(0);

  await page.getByLabel("Amount").fill("0");
  await page.getByRole("button", { name: "Create payment" }).click();
  await expect(
    page.getByText("Enter an amount greater than 0 with at most 4 decimal places."),
  ).toBeVisible();

  await page.locator("form").evaluate((element) => {
    const form = element as HTMLFormElement;
    const dateInput = form.querySelector<HTMLInputElement>('[name="paymentDate"]');
    const amountInput = form.querySelector<HTMLInputElement>('[name="amount"]');
    if (!dateInput || !amountInput) {
      throw new Error("payment form fields missing");
    }
    dateInput.type = "text";
    dateInput.value = "2026-02-30";
    amountInput.value = "400";
    form.noValidate = true;
    form.requestSubmit();
  });
  await expect(page.getByText("Enter a valid payment date.")).toBeVisible();

  await page.getByLabel("Payment date").fill("2027-01-15");
  await page.getByLabel("Amount").fill("400");
  await page.getByLabel("Notes").fill("First installment");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Create payment" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );

  await expect(page.getByText("Partial")).toBeVisible();
  await expect(page.locator("dt", { hasText: /^Paid$/ }).locator("+ dd")).toHaveText("400 EUR");
  await expect(page.locator("dt", { hasText: /^Outstanding$/ }).locator("+ dd")).toHaveText(
    "1100 EUR",
  );
  await expect(page.locator("dt", { hasText: /^Overdue$/ }).locator("+ dd")).toHaveText(
    "Overdue",
  );
  await expect(page.getByText("2027-01-15")).toBeVisible();
  await expect(page.getByText("First installment")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No payments recorded" })).toHaveCount(0);

  await page.getByRole("link", { name: "Back to contract" }).click();
  await expect(page.getByText("Paid 400 EUR")).toBeVisible();
  await expect(page.getByText("Partial")).toBeVisible();
  await page.getByRole("link", { name: "INV-PAY-1" }).click();

  await page.goto("/alerts");
  await expect(page.getByText("Partial payment")).toBeVisible();
  await expect(page.getByText("Payment overdue")).toBeVisible();

  await page.goto(invoiceUrl);
  await page.getByRole("link", { name: "Edit payment" }).click();
  await expect(page).toHaveURL(/\/payments\/[^/]+\/edit$/);
  await expect(page.getByLabel("Currency")).toHaveText("EUR");
  await expect(page.locator('input[name="currency"], select[name="currency"]')).toHaveCount(0);
  await page.getByLabel("Payment date").fill("2026-09-10");
  await page.getByLabel("Amount").fill("1500");
  await page.getByLabel("Notes").fill("Exact settlement");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Save changes" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );

  await expect(page.locator("dt", { hasText: /^Payment status$/ }).locator("+ dd")).toHaveText(
    "Paid",
  );
  await expect(page.locator("dt", { hasText: /^Paid$/ }).locator("+ dd")).toHaveText("1500 EUR");
  await expect(page.locator("dt", { hasText: /^Outstanding$/ }).locator("+ dd")).toHaveText("0 EUR");
  await expect(page.getByText("Overdue")).toHaveCount(0);

  await page.getByRole("link", { name: "Edit payment" }).click();
  await page.getByLabel("Amount").fill("1600");
  await page.getByLabel("Notes").fill("Adjusted");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Save changes" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );

  await expect(page.getByText("Mismatch")).toBeVisible();
  await expect(page.locator("dt", { hasText: /^Paid$/ }).locator("+ dd")).toHaveText("1600 EUR");
  await expect(page.locator("dt", { hasText: /^Outstanding$/ }).locator("+ dd")).toHaveText("0 EUR");
  await expect(page.getByText("Adjusted")).toBeVisible();
  await expect(page.getByText("Overdue")).toHaveCount(0);

  await page.getByRole("link", { name: "Delete payment" }).click();
  await expect(page).toHaveURL(/confirm=delete-payment/);
  await expect(page.getByText("Delete this payment?")).toBeVisible();
  await expect(page.getByText("does not create a reversal")).toBeVisible();
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Delete payment" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );

  await expect(page.getByText("Unpaid")).toBeVisible();
  await expect(page.locator("dt", { hasText: /^Paid$/ }).locator("+ dd")).toHaveText("0 EUR");
  await expect(page.getByRole("heading", { name: "No payments recorded" })).toBeVisible();

  await page.getByRole("link", { name: "Record payment" }).click();
  await page.getByLabel("Payment date").fill("2026-09-12");
  await page.getByLabel("Amount").fill("250");
  await page.getByLabel("Notes").fill("Kept after void");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Create payment" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );

  const paymentEditHref = await page.getByRole("link", { name: "Edit payment" }).getAttribute("href");
  expect(paymentEditHref).toBeTruthy();

  await page.getByRole("link", { name: "Void" }).click();
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Confirm void" }),
    /\/contracts\/[^/]+\/invoices\/[0-9a-f-]{36}$/,
  );

  await expect(page.getByText("Invoice is void")).toBeVisible();
  await expect(page.getByText("Kept after void")).toBeVisible();
  await expect(page.locator("dt", { hasText: /^Paid$/ }).locator("+ dd")).toHaveText("250 EUR");
  await expect(page.getByRole("link", { name: "Record payment" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit payment" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Delete payment" })).toHaveCount(0);

  await page.goto(`${invoiceUrl}/payments/new`);
  await expect(page).toHaveURL(new RegExp(`${new URL(invoiceUrl).pathname}$`));
  await expect(page.getByText("Invoice is void")).toBeVisible();

  await page.goto(paymentEditHref ?? `${invoiceUrl}/payments/missing/edit`);
  await expect(page).toHaveURL(new RegExp(`${new URL(invoiceUrl).pathname}$`));
  await expect(page.getByText("Invoice is void")).toBeVisible();

  const foreignPage = await browser.newPage();
  await registerAndCreateFirstWorkspace(foreignPage, {
    email: uniqueE2EEmail("e2e-payments-b"),
    name: "Foreign User",
    workspaceName: "Foreign Workspace",
  });
  await foreignPage.goto(invoiceUrl);
  await expect(
    foreignPage.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await foreignPage.close();
});
