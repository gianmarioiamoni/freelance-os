// tests/e2e/admin.spec.ts
import { expect, test } from "@playwright/test";

import {
  E2E_ADMIN_NAME,
  createManagedUser,
  createWorkspaceForUser,
  registerAndPromoteAdmin,
} from "./helpers/admin";
import {
  registerAndCreateFirstWorkspace,
  uniqueE2EEmail,
} from "./helpers/first-workspace";

test("unauthenticated users cannot access /admin", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/sign-in$/);
});

test("authenticated normal users cannot access /admin", async ({ page }) => {
  const email = uniqueE2EEmail("e2e-normal");
  await registerAndCreateFirstWorkspace(page, {
    email,
    workspaceName: "Test Workspace",
  });

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(/unauthorized admin access/i)).toBeVisible();
});

test("admin route does not require workspace context", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("admin navigation is hidden from normal users", async ({ page }) => {
  const email = uniqueE2EEmail("e2e-normal-nav");
  await registerAndCreateFirstWorkspace(page, {
    email,
    workspaceName: "Test Workspace",
  });

  await expect(page).toHaveURL(/\/dashboard$/);

  const applicationNav = page.getByRole("navigation", { name: "Application" });
  await expect(applicationNav.getByRole("link", { name: "Admin" })).toHaveCount(
    0,
  );
});

test.describe("Admin dashboard", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test("admin can access /admin, see navigation, users, and self-protection", async ({
    page,
  }) => {
    const managed = await createManagedUser({
      name: `Visible Managed ${Date.now()}`,
      email: uniqueE2EEmail("visible-managed"),
    });

    await registerAndPromoteAdmin(page);

    const applicationNav = page.getByRole("navigation", {
      name: "Application",
    });
    await expect(
      applicationNav.getByRole("link", { name: "Admin" }),
    ).toBeVisible();

    await applicationNav.getByRole("link", { name: "Admin" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "User Management" }),
    ).toBeVisible();
    await expect(page.getByText(managed.name)).toBeVisible();
    await expect(page.getByText(managed.email)).toBeVisible();

    const adminRow = page.getByRole("row").filter({ hasText: E2E_ADMIN_NAME });
    await expect(adminRow.getByText("(Admin)")).toBeVisible();
    await expect(adminRow.getByText("Admin (protected)")).toBeVisible();
    await expect(
      adminRow.getByRole("button", { name: "Disable" }),
    ).toHaveCount(0);
    await expect(adminRow.getByRole("button", { name: "Delete" })).toHaveCount(
      0,
    );
  });

  test("admin can disable and enable a user", async ({ page }) => {
    const managed = await createManagedUser({
      name: `Lifecycle User ${Date.now()}`,
      email: uniqueE2EEmail("lifecycle-user"),
    });

    await registerAndPromoteAdmin(page);
    await page.goto("/admin");

    const row = page.getByRole("row").filter({ hasText: managed.name });
    await expect(row.getByText("Active")).toBeVisible();

    await row.getByRole("button", { name: "Disable" }).click();
    const disableDialog = page.getByRole("alertdialog");
    await expect(disableDialog).toBeVisible();
    await expect(
      disableDialog.getByText(/no longer be able to access/i),
    ).toBeVisible();
    await expect(
      disableDialog.getByText(/will NOT be deleted/i),
    ).toBeVisible();
    await disableDialog.getByRole("button", { name: "Disable" }).click();

    await expect(page.getByText("User disabled.")).toBeVisible();
    await expect(row.getByText("Disabled")).toBeVisible();

    await row.getByRole("button", { name: "Enable" }).click();
    const enableDialog = page.getByRole("alertdialog");
    await expect(enableDialog).toBeVisible();
    await enableDialog.getByRole("button", { name: "Enable" }).click();

    await expect(page.getByText("User enabled.")).toBeVisible();
    await expect(row.getByText("Active")).toBeVisible();
  });

  test("admin can preview delete impact and cancel without mutation", async ({
    page,
  }) => {
    const managed = await createManagedUser({
      name: `Impact User ${Date.now()}`,
      email: uniqueE2EEmail("impact-user"),
    });
    const otherOwner = await createManagedUser({
      name: `Other Owner ${Date.now()}`,
      email: uniqueE2EEmail("other-owner"),
    });
    await registerAndPromoteAdmin(page);

    const soleWorkspaceName = `Sole Owner Workspace ${Date.now()}`;
    const sharedWorkspaceName = `Shared Owner Workspace ${Date.now()}`;

    await createWorkspaceForUser({
      userId: managed.id,
      name: soleWorkspaceName,
    });
    await createWorkspaceForUser({
      userId: managed.id,
      name: sharedWorkspaceName,
      sharedOwnerId: otherOwner.id,
    });

    await page.goto("/admin");
    const row = page.getByRole("row").filter({ hasText: managed.name });
    await row.getByRole("button", { name: "Delete" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Workspaces That Will Be Deleted")).toBeVisible();
    await expect(dialog.getByText(soleWorkspaceName)).toBeVisible();
    await expect(
      dialog.getByText("Workspaces That Will Be Preserved"),
    ).toBeVisible();
    await expect(dialog.getByText(sharedWorkspaceName)).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row.getByText("Active")).toBeVisible();
    await expect(row.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("admin can delete a user after confirming sole-owner impact", async ({
    page,
  }) => {
    const managed = await createManagedUser({
      name: `Delete Target ${Date.now()}`,
      email: uniqueE2EEmail("delete-target"),
    });

    const soleWorkspaceName = `Target Sole Workspace ${Date.now()}`;
    await createWorkspaceForUser({
      userId: managed.id,
      name: soleWorkspaceName,
    });

    await registerAndPromoteAdmin(page);
    await page.goto("/admin");

    const row = page.getByRole("row").filter({ hasText: managed.name });
    await row.getByRole("button", { name: "Delete" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(soleWorkspaceName)).toBeVisible();
    await dialog
      .getByLabel(/I understand these workspaces will be permanently deleted/i)
      .check();
    await dialog.getByRole("button", { name: "Delete User" }).click();

    await expect(page.getByText("User deleted.")).toBeVisible();
    const deletedRow = page.getByRole("row").filter({
      hasText: `deleted-user-${managed.id}@deleted.local`,
    });
    await expect(deletedRow.getByText("Deleted User", { exact: true })).toBeVisible();
    await expect(deletedRow.locator('[role="status"]')).toHaveText("Deleted");
  });

  test("admin sees no-workspace delete impact", async ({ page }) => {
    const managed = await createManagedUser({
      name: `No Workspace User ${Date.now()}`,
      email: uniqueE2EEmail("no-workspace-user"),
    });

    await registerAndPromoteAdmin(page);
    await page.goto("/admin");

    const row = page.getByRole("row").filter({ hasText: managed.name });
    await row.getByRole("button", { name: "Delete" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText(/no workspace will be deleted/i),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });
});
