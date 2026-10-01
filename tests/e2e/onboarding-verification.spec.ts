// tests/e2e/onboarding-verification.spec.ts
// Reproduction test for Phase 1C: Clean Onboarding Verification
import { expect, test } from "@playwright/test";

function uniqueEmail(): string {
  return `verify-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

test("Phase 1C: Complete onboarding verification with unique workspace name", async ({
  page,
}) => {
  const email = uniqueEmail();
  const workspaceName = `Onboarding Verification ${Date.now()}`;
  
  // Step 1: Sign up
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Verification User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ValidPass1!");
  await page.getByRole("button", { name: "Create account" }).click();

  // Step 2: Verify redirect to onboarding
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();

  // Step 3: Verify workspace name input has no default value
  const workspaceInput = page.getByLabel("Workspace name");
  await expect(workspaceInput).toBeVisible();
  await expect(workspaceInput).toHaveValue("");

  // Step 4: Fill unique workspace name
  await workspaceInput.fill(workspaceName);
  await page.getByLabel("Timezone").selectOption("Europe/Rome");
  await page.getByLabel("Currency").selectOption("EUR");

  // Step 5: Create workspace
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL("/dashboard");

  // Step 6: Verify workspace name in UI
  await expect(page.getByText(workspaceName)).toBeVisible();

  // Step 7: Verify no "Test WS" appears
  await expect(page.getByText("Test WS")).not.toBeVisible();

  // Step 8: Check Settings page
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL("/settings");
  await expect(page.getByText(workspaceName).first()).toBeVisible();

  // Step 9: Check Clients page (should be empty)
  await page.getByRole("link", { name: "Clients" }).click();
  await expect(page).toHaveURL("/clients");
  
  // Verify no "Test 1" client
  await expect(page.getByText("Test 1")).not.toBeVisible();
  
  // Should see empty state
  await expect(
    page.getByRole("heading", { name: "No active clients" }),
  ).toBeVisible();

  // Step 10: Reload and verify workspace persists
  await page.reload();
  await expect(page.getByText(workspaceName)).toBeVisible();

  // Step 11: Sign out and sign back in
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ValidPass1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Step 12: Verify workspace is restored
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByText(workspaceName)).toBeVisible();

  // Step 13: Final verification - no unexpected data
  await page.getByRole("link", { name: "Clients" }).click();
  await expect(page.getByText("Test 1")).not.toBeVisible();
  await expect(page.getByText("Test WS")).not.toBeVisible();
});
