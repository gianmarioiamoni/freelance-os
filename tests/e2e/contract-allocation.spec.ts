// tests/e2e/contract-allocation.spec.ts
import { expect, test } from "@playwright/test";

import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";
import {
  createClient,
  createClientWithContract,
  createTimeEntry,
} from "./helpers/analytics-fixtures";
import { submitAndFollowActionRedirect } from "./helpers/server-action";

const CLIENT_NAME = "Allocation Studio";

test("should create, edit, clear, and zero contract allocation", async ({
  page,
}) => {
  const email = uniqueE2EEmail("e2e-allocation");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Allocation User",
    workspaceName: "Allocation Workspace",
  });

  await createClient(page, CLIENT_NAME);

  await page.goto("/contracts/new");
  await page.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill("80");
  await page.getByLabel("Currency").selectOption("EUR");
  await page.getByLabel("Allocated minutes").fill("-1");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(
    page.getByText("Enter allocation as a whole number of minutes, or leave empty."),
  ).toBeVisible();

  await page.getByLabel("Allocated minutes").fill("1.5");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(
    page.getByText("Enter allocation as a whole number of minutes, or leave empty."),
  ).toBeVisible();

  await page.getByLabel("Allocated minutes").fill("1000");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Create contract" }),
    /\/contracts\/[0-9a-f-]{36}$/,
  );

  await expect(page.getByText("80 EUR")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Time allocation" })).toBeVisible();
  await expect(page.getByText("1000 minutes", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("0 minutes", { exact: true })).toBeVisible();
  await expect(page.getByText("Normal", { exact: true })).toBeVisible();
  await expect(page.getByText("Allocation not configured")).toHaveCount(0);

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByLabel("Allocated minutes")).toHaveValue("1000");
  await page.getByLabel("Allocated minutes").fill("2000");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Save changes" }),
    /\/contracts\/[0-9a-f-]{36}$/,
  );
  await expect(page.getByText("2000 minutes").first()).toBeVisible();
  await expect(page.getByText("Normal", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Allocated minutes").fill("0");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Save changes" }),
    /\/contracts\/[0-9a-f-]{36}$/,
  );
  await expect(page.getByText("0 minutes").first()).toBeVisible();
  await expect(page.getByText("Normal")).toHaveCount(0);
  await expect(page.getByText("Warning")).toHaveCount(0);
  await expect(page.getByText("Exceeded")).toHaveCount(0);

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Allocated minutes").fill("");
  await submitAndFollowActionRedirect(
    page,
    page.getByRole("button", { name: "Save changes" }),
    /\/contracts\/[0-9a-f-]{36}$/,
  );
  await expect(page.getByText("Allocation not configured")).toBeVisible();
  await expect(page.getByText("Normal")).toHaveCount(0);
  await expect(page.getByText("80 EUR")).toBeVisible();
});

test("should show Accrued and current-period Forecast on existing revenue surfaces", async ({
  page,
}) => {
  const email = uniqueE2EEmail("e2e-allocation-revenue");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Revenue User",
    workspaceName: "Revenue Workspace",
  });

  await createClientWithContract(page, {
    companyName: CLIENT_NAME,
    rate: "80",
    allocatedMinutes: "1000",
  });
  await createTimeEntry(page, {
    clientName: CLIENT_NAME,
    hours: "1",
    minutes: "0",
    description: "Allocation revenue",
    billable: true,
  });

  await page.goto("/dashboard");
  await expect(page.getByText("Accrued")).toBeVisible();
  await expect(page.getByText("Forecast")).toBeVisible();
  await expect(page.getByText("80 EUR").first()).toBeVisible();

  await page.goto("/reports");
  const currentRevenue = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Revenue" }),
  });
  await expect(currentRevenue.getByText("Accrued")).toBeVisible();
  await expect(currentRevenue.getByText("Forecast")).toBeVisible();

  await page.goto("/reports?period=custom&start=2026-01-01&end=2026-01-31");
  const historicalRevenue = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Revenue" }),
  });
  await expect(historicalRevenue.getByText("Accrued")).toBeVisible();
  await expect(historicalRevenue.getByText("Forecast")).toHaveCount(0);
});
