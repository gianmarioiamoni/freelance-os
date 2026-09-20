// tests/e2e/time-tracking.spec.ts
import { expect, test } from "@playwright/test";

import { utcTodayYmd } from "../helpers/calendar-date";
import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";

const CLIENT_NAME = "Development Studio";
const CONTRACT_RATE = "75";
const UNKNOWN_TIME_ENTRY_ID = "00000000-0000-4000-8000-000000000099";

// Form default work date is UTC calendar today (`toISOString().split("T")[0]`).
const TODAY = utcTodayYmd();
const TODAY_URL = new RegExp(`/time-tracking\\?date=${TODAY}$`);
const TODAY_DISPLAY = new Date(`${TODAY}T00:00:00.000Z`).toLocaleDateString();

test("should complete authenticated time tracking journey", async ({ page }) => {
  const email = uniqueE2EEmail("e2e-time-tracking");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Time Tracker User",
    workspaceName: "Time Tracking Workspace",
  });

  // Start from time tracking page
  await page.goto("/time-tracking");
  await expect(page).toHaveURL(/\/time-tracking$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Time Tracking" })
  ).toBeVisible();

  // Should show empty state initially
  await expect(
    page.getByText("No time entries for this date.")
  ).toBeVisible();

  // Create client first (prerequisite) - navigate directly to client creation
  await page.goto("/clients/new");
  await expect(page).toHaveURL(/\/clients\/new$/);
  await page.getByLabel("Company name").fill(CLIENT_NAME);
  await page.getByRole("button", { name: "Create client" }).click();
  
  // Should redirect to client detail
  await expect(
    page.getByRole("heading", { level: 1, name: CLIENT_NAME })
  ).toBeVisible();

  // Create contract for the client
  await page.getByRole("link", { name: "New contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/new/);
  
  // Fill contract form
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByLabel("Valid to").fill("2026-12-31");
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill(CONTRACT_RATE);
  await page.getByRole("button", { name: "Create contract" }).click();

  // Should redirect to contract detail page
  await expect(page).toHaveURL(/\/contracts\/[0-9a-f-]{36}$/);
  await expect(page.getByText(`${CONTRACT_RATE} EUR`)).toBeVisible();

  // Navigate back to time tracking
  await page.goto("/time-tracking/new");
  await expect(page).toHaveURL(/\/time-tracking\/new/);

  // Now should be able to create time entry
  await expect(page.getByText("Create a client before")).not.toBeVisible();

  // Create time entry
  await page.goto("/time-tracking/new");
  
  // Fill client (Client and work date both needed for contract options)
  await page.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  
  // Wait for contract select to become enabled and have options
  const contractSelect = page.getByLabel("Contract");
  await expect(contractSelect).not.toBeDisabled();
  
  // Wait for contract options to populate (at least one non-disabled option)
  await expect(contractSelect.locator('option:not([disabled])')).toHaveCount(1, { timeout: 5000 });
  
  // Select the first available contract
  const contractValue = await contractSelect.locator('option:not([disabled])').first().getAttribute('value');
  await contractSelect.selectOption(contractValue!);

  // Work date already filled above for contract selection
  
  // Fill duration (hours and minutes separately)
  await page.getByPlaceholder("Hours").fill("2");
  await page.getByPlaceholder("Minutes").fill("30");
  
  await page.getByLabel("Description").fill("Development work on new features");
  
  // Billable should be checked by default
  await expect(
    page.getByRole("radio", { name: "Billable", exact: true })
  ).toBeChecked();

  // Submit form
  await page.getByRole("button", { name: "Create Entry" }).click();

  // Should redirect to daily view and show the created entry
  await expect(page).toHaveURL(TODAY_URL);
  await expect(
    page.getByRole("heading", { level: 1, name: "Time Tracking" })
  ).toBeVisible();

  // Verify entry appears in the list
  await expect(page.getByText(CLIENT_NAME)).toBeVisible();
  await expect(page.getByText("Development work on new features")).toBeVisible();
  await expect(page.getByText("2h 30m", { exact: true })).toBeVisible();
  await expect(page.getByText(/Hourly · Billable/)).toBeVisible();

  // Verify daily totals are shown
  await expect(page.getByText("Total: 2h 30m")).toBeVisible();
  await expect(page.getByText("Billable: 2h 30m")).toBeVisible();

  // Test editing the entry
  await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
  await page.getByRole("link", { name: "Edit" }).first().click();
  await expect(page).toHaveURL(/\/time-tracking\/[^/]+\/edit$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit Time Entry" })
  ).toBeVisible();

  // Verify immutable fields are not editable
  await expect(page.getByLabel("Client")).not.toBeVisible();
  await expect(page.getByLabel("Contract")).not.toBeVisible();
  await expect(page.getByLabel("Work date")).not.toBeVisible();

  // Verify client and contract are shown as read-only
  await expect(page.locator("#client-readonly")).toHaveText(CLIENT_NAME);
  await expect(page.locator("#contract-readonly")).toContainText("Hourly ·");

  // Edit mutable fields
  await page.getByPlaceholder("Hours").clear();
  await page.getByPlaceholder("Hours").fill("3");
  await page.getByPlaceholder("Minutes").clear();
  await page.getByPlaceholder("Minutes").fill("0");
  await page.getByLabel("Description").clear();
  await page.getByLabel("Description").fill("Updated: Development and testing work");
  await page.getByRole("radio", { name: "Non-billable" }).check();

  // Save changes
  await page.getByRole("button", { name: "Save Changes" }).click();

  // Should redirect back to daily view
  await expect(page).toHaveURL(TODAY_URL);

  // Verify changes are reflected
  await expect(page.getByText("Updated: Development and testing work")).toBeVisible();
  await expect(page.getByText("3h", { exact: true })).toBeVisible();
  await expect(page.getByText(/Hourly · Non-billable/)).toBeVisible();

  // Verify updated totals
  await expect(page.getByText("Total: 3h")).toBeVisible();
  await expect(page.getByText("Billable: 0m")).toBeVisible();

  // Test weekly view
  await page.getByRole("link", { name: "Weekly View" }).click();
  await expect(page).toHaveURL(/\/time-tracking\?view=week/);
  await expect(page.getByText("Weekly timesheet view")).toBeVisible();

  // Entry should appear in weekly view
  await expect(page.getByText(CLIENT_NAME).first()).toBeVisible();
  await expect(page.getByText("Week Total: 3h")).toBeVisible();

  // Test navigation between views
  await page.getByRole("link", { name: "Daily View" }).click();
  await expect(page).toHaveURL(/\/time-tracking\?date=/);

  // Test date navigation
  await page.getByRole("link", { name: "Previous Day" }).click();
  await expect(page.getByText("No time entries for this date.")).toBeVisible();

  await page.getByRole("link", { name: "Next Day" }).click();
  await expect(page.getByText("Updated: Development and testing work")).toBeVisible();

  // Test deletion
  await page.getByRole("link", { name: "Edit" }).first().click();
  await page.getByRole("button", { name: "Delete Entry" }).click();

  // Confirm deletion
  await expect(
    page.getByText("Are you sure you want to permanently delete this time entry?")
  ).toBeVisible();
  await page.getByRole("button", { name: "Yes, Delete Entry" }).click();

  // Should redirect to daily view
  await expect(page).toHaveURL(TODAY_URL);

  // Entry should be gone (hard delete)
  await expect(page.getByText("Updated: Development and testing work")).not.toBeVisible();
  await expect(
    page.getByText("No time entries for this date.")
  ).toBeVisible();
});

