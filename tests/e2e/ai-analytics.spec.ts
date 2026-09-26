// tests/e2e/ai-analytics.spec.ts
import { expect, test, type Page } from "@playwright/test";

import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";

const OVERVIEW_PROMPT = "Come sto andando questo mese?";
const UNAVAILABLE_QUESTION = "Is the provider down?";

async function openWorkspace(page: Page, prefix: string): Promise<void> {
  await registerAndCreateFirstWorkspace(page, {
    email: uniqueE2EEmail(prefix),
    name: "AI UX User",
    workspaceName: "AI UX Workspace",
  });
}

async function expectAskBox(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Ask about your analytics" }),
  ).toBeVisible();
  await expect(page.getByLabel("Question")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask", exact: true })).toBeVisible();
}

test.describe("AI analytics UX", () => {
  test("Dashboard ask-box populates from a Guided Prompt and can submit", async ({
    page,
  }) => {
    await openWorkspace(page, "ai-dashboard");
    await expect(page).toHaveURL("/dashboard");
    await expectAskBox(page);

    await page.getByRole("button", { name: OVERVIEW_PROMPT }).click();
    await expect(page.getByLabel("Question")).toHaveValue(OVERVIEW_PROMPT);
    await expect(page.getByRole("status", { name: "AI answer" })).toHaveCount(0);
    await expect(page.getByText("Asking…")).toHaveCount(0);

    await page.getByRole("button", { name: "Ask", exact: true }).click();
    const answer = page.getByRole("status", { name: "AI answer" });
    await expect(answer).toBeVisible();
    await expect(answer.getByText("hours: 0h", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  });

  test("Dashboard renders unavailable as a first-class AI state", async ({ page }) => {
    await openWorkspace(page, "ai-unavailable");
    await expectAskBox(page);

    await page.getByLabel("Question").fill(UNAVAILABLE_QUESTION);
    await page.getByRole("button", { name: "Ask", exact: true }).click();

    await expect(page.getByText("AI analytics unavailable")).toBeVisible();
    await expect(
      page.getByText(/Dashboard and Reports continue to work/i),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("Reports ask-box populates, submits, and leaves existing reports intact", async ({
    page,
  }) => {
    await openWorkspace(page, "ai-reports");
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole("heading", { level: 1, name: /reports/i })).toBeVisible();
    await expectAskBox(page);
    await expect(page.getByRole("navigation", { name: "Report period" })).toBeVisible();

    await page.getByRole("button", { name: OVERVIEW_PROMPT }).click();
    await expect(page.getByLabel("Question")).toHaveValue(OVERVIEW_PROMPT);

    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByRole("status", { name: "AI answer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();

    await expect(page.getByRole("navigation", { name: "Report period" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: /reports/i })).toBeVisible();
  });
});
