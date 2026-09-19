// tests/e2e/dashboard-accessibility.spec.ts
import { test, expect, type Page } from "@playwright/test";
import { registerAndCreateFirstWorkspace, uniqueE2EEmail } from "./helpers/first-workspace";
import {
  createClientWithContract,
  createTimeEntry,
} from "./helpers/analytics-fixtures";

async function setupDashboardWithData(page: Page): Promise<void> {
  const email = uniqueE2EEmail("accessibility");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Accessibility Test User",
    workspaceName: "Accessibility Test Workspace",
  });

  await createClientWithContract(page, {
    companyName: "Test Client",
    rate: "100",
    monthlyContractedHours: "80",
  });

  await createTimeEntry(page, {
    clientName: "Test Client",
    hours: "7",
    minutes: "30",
    description: "Development work",
    billable: true,
  });

  await page.goto("/dashboard");
  await expect(page).toHaveURL("/dashboard");
}

async function waitForAnalytics(page: Page): Promise<void> {
  // Wait for dashboard to load with either analytics or empty state
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  await expect(page.getByText(/monthly summary|no time entries/i)).toBeVisible();
}

test.describe("Dashboard Responsive Design", () => {
  test("mobile viewport layout and usability", async ({ page }) => {
    await setupDashboardWithData(page);
    
    // Test iPhone SE dimensions (smallest commonly supported)
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForAnalytics(page);

    // Verify dashboard sections are visible and readable
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Monthly Summary", { exact: true })).toBeVisible();
    await expect(page.getByText("Client Allocation", { exact: true })).toBeVisible();
    await expect(page.getByText("Contract Utilization", { exact: true })).toBeVisible();

    // Verify text is readable (not cut off or overlapping)
    await expect(page.getByText("Test Client").first()).toBeVisible();
    await expect(page.getByLabel("7h 30m total hours tracked")).toBeVisible(); // Total hours display

    const summaryHeading = page.getByRole("heading", {
      level: 2,
      name: "Monthly Summary",
    });
    const clientHeading = page.getByRole("heading", {
      level: 2,
      name: "Client Allocation",
    });
    const summaryBox = await summaryHeading.boundingBox();
    const clientBox = await clientHeading.boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(clientBox).not.toBeNull();
    expect(clientBox!.y).toBeGreaterThan(summaryBox!.y);

    // Verify horizontal scrolling is not needed
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small margin

    // On mobile the sidebar collapses behind a touch-friendly menu trigger
    const menuTrigger = page.getByRole("button", { name: "Open navigation" });
    await expect(menuTrigger).toBeVisible();

    // Navigation opens and exposes touch-friendly links (nav links use min-h-10)
    await menuTrigger.click();
    const mobileNavLink = page
      .getByRole("navigation", { name: "Application" })
      .getByRole("link")
      .first();
    await expect(mobileNavLink).toBeVisible();

    const linkBox = await mobileNavLink.boundingBox();
    expect(linkBox).not.toBeNull();
    expect(linkBox!.height).toBeGreaterThanOrEqual(40);
  });

  test("tablet viewport layout optimization", async ({ page }) => {
    await setupDashboardWithData(page);
    
    // Test iPad dimensions
    await page.setViewportSize({ width: 768, height: 1024 });
    await waitForAnalytics(page);

    // Should use more screen real estate than mobile
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    
    // Sections might be in two-column layout or optimized spacing
    const dashboardMain = page.getByRole("main");
    await expect(dashboardMain).toBeVisible();
    
    // Verify analytics data is clearly displayed
    await expect(page.getByLabel("7h 30m total hours tracked")).toBeVisible();
    await expect(page.getByText("Test Client").first()).toBeVisible();
    
    // Test portrait and landscape orientations
    await page.setViewportSize({ width: 1024, height: 768 }); // Landscape
    await waitForAnalytics(page);
    
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Monthly Summary", { exact: true })).toBeVisible();
  });

  test("desktop viewport full layout", async ({ page }) => {
    await setupDashboardWithData(page);
    
    // Test standard desktop resolution
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForAnalytics(page);

    // Should use full layout with optimal spacing
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    
    // All sections should be clearly visible
    await expect(page.getByText("Monthly Summary", { exact: true })).toBeVisible();
    await expect(page.getByText("Client Allocation", { exact: true })).toBeVisible();
    await expect(page.getByText("Contract Utilization", { exact: true })).toBeVisible();

    // Verify analytics numbers are properly formatted
    await expect(page.getByLabel("7h 30m total hours tracked")).toBeVisible(); // Total hours
    await expect(page.getByText("(100%)").first()).toBeVisible(); // Billable percentage
    
    // Test ultra-wide display
    await page.setViewportSize({ width: 2560, height: 1440 });
    await waitForAnalytics(page);
    
    // Ultra-wide must not introduce horizontal overflow, and content stays readable
    const documentScrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(documentScrollWidth).toBeLessThanOrEqual(2560);

    await expect(page.getByLabel("7h 30m total hours tracked")).toBeVisible();
    await expect(page.getByText("Contract Utilization", { exact: true })).toBeVisible();
  });

  test("text scaling and zoom support", async ({ page }) => {
    await setupDashboardWithData(page);

    // 1280x720 at 200% browser zoom is a 640x360 CSS viewport
    await page.setViewportSize({ width: 640, height: 360 });
    await waitForAnalytics(page);

    await expect(
      page.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Monthly Summary" }),
    ).toBeVisible();
    await expect(page.getByLabel("7h 30m total hours tracked")).toBeVisible();

    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
});

test.describe("Dashboard Accessibility", () => {
  test("semantic HTML structure and headings", async ({ page }) => {
    await setupDashboardWithData(page);
    await waitForAnalytics(page);

    // Verify proper heading hierarchy
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("Dashboard");

    // Should have h2 headings for main sections
    const h2Headings = page.getByRole("heading", { level: 2 });
    await expect(h2Headings).toHaveCount(3); // Monthly Summary, Client Allocation, Contract Utilization
    
    // Verify section headings
    await expect(page.getByRole("heading", { level: 2, name: /monthly summary/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /client allocation/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /contract utilization/i })).toBeVisible();
    const clientAllocationCard = page
      .locator("[data-slot=card]")
      .filter({ has: page.getByRole("heading", { level: 2, name: /client allocation/i }) });
    await expect(
      clientAllocationCard.getByRole("heading", { level: 3, name: "Test Client" }),
    ).toBeVisible();
    await expect(page.getByText("Within contracted capacity")).toBeVisible();

    // Verify main landmark
    const main = page.getByRole("main");
    await expect(main).toBeVisible();

    // Verify navigation landmark
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
  });

  test("keyboard navigation and focus management", async ({ page }) => {
    await setupDashboardWithData(page);
    await waitForAnalytics(page);

    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab');
    
    // First focusable element should be navigation
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON']).toContain(firstFocused);

    // Continue tabbing through navigation
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      
      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }

    // Test Shift+Tab (reverse navigation)
    await page.keyboard.press('Shift+Tab');
    const reverseFocused = page.locator(':focus');
    await expect(reverseFocused).toBeVisible();

    // Test Enter/Space activation on focused links
    await page.getByRole("link", { name: "Time Tracking" }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL("/time-tracking");
    
    // Navigate back to dashboard
    await page.getByRole("link", { name: "Dashboard" }).click();
    await waitForAnalytics(page);
  });

  test("screen reader support and ARIA labels", async ({ page }) => {
    await setupDashboardWithData(page);
    await waitForAnalytics(page);

    // Verify analytics data has meaningful labels
    const totalHours = page.getByLabel("7h 30m total hours tracked");
    await expect(totalHours).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: "Monthly Summary" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("7h 30m billable hours, 100% of total"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Client Allocation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Contract Utilization" }),
    ).toBeVisible();
  });

  test("color independence and contrast", async ({ page }) => {
    await setupDashboardWithData(page);
    await waitForAnalytics(page);

    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });

    await expect(
      page.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: "Test Client" }).first(),
    ).toBeVisible();
    await expect(page.getByLabel("7h 30m total hours tracked")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Monthly Summary" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Test Client contract: 9% utilized"),
    ).toBeVisible();
    await expect(page.getByText("Within contracted capacity")).toBeVisible();
  });

  test("meaningful text alternatives and descriptions", async ({ page }) => {
    await setupDashboardWithData(page);
    await waitForAnalytics(page);

    // Metrics expose descriptive text alternatives rather than bare numbers
    await expect(
      page.getByLabel("7h 30m total hours tracked"),
    ).toBeVisible();
    await expect(
      page.getByLabel("7h 30m billable hours, 100% of total"),
    ).toBeVisible();

    // Client names should be clear
    await expect(page.getByText("Test Client").first()).toBeVisible();

    await expect(
      page.getByLabel("7h 30m consumed of 80h contracted, 9% utilization"),
    ).toBeVisible();
  });

  test("focus indicators and visual accessibility", async ({ page }) => {
    await setupDashboardWithData(page);
    await waitForAnalytics(page);

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toHaveAttribute("href", "#main-content");
    await expect(page.locator("main#main-content")).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    const skipFocusStyles = await skipLink.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow,
      };
    });
    const skipHasFocusIndicator =
      (skipFocusStyles.outlineStyle !== "none" &&
        parseFloat(skipFocusStyles.outlineWidth) > 0) ||
      (skipFocusStyles.boxShadow !== "none" && skipFocusStyles.boxShadow !== "");
    expect(skipHasFocusIndicator).toBe(true);

    await skipLink.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
  });

  test("empty state accessibility", async ({ page }) => {
    const email = uniqueE2EEmail("empty-accessibility");
    
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Empty State User",
      workspaceName: "Empty Accessibility Test",
    });

    await waitForAnalytics(page);

    // Empty state should be accessible
    const emptyMessage = page.getByText(/no time entries/i);
    await expect(emptyMessage).toBeVisible();

    const guidanceText = page.getByText(/create a client, then log time/i);
    await expect(guidanceText).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "No time entries yet" }),
    ).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Dashboard",
    );

    await expect(page.getByRole("link", { name: "New client" })).toBeVisible();
    await expect(guidanceText).toContainText(/time tracking/i);
  });
});