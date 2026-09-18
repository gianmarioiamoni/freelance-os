// tests/e2e/dashboard.spec.ts
import { test, expect, type Page } from "@playwright/test";
import { registerAndCreateFirstWorkspace, uniqueE2EEmail } from "./helpers/first-workspace";

import {
  createClientWithContract,
  createTimeEntry,
} from "./helpers/analytics-fixtures";

// Helper function to wait for analytics to load
async function waitForAnalyticsDisplay(page: Page): Promise<void> {
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  await expect(
    page.getByText(/monthly summary|no time entries/i),
  ).toBeVisible();
}

// Creates 8h billable + 2h non-billable against an 80h contract for ACME Corp
async function createTestTimeEntries(page: Page): Promise<void> {
  await createClientWithContract(page, {
    companyName: "ACME Corp",
    rate: "100",
    monthlyContractedHours: "80",
  });

  await createTimeEntry(page, {
    clientName: "ACME Corp",
    hours: "8",
    minutes: "0",
    description: "Development work",
    billable: true,
  });

  await createTimeEntry(page, {
    clientName: "ACME Corp",
    hours: "2",
    minutes: "0",
    description: "Team meetings",
    billable: false,
  });
}

test.describe("Dashboard Analytics E2E Journey", () => {
  test("complete authenticated dashboard journey with analytics", async ({ page }) => {
    const email = uniqueE2EEmail("dashboard-journey");
    
    // 1. Authenticate and create workspace
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Dashboard Test User",
      workspaceName: "Analytics Test Workspace",
    });
    
    // 2. Verify we land on dashboard (should be default route)
    await expect(page).toHaveURL("/");
    await waitForAnalyticsDisplay(page);

    // 3. Verify current-month default period is reflected in the page title
    const now = new Date();
    const currentPeriodLabel = now.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      `Dashboard - ${currentPeriodLabel}`,
    );

    // 4. Verify empty state for new workspace
    await expect(page.getByText(/no time entries/i)).toBeVisible();

    // 5. Create test data for analytics verification
    await createTestTimeEntries(page);

    // 6. Navigate back to dashboard
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL("/");
    await waitForAnalyticsDisplay(page);

    // 7. Verify summary metrics display
    await expect(page.getByText("Monthly Summary", { exact: true })).toBeVisible();

    // Total 8h + 2h = 10h, of which 8h billable (80%)
    await expect(page.getByLabel("10h total hours tracked")).toBeVisible();
    await expect(
      page.getByLabel("8h billable hours, 80% of total"),
    ).toBeVisible();

    // 8. Verify Client allocation section (single client holds 100% of time)
    await expect(page.getByText("Client Allocation", { exact: true })).toBeVisible();
    await expect(page.getByText("ACME Corp").first()).toBeVisible();
    await expect(
      page.getByLabel("ACME Corp: 100% of total time"),
    ).toBeVisible();

    // 9. Verify Contract utilization (10h of 80h contracted, rounded to 13%)
    await expect(page.getByText("Contract Utilization", { exact: true })).toBeVisible();
    await expect(
      page.getByLabel("10h consumed of 80h contracted, 13% utilization"),
    ).toBeVisible();

    // 10. Verify responsive layout works
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await waitForAnalyticsDisplay(page);
    
    // Analytics should still be visible and readable
    await expect(page.getByText("Monthly Summary", { exact: true })).toBeVisible();
    await expect(page.getByText("ACME Corp").first()).toBeVisible();
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    // 11. Test keyboard navigation: skip link is first in tab order and works
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(skipLink).not.toBeFocused();

    // Navigation links are keyboard focusable
    const firstNavLink = page
      .getByRole("navigation", { name: "Application" })
      .getByRole("link")
      .first();
    await firstNavLink.focus();
    await expect(firstNavLink).toBeFocused();

    // 12. Verify semantic structure
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Dashboard",
    );

    // Each analytics section must expose an accessible section heading
    await expect(
      page.getByRole("heading", { name: "Monthly Summary" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Client Allocation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Contract Utilization" }),
    ).toBeVisible();

    // 13. Test sign-out behavior
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    
    // Verify cannot access dashboard without authentication
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("archived client behavior in analytics", async ({ page }) => {
    const email = uniqueE2EEmail("archived-client");
    
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Archived Test User",
      workspaceName: "Archived Client Test",
    });

    const clientUrl = await createClientWithContract(page, {
      companyName: "Beta Ltd",
      rate: "120",
      monthlyContractedHours: "60",
    });

    await createTimeEntry(page, {
      clientName: "Beta Ltd",
      hours: "6",
      minutes: "0",
      description: "Project work",
      billable: true,
    });

    // Archive the client from its detail page
    await page.goto(clientUrl);
    await page.getByRole("link", { name: "Archive", exact: true }).click();
    await expect(page.getByText("Archive this client?")).toBeVisible();
    await page.getByRole("button", { name: "Confirm archive" }).click();
    await expect(
      page.getByText("Archived", { exact: true }).first(),
    ).toBeVisible();

    // PD-104-001: archived client time remains included in analytics
    await page.goto("/");
    await waitForAnalyticsDisplay(page);

    await expect(page.getByLabel("6h total hours tracked")).toBeVisible();
    await expect(
      page.getByLabel("6h total hours for Beta Ltd"),
    ).toBeVisible();
    await expect(
      page.getByLabel("Beta Ltd: 100% of total time"),
    ).toBeVisible();

    // Allocation must flag the client as archived
    await expect(
      page.getByText("Archived", { exact: true }).first(),
    ).toBeVisible();
  });

  test("contract utilization ongoing vs finite display", async ({ page }) => {
    const email = uniqueE2EEmail("contract-types");
    
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Contract Test User",
      workspaceName: "Contract Types Test",
    });

    const endOfYear = new Date(new Date().getFullYear(), 11, 31)
      .toISOString()
      .split("T")[0];

    // Client with a capped contract (40h/month)
    await createClientWithContract(page, {
      companyName: "Finite Corp",
      rate: "100",
      validTo: endOfYear,
      monthlyContractedHours: "40",
    });

    // Client with an uncapped contract (no monthly contracted hours)
    await createClientWithContract(page, {
      companyName: "Unlimited Inc",
      rate: "150",
    });

    await createTimeEntry(page, {
      clientName: "Finite Corp",
      hours: "5",
      minutes: "0",
      description: "Finite contract work",
      billable: true,
    });

    await createTimeEntry(page, {
      clientName: "Unlimited Inc",
      hours: "8",
      minutes: "0",
      description: "Unlimited contract work",
      billable: true,
    });

    await page.goto("/");
    await waitForAnalyticsDisplay(page);
    await expect(page.getByText("Contract Utilization", { exact: true })).toBeVisible();

    // Capped contract reports a percentage (5h of 40h => 13% rounded)
    await expect(
      page.getByLabel("5h consumed of 40h contracted, 13% utilization"),
    ).toBeVisible();

    // PD-104-004: uncapped contract reports consumed hours without a denominator
    await expect(
      page.getByLabel("8h consumed, unlimited capacity"),
    ).toBeVisible();
    await expect(page.getByText("Ongoing")).toBeVisible();
  });

  test("empty period handling and error recovery", async ({ page }) => {
    const email = uniqueE2EEmail("empty-states");
    
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Empty State User",
      workspaceName: "Empty State Test",
    });

    // Verify empty workspace shows appropriate message and guidance
    await waitForAnalyticsDisplay(page);
    await expect(page.getByText("No time entries yet")).toBeVisible();
    await expect(
      page.getByText(/create a client, then log time/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "New client" })).toBeVisible();

    // Test recovery by navigating away and back
    await page.getByRole("link", { name: "Time Tracking" }).click();
    await expect(page).toHaveURL(/\/time-tracking/);

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL("/");
    
    // Should still load properly
    await waitForAnalyticsDisplay(page);
    await expect(page.getByText(/no time entries/i)).toBeVisible();
  });

  test("performance and loading behavior", async ({ page }) => {
    const email = uniqueE2EEmail("performance");
    
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Performance User",
      workspaceName: "Performance Test",
    });

    // Collect runtime errors from the start of the measured navigation
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const startTime = Date.now();
    await page.goto("/");
    await waitForAnalyticsDisplay(page);
    const loadTime = Date.now() - startTime;

    // Empty dashboard should render well within the test budget
    expect(loadTime).toBeLessThan(10000);

    await page.reload();
    await waitForAnalyticsDisplay(page);
    expect(errors).toHaveLength(0);

    // Repeated navigation must not break analytics rendering
    for (let i = 0; i < 3; i++) {
      await page.getByRole("link", { name: "Time Tracking" }).click();
      await expect(page).toHaveURL(/\/time-tracking/);
      await page.getByRole("link", { name: "Dashboard" }).click();
      await expect(page).toHaveURL("/");
      await waitForAnalyticsDisplay(page);
    }

    // Dashboard remains functional (this workspace has no entries)
    await expect(page.getByText("No time entries yet")).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});