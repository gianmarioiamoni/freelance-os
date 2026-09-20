// tests/e2e/time-entry-contract-eligibility.spec.ts
import { expect, test } from "@playwright/test";

import { addUtcDays, utcTodayYmd } from "../helpers/calendar-date";
import { createClient, createContract } from "./helpers/analytics-fixtures";
import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";

test("contract options follow the live work date after client selection", async ({
  page,
}) => {
  const today = utcTodayYmd();
  const validFrom = addUtcDays(today, 7);
  const email = uniqueE2EEmail("e2e-contract-eligibility");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Eligibility User",
    workspaceName: "Eligibility Workspace",
  });

  await createClient(page, "Future Client");
  await createContract(page, {
    rate: "80",
    validFrom,
  });

  await page.goto("/time-tracking/new");
  await expect(page).toHaveURL(/\/time-tracking\/new/);

  await page.getByLabel("Client").selectOption({ label: "Future Client" });

  const contractOptions = page.locator("#contractId option:not([value=''])");
  await expect(page.getByLabel("Work date")).toHaveValue(today);
  await expect(contractOptions).toHaveCount(0);

  await page.getByLabel("Work date").fill(validFrom);
  await expect(contractOptions).toHaveCount(1);

  await page.getByLabel("Work date").fill(today);
  await expect(contractOptions).toHaveCount(0);
});
