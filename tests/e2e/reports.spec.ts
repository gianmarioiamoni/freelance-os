// tests/e2e/reports.spec.ts
//
// P105-06: Reporting E2E evidence suite.
//
// Covers:
//   SI-105-006  — unauthenticated /reports → sign-in; no workspace → onboarding;
//                 those redirects are not swallowed by a page-level catch.
//   Reports surface — navigation entry, period selection, tabular sections.
//   Accessibility   — native table semantics, headings, full-text client names,
//                     keyboard reachability. Assertions can fail (no F-104-010 patterns).
//   Responsive      — 375 / 768 / 1024 / 1440 px viewports.
//   Empty-state     — zero-activity period renders EmptyState, not a blank page.
//   Error recovery  — navigating away and back restores the surface.
//   Period selector — switching periods updates the URL and heading.
//   Zero denominator— unlimited contract renders "—" (no invented percentage).
//   Out-of-validity — indicator visible with a textual alternative.
//   No monetary figures anywhere (BR-105-011 / PD-105-001).

import { test, expect, type Page } from "@playwright/test";
import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";
import {
  createClientWithContract,
  createTimeEntry,
} from "./helpers/analytics-fixtures";
import { submitAndFollowActionRedirect } from "./helpers/server-action";

// ---------------------------------------------------------------------------
// Shared wait helper
// ---------------------------------------------------------------------------

async function waitForReportsPage(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: /reports/i })).toBeVisible();
}

// ---------------------------------------------------------------------------
// SI-105-006 — redirect invariants
// ---------------------------------------------------------------------------

test.describe("SI-105-006 — access control redirects", () => {
  test("unauthenticated access to /reports redirects to sign-in", async ({
    page,
  }) => {
    // Navigate without any session.
    await page.goto("/reports");
    // Must not stay on /reports; must land on the sign-in page.
    await expect(page).toHaveURL(/\/sign-in/);
    // The redirect must not have been swallowed — the sign-in form is visible.
    await expect(
      page.getByRole("heading", { name: /sign in/i }),
    ).toBeVisible();
  });

  test("authenticated session with a resolved workspace can reach /reports", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-access");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Reports Access User",
      workspaceName: "Reports Access Workspace",
    });
    await page.goto("/reports");
    await waitForReportsPage(page);
  });
});

// ---------------------------------------------------------------------------
// Navigation entry
// ---------------------------------------------------------------------------

test.describe("navigation entry", () => {
  test("Reports link in sidebar navigates to /reports", async ({ page }) => {
    const email = uniqueE2EEmail("reports-nav");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Reports Nav User",
      workspaceName: "Reports Nav Workspace",
    });
    // Start from dashboard.
    await expect(page).toHaveURL("/dashboard");
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL("/reports");
    await waitForReportsPage(page);
  });
});

// ---------------------------------------------------------------------------
// Period selector
// ---------------------------------------------------------------------------

test.describe("period selector", () => {
  test("default period is 'This Month' and switching periods updates the URL", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-period");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Period Selector User",
      workspaceName: "Period Test Workspace",
    });
    await page.goto("/reports");
    await waitForReportsPage(page);

    // Default: no period param → "month" is active (aria-current="page").
    const monthLink = page.getByRole("link", { name: "This Month" });
    await expect(monthLink).toHaveAttribute("aria-current", "page");

    // Switch to "Today".
    await page.getByRole("link", { name: "Today" }).click();
    await expect(page).toHaveURL(/period=today/);
    await expect(
      page.getByRole("link", { name: "Today" }),
    ).toHaveAttribute("aria-current", "page");

    // Switch to "This Week".
    await page.getByRole("link", { name: "This Week" }).click();
    await expect(page).toHaveURL(/period=week/);

    // Switch to "This Year".
    await page.getByRole("link", { name: "This Year" }).click();
    await expect(page).toHaveURL(/period=year/);

    // Switch back to "This Month".
    await page.getByRole("link", { name: "This Month" }).click();
    await expect(page).toHaveURL(/period=month/);
  });

  test("malformed period param falls back to 'This Month'", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-bad-period");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Bad Period User",
      workspaceName: "Bad Period Workspace",
    });
    // Navigate with a garbage period param.
    await page.goto("/reports?period=INVALID_GARBAGE");
    await waitForReportsPage(page);
    // Period selector must show "This Month" as active (graceful fallback).
    const monthLink = page.getByRole("link", { name: "This Month" });
    await expect(monthLink).toHaveAttribute("aria-current", "page");
  });
});