test("should verify contract details are presentation-only", async ({ page }) => {
  const email = uniqueE2EEmail("e2e-contract-presentation");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Contract Presenter",
    workspaceName: "Contract Presentation Workspace",
  });

  // Set up client and contract
  await page.goto("/clients/new");
  await page.getByLabel("Company name").fill("Presentation Client");
  await page.getByRole("button", { name: "Create client" }).click();

  await page.getByRole("link", { name: "New contract" }).click();
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByLabel("Valid to").fill("2026-12-31");
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill("100");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/[0-9a-f-]{36}$/);

  await page.goto("/time-tracking/new");
  await expect(page.getByRole("heading", { level: 1, name: "Add Time Entry" })).toBeVisible();
  
  // Select client - contract options should populate automatically
  await page.getByLabel("Client").selectOption({ label: "Presentation Client" });
  
  // Wait for contract select to have options
  const contractSelectElement = page.getByLabel("Contract");
  await expect(contractSelectElement).not.toBeDisabled();
  
  await expect(contractSelectElement.locator('option').filter({ hasText: "Hourly" })).toHaveCount(1, { timeout: 5000 });

  // Verify these are presentation-only (no calculated billing amounts)
  await expect(page.getByText("Revenue")).not.toBeVisible();
  await expect(page.getByText("Invoice")).not.toBeVisible();
  await expect(page.getByText("Total revenue")).not.toBeVisible();
  await expect(page.getByText("Invoice amount")).not.toBeVisible();

  // Complete time entry creation to verify no calculations occur
  const contractSelect = page.getByLabel("Contract");
  await expect(contractSelect.locator('option:not([disabled])')).toHaveCount(1, { timeout: 5000 });
  const contractValue = await contractSelect.locator('option:not([disabled])').first().getAttribute('value');
  await contractSelect.selectOption(contractValue!);
  // Work date already filled above
  await page.getByPlaceholder("Hours").fill("2");
  await page.getByPlaceholder("Minutes").fill("30");
  await page.getByLabel("Description").fill("Test work");
  await page.getByRole("button", { name: "Create Entry" }).click();

  // Verify no financial calculations are displayed in the list
  await expect(page.getByText("€250")).not.toBeVisible(); // No calculated revenue
  await expect(page.getByText("Total revenue")).not.toBeVisible();
  await expect(page.getByText("Invoice amount")).not.toBeVisible();
});

