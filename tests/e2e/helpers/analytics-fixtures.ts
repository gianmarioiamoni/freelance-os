// tests/e2e/helpers/analytics-fixtures.ts
import { expect, type Page } from "@playwright/test";

/** First day of the current month, as the `yyyy-mm-dd` value the date inputs expect. */
export function firstDayOfCurrentMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
}

/** Today, as the `yyyy-mm-dd` value the date inputs expect. */
export function todayValue(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    .toISOString()
    .split("T")[0];
}

/** Creates a client and returns the URL of its detail page. */
export async function createClient(
  page: Page,
  companyName: string,
): Promise<string> {
  await page.goto("/clients/new");
  await expect(page).toHaveURL(/\/clients\/new/);
  await page.getByLabel("Company name").fill(companyName);
  await page.getByRole("button", { name: "Create client" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: companyName }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);
  return page.url();
}

export async function createContract(
  page: Page,
  options: {
    rate: string;
    validFrom?: string;
    validTo?: string;
    monthlyContractedHours?: string;
  },
): Promise<void> {
  await page.getByRole("link", { name: "New contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/new/);

  await page.getByLabel("Valid from").fill(options.validFrom ?? firstDayOfCurrentMonth());
  if (options.validTo) {
    await page.getByLabel("Valid to").fill(options.validTo);
  }
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill(options.rate);
  await page.getByLabel("Currency").selectOption("EUR");
  if (options.monthlyContractedHours) {
    await page
      .getByLabel("Monthly contracted hours")
      .fill(options.monthlyContractedHours);
  }

  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/[0-9a-f-]{36}$/);
}

/** Creates a client plus one contract, returning the client detail URL. */
export async function createClientWithContract(
  page: Page,
  options: {
    companyName: string;
    rate: string;
    validFrom?: string;
    validTo?: string;
    monthlyContractedHours?: string;
  },
): Promise<string> {
  const clientUrl = await createClient(page, options.companyName);
  await createContract(page, options);
  return clientUrl;
}

/**
 * Records a time entry through the canonical `/time-tracking/new` form.
 * Work date must be set before the contract select populates its options.
 */
export async function createTimeEntry(
  page: Page,
  options: {
    clientName: string;
    hours: string;
    minutes: string;
    description: string;
    billable: boolean;
    workDate?: string;
  },
): Promise<void> {
  const workDate = options.workDate ?? todayValue();

  await page.goto("/time-tracking/new");
  await expect(page).toHaveURL(/\/time-tracking\/new/);

  await page.getByLabel("Work date").fill(workDate);
  await page.getByLabel("Client").selectOption({ label: options.clientName });

  const contractSelect = page.getByLabel("Contract");
  await expect(contractSelect).not.toBeDisabled();
  const contractOptions = contractSelect.locator("option:not([disabled])");
  await expect(contractOptions).toHaveCount(1);
  const contractValue = await contractOptions.first().getAttribute("value");
  await contractSelect.selectOption(contractValue!);

  await page.getByPlaceholder("Hours").fill(options.hours);
  await page.getByPlaceholder("Minutes").fill(options.minutes);
  await page.getByLabel("Description").fill(options.description);

  await page
    .getByRole("radio", {
      name: options.billable ? "Billable" : "Non-billable",
      exact: true,
    })
    .check();

  await page.getByRole("button", { name: "Create Entry" }).click();

  await expect(page).toHaveURL(/\/time-tracking\?date=/);
  await expect(page.getByText(options.description)).toBeVisible();
}