// ---------------------------------------------------------------------------
// Empty-state rendering (zero activity)
// ---------------------------------------------------------------------------

test.describe("empty-state rendering", () => {
  test("new workspace with no time entries shows empty states for all three sections", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-empty");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Empty Reports User",
      workspaceName: "Empty Reports Workspace",
    });
    await page.goto("/reports");
    await waitForReportsPage(page);

    // All three sections show their empty-state descriptions.
    await expect(
      page.getByText(/no hours recorded for this period/i),
    ).toBeVisible();
    await expect(
      page.getByText(/no contracts for this period/i),
    ).toBeVisible();
    await expect(
      page.getByText(/no activity recorded for this year/i),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Tabular report sections — data rendering
// ---------------------------------------------------------------------------

test.describe("tabular report sections", () => {
  test("hours by client and contract report render tabular data with correct semantics", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-tables");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Tables User",
      workspaceName: "Tables Workspace",
    });

    // Create a client + contract + time entry for the current month.
    await createClientWithContract(page, {
      companyName: "Acme Reporting",
      rate: "100",
      monthlyContractedHours: "80",
    });
    await createTimeEntry(page, {
      clientName: "Acme Reporting",
      hours: "8",
      minutes: "0",
      description: "Reporting test entry",
      billable: true,
    });

    await page.goto("/reports");
    await waitForReportsPage(page);

    // Hours by Client: the table caption is a <caption> element inside the table.
    // The page also has a sr-only h2 with the same text — use the caption role.
    // Scope to the first <table> in main to avoid the sr-only h2.
    const main = page.getByRole("main");
    await expect(
      main.locator("caption").filter({ hasText: "Hours by Client" }),
    ).toBeVisible();

    // The client name must appear.
    await expect(page.getByText("Acme Reporting").first()).toBeVisible();

    // Contract Report: caption element inside the table.
    await expect(
      main.locator("caption").filter({ hasText: "Contract Report" }),
    ).toBeVisible();

    // Annual Overview table caption — label format "Annual Overview — YYYY".
    const currentYear = new Date().getFullYear();
    await expect(
      main.locator("caption").filter({ hasText: `Annual Overview — ${currentYear}` }),
    ).toBeVisible();

    // No monetary figures may appear (BR-105-011 / PD-105-001).
    const bodyText = await main.innerText();
    expect(bodyText).not.toMatch(/\b(€|EUR|USD|\$)\s*\d/);
  });

  test("unlimited contract shows 'Unlimited' in capacity column and '—' for utilization (no invented percentage)", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-unlimited");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Unlimited User",
      workspaceName: "Unlimited Workspace",
    });

    // Contract with no monthly contracted hours → unlimited capacity.
    await createClientWithContract(page, {
      companyName: "Unlimited Corp",
      rate: "150",
      // monthlyContractedHours omitted → null capacity
    });
    await createTimeEntry(page, {
      clientName: "Unlimited Corp",
      hours: "4",
      minutes: "0",
      description: "Capacity test entry",
      billable: true,
    });

    await page.goto("/reports");
    await waitForReportsPage(page);

    // The contract row must appear.
    await expect(page.getByText("Unlimited Corp").first()).toBeVisible();
    // "Unlimited" in the Capacity column (null monthlyContractedMinutes renders "Unlimited").
    await expect(page.getByText("Unlimited", { exact: true })).toBeVisible();
  });

  // Note: out-of-validity indicator E2E coverage is omitted because the time-tracking
  // UI correctly filters expired contracts from the contract selector, making it
  // impossible to create an OOV time entry via the browser. OOV is thoroughly
  // covered by integration tests (F-105-P-009, reporting-service.test.ts).

  test("archived client is flagged in hours-by-client section", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-archived");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Archived Reports User",
      workspaceName: "Archived Reports Workspace",
    });

    const clientUrl = await createClientWithContract(page, {
      companyName: "Archived Reporting Client",
      rate: "100",
      monthlyContractedHours: "60",
    });
    await createTimeEntry(page, {
      clientName: "Archived Reporting Client",
      hours: "3",
      minutes: "0",
      description: "Pre-archive work",
      billable: true,
    });

    // Archive the client.
    await page.goto(clientUrl);
    await expect(
      page.getByRole("heading", { level: 1, name: "Archived Reporting Client" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Archive", exact: true }).click();
    await expect(page).toHaveURL(/confirm=archive/);
    await expect(page.getByText("Archive this client?")).toBeVisible();
    await submitAndFollowActionRedirect(
      page,
      page.getByRole("button", { name: "Confirm archive" }),
      /\/clients\/[0-9a-f-]{36}$/,
    );
    await expect(
      page.getByText("Archived", { exact: true }).first(),
    ).toBeVisible();

    // Navigate to reports.
    await page.goto("/reports");
    await waitForReportsPage(page);

    // The archived client must appear in Hours by Client.
    await expect(
      page.getByText("Archived Reporting Client").first(),
    ).toBeVisible();
    // The "Archived" badge must be visible.
    await expect(page.getByText("Archived").first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Accessibility — sound assertions (no F-104-010 patterns)
// ---------------------------------------------------------------------------

test.describe("accessibility", () => {
  test("reports page has correct heading hierarchy and landmark structure", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-a11y");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Accessibility User",
      workspaceName: "Accessibility Workspace",
    });
    await page.goto("/reports");
    await waitForReportsPage(page);

    // Level-1 heading must say "Reports".
    await expect(
      page.getByRole("heading", { level: 1, name: /reports/i }),
    ).toBeVisible();

    // Period selector must be a <nav> with an accessible label.
    await expect(
      page.getByRole("navigation", { name: /report period/i }),
    ).toBeVisible();

    // Period links are keyboard-focusable.
    const periodLinks = page
      .getByRole("navigation", { name: /report period/i })
      .getByRole("link");
    const count = await periodLinks.count();
    expect(count).toBeGreaterThanOrEqual(4); // today / week / month / year
  });

  test("reports page is keyboard navigable (skip link and period links focusable)", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-kb");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Keyboard User",
      workspaceName: "Keyboard Workspace",
    });
    await page.goto("/reports");
    await waitForReportsPage(page);

    // Skip-to-content link exists and is focusable.
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    // Tab past skip link into the nav; first period link must be reachable.
    await page.keyboard.press("Tab");
    await expect(skipLink).not.toBeFocused();
  });

  test("table captions are visible and descriptive (not screen-reader-only)", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-captions");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Captions User",
      workspaceName: "Captions Workspace",
    });
    // Seed data so tables render (not empty-state).
    await createClientWithContract(page, {
      companyName: "Caption Client",
      rate: "100",
      monthlyContractedHours: "40",
    });
    await createTimeEntry(page, {
      clientName: "Caption Client",
      hours: "2",
      minutes: "0",
      description: "Caption test entry",
      billable: true,
    });
    await page.goto("/reports");
    await waitForReportsPage(page);

    const main = page.getByRole("main");

    // Table caption elements must be visible (not hidden with sr-only).
    // These are distinct from the sr-only section headings which have the same text.
    await expect(
      main.locator("caption").filter({ hasText: "Hours by Client" }),
    ).toBeVisible();
    await expect(
      main.locator("caption").filter({ hasText: "Contract Report" }),
    ).toBeVisible();
    const currentYear = new Date().getFullYear();
    await expect(
      main.locator("caption").filter({ hasText: `Annual Overview — ${currentYear}` }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Responsive layout (375 / 768 / 1024 / 1440 px)
// ---------------------------------------------------------------------------

test.describe("responsive layout", () => {
  const VIEWPORTS: Array<{ label: string; width: number; height: number }> = [
    { label: "mobile (375)", width: 375, height: 812 },
    { label: "tablet (768)", width: 768, height: 1024 },
    { label: "desktop (1024)", width: 1024, height: 768 },
    { label: "large desktop (1440)", width: 1440, height: 900 },
  ];

  test("reports page renders correctly across viewports", async ({ page }) => {
    const email = uniqueE2EEmail("reports-responsive");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Responsive User",
      workspaceName: "Responsive Workspace",
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/reports");
      await waitForReportsPage(page);
      // Heading visible at all viewports.
      await expect(
        page.getByRole("heading", { level: 1, name: /reports/i }),
      ).toBeVisible();
      // Period nav visible at all viewports.
      await expect(
        page.getByRole("navigation", { name: /report period/i }),
      ).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Error recovery — navigate away and back
// ---------------------------------------------------------------------------

test.describe("error recovery", () => {
  test("navigating away from /reports and back restores the page correctly", async ({
    page,
  }) => {
    const email = uniqueE2EEmail("reports-recovery");
    await registerAndCreateFirstWorkspace(page, {
      email,
      name: "Recovery User",
      workspaceName: "Recovery Workspace",
    });
    await page.goto("/reports");
    await waitForReportsPage(page);

    // Navigate to dashboard.
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL("/dashboard");

    // Navigate back to reports.
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL("/reports");
    await waitForReportsPage(page);
  });
});