test("should verify quick-add uses normal creation path", async ({ page }) => {
  const email = uniqueE2EEmail("e2e-quick-add");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Quick Add User", 
    workspaceName: "Quick Add Workspace",
  });

  // Set up prerequisites
  await page.goto("/clients/new");
  await page.getByLabel("Company name").fill("Quick Client");
  await page.getByRole("button", { name: "Create client" }).click();

  await page.getByRole("link", { name: "New contract" }).click();
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByLabel("Valid to").fill("2026-12-31");
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill("80");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/[0-9a-f-]{36}$/);

  // Go to weekly view to test quick-add functionality
  await page.goto("/time-tracking?view=week");
  
  // Look for "Add Entry" button in the weekly view
  const addEntryButton = page.getByRole("link", { name: "Add Entry" });
  await expect(addEntryButton).toBeVisible();
  
  // Click the add entry button
  await addEntryButton.click();
  
  // Should navigate to standard creation URL
  await expect(page).toHaveURL(/\/time-tracking\/new/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Add Time Entry" })
  ).toBeVisible();

  // Should use the same form as normal creation
  await expect(page.getByLabel("Client")).toBeVisible();
  await expect(page.getByLabel("Contract")).toBeVisible();
  await expect(page.getByLabel("Work date")).toBeVisible();
  
  await expect(page.getByText("Duration")).toBeVisible();
  await expect(page.getByLabel("Hours")).toBeVisible();
  await expect(page.getByLabel("Minutes")).toBeVisible();
});

test("should enforce workspace isolation in browser", async ({ page }) => {
  // Create first workspace
  const email1 = uniqueE2EEmail("e2e-isolation-1");
  await registerAndCreateFirstWorkspace(page, {
    email: email1,
    name: "User One",
    workspaceName: "Workspace One",
  });

  // Set up client/contract in first workspace
  await page.goto("/clients/new");
  await page.getByLabel("Company name").fill("Isolation Client 1");
  await page.getByRole("button", { name: "Create client" }).click();

  await page.getByRole("link", { name: "New contract" }).click();
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByLabel("Valid to").fill("2026-12-31");
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill("90");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/[0-9a-f-]{36}$/);

  // Create time entry
  await page.goto("/time-tracking/new");
  
  // Select client
  await page.getByLabel("Client").selectOption({ label: "Isolation Client 1" });
  
  // Wait for contract select to become enabled and have options
  const contractSelect = page.getByLabel("Contract");
  await expect(contractSelect).not.toBeDisabled();
  await expect(contractSelect.locator('option:not([disabled])')).toHaveCount(1, { timeout: 5000 });
  
  // Select the first available contract
  const contractValue = await contractSelect.locator('option:not([disabled])').first().getAttribute('value');
  await contractSelect.selectOption(contractValue!);
  
  await page.getByPlaceholder("Hours").fill("1");
  await page.getByPlaceholder("Minutes").fill("30");
  await page.getByLabel("Description").fill("Workspace 1 work");
  await page.getByRole("button", { name: "Create Entry" }).click();

  // Get the entry ID from the URL when editing
  await page.getByRole("link", { name: "Edit" }).first().click();
  await expect(page).toHaveURL(/\/time-tracking\/[0-9a-f-]{36}\/edit$/);
  const entryId = page.url().match(/\/time-tracking\/([^/]+)\/edit/)?.[1];
  expect(entryId).toBeTruthy();

  // Sign out and create second workspace with different user
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");

  const email2 = uniqueE2EEmail("e2e-isolation-2");
  await registerAndCreateFirstWorkspace(page, {
    email: email2,
    name: "User Two",
    workspaceName: "Workspace Two", 
  });

  // Attempt to access first workspace's time entry directly
  await page.goto(`/time-tracking/${entryId}/edit`);

  // Foreign resource must fail safely: rendered as not found, no leakage
  await expect(page.getByText("Page not found")).toBeVisible();

  // Should not see the content from workspace 1
  await expect(page.getByText("Workspace 1 work")).not.toBeVisible();
  await expect(page.getByText("Isolation Client 1")).not.toBeVisible();

  // Verify workspace 2 user cannot see workspace 1 data in normal flow
  await page.goto("/time-tracking");
  await expect(page.getByText("Workspace 1 work")).not.toBeVisible();
  await expect(page.getByText("Isolation Client 1")).not.toBeVisible();
});

test("should handle unknown time entry IDs gracefully", async ({ page }) => {
  const email = uniqueE2EEmail("e2e-unknown-id");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Unknown ID User",
    workspaceName: "Unknown ID Workspace",
  });

  // Attempt to access unknown time entry
  await page.goto(`/time-tracking/${UNKNOWN_TIME_ENTRY_ID}/edit`);

  // Should show 404 page (custom not-found page)
  await expect(page.getByText("Page not found")).toBeVisible();
  
  // Should handle gracefully (not reveal "exists in another workspace")
  await expect(page.getByText("exists in another workspace")).not.toBeVisible();
  await expect(page.getByText("foreign workspace")).not.toBeVisible();
});

test("should maintain immutability constraints in edit form", async ({ page }) => {
  const email = uniqueE2EEmail("e2e-immutability");

  await registerAndCreateFirstWorkspace(page, {
    email,
    name: "Immutability User",
    workspaceName: "Immutability Workspace",
  });

  // Set up prerequisites and create entry
  await page.goto("/clients/new");
  await page.getByLabel("Company name").fill("Immutable Client");
  await page.getByRole("button", { name: "Create client" }).click();

  await page.getByRole("link", { name: "New contract" }).click();
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByLabel("Valid to").fill("2026-12-31");
  await page.getByLabel("Billing model").selectOption("HOURLY");
  await page.getByLabel("Rate").fill("95");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(page).toHaveURL(/\/contracts\/[0-9a-f-]{36}$/);

  // Create time entry
  await page.goto("/time-tracking/new");
  
  // Select client
  await page.getByLabel("Client").selectOption({ label: "Immutable Client" });
  
  // Wait for contract select to become enabled and have options
  const contractSelect = page.getByLabel("Contract");
  await expect(contractSelect).not.toBeDisabled();
  await expect(contractSelect.locator('option:not([disabled])')).toHaveCount(1, { timeout: 5000 });
  
  // Select the first available contract
  const contractValue = await contractSelect.locator('option:not([disabled])').first().getAttribute('value');
  await contractSelect.selectOption(contractValue!);
  
  await page.getByPlaceholder("Hours").fill("4");
  await page.getByPlaceholder("Minutes").fill("0");
  await page.getByLabel("Description").fill("Original description");
  await page.getByRole("button", { name: "Create Entry" }).click();

  // Edit the entry  
  await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
  await page.getByRole("link", { name: "Edit" }).first().click();

  // Verify immutable fields are not present as editable inputs
  await expect(page.locator('select[name="clientId"]')).not.toBeVisible();
  await expect(page.locator('select[name="contractId"]')).not.toBeVisible();
  await expect(page.locator('input[name="workDate"]')).not.toBeVisible();

  // Verify they are shown as read-only display
  await expect(page.locator("#client-readonly")).toHaveText("Immutable Client");
  await expect(page.locator("#contract-readonly")).toContainText("Hourly ·");
  await expect(page.locator("#workDate")).toHaveText(TODAY_DISPLAY);

  // Verify mutable fields are editable
  await expect(page.getByPlaceholder("Hours")).toBeVisible();
  await expect(page.getByPlaceholder("Minutes")).toBeVisible();
  await expect(page.getByLabel("Description")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Billable", exact: true })
  ).toBeVisible();

  // Verify current values are populated
  await expect(page.getByPlaceholder("Hours")).toHaveValue("4");
  await expect(page.getByPlaceholder("Minutes")).toHaveValue("0");
  await expect(page.getByLabel("Description")).toHaveValue("Original description");
  await expect(
    page.getByRole("radio", { name: "Billable", exact: true })
  ).toBeChecked();

  // Test that form submission only updates mutable fields
  await page.getByPlaceholder("Hours").fill("5");
  await page.getByPlaceholder("Minutes").fill("30");
  await page.getByLabel("Description").clear();
  await page.getByLabel("Description").fill("Modified description");
  await page.getByRole("radio", { name: "Non-billable" }).check();

  await page.getByRole("button", { name: "Save Changes" }).click();

  // Verify changes took effect but immutable fields remained unchanged
  await expect(page.getByText("Modified description")).toBeVisible();
  await expect(page.getByText("5h 30m", { exact: true })).toBeVisible();
  await expect(page.getByText(/Hourly · Non-billable/)).toBeVisible();

  // Immutable associations should remain the same
  await expect(page.getByText("Immutable Client", { exact: true })).toBeVisible();
});