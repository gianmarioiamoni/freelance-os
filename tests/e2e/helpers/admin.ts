// tests/e2e/helpers/admin.ts
import { PrismaClient } from "@prisma/client";
import { expect, type Page } from "@playwright/test";

import { requireTestDatabaseUrl } from "../../integration/test-database-url";
import { createFirstWorkspace, registerUser } from "./first-workspace";
import {
  E2E_ADMIN_GOOGLE_EMAIL,
  E2E_ADMIN_NAME,
  E2E_ADMIN_PASSWORD,
} from "./admin-env";

export {
  E2E_ADMIN_GOOGLE_EMAIL,
  E2E_ADMIN_NAME,
  E2E_ADMIN_PASSWORD,
} from "./admin-env";

function createPrisma(): PrismaClient {
  return new PrismaClient({
    datasourceUrl: requireTestDatabaseUrl(),
  });
}

export async function findUserByEmail(email: string): Promise<{
  id: string;
  name: string;
  email: string;
  disabledAt: Date | null;
  deletedAt: Date | null;
} | null> {
  const prisma = createPrisma();

  try {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        disabledAt: true,
        deletedAt: true,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function attachGoogleAccount(userId: string): Promise<void> {
  const prisma = createPrisma();

  try {
    const existing = await prisma.account.findFirst({
      where: { userId, providerId: "google" },
    });

    if (existing) {
      return;
    }

    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: `google-${userId}`,
        providerId: "google",
        userId,
        accessToken: "e2e-access-token",
        idToken: "e2e-id-token",
        scope: "openid email profile",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function createManagedUser(input: {
  name: string;
  email: string;
}): Promise<{ id: string; email: string; name: string }> {
  const prisma = createPrisma();

  try {
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name,
        email: input.email,
      },
    });

    return { id: user.id, email: user.email, name: user.name };
  } finally {
    await prisma.$disconnect();
  }
}

export async function createWorkspaceForUser(input: {
  userId: string;
  name: string;
  sharedOwnerId?: string;
}): Promise<void> {
  const prisma = createPrisma();

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name: input.name,
        timezone: "UTC",
        currency: "EUR",
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: input.userId,
        role: "OWNER",
      },
    });

    if (input.sharedOwnerId) {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: input.sharedOwnerId,
          role: "OWNER",
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

export async function signInUser(
  page: Page,
  email: string,
  password: string = E2E_ADMIN_PASSWORD,
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function ensureSingleAdminWorkspace(userId: string): Promise<void> {
  const prisma = createPrisma();

  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    if (memberships.length <= 1) {
      return;
    }

    await prisma.workspaceMember.deleteMany({
      where: {
        userId,
        workspaceId: {
          in: memberships.slice(1).map((membership) => membership.workspaceId),
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function registerAndPromoteAdmin(
  page: Page,
): Promise<{ userId: string }> {
  const existing = await findUserByEmail(E2E_ADMIN_GOOGLE_EMAIL);

  if (!existing) {
    await registerUser(page, {
      email: E2E_ADMIN_GOOGLE_EMAIL,
      name: E2E_ADMIN_NAME,
      password: E2E_ADMIN_PASSWORD,
    });
    await expect(page).toHaveURL(/\/onboarding$/);
    await createFirstWorkspace(page, { name: "Admin Workspace" });
    await expect(page).toHaveURL("/dashboard");
  } else {
    await ensureSingleAdminWorkspace(existing.id);
    await signInUser(page, E2E_ADMIN_GOOGLE_EMAIL);
    await page.waitForURL(/\/(dashboard|onboarding)$/);
    if (page.url().includes("/onboarding")) {
      await createFirstWorkspace(page, { name: "Admin Workspace" });
      await expect(page).toHaveURL("/dashboard");
    }
  }

  const user = await findUserByEmail(E2E_ADMIN_GOOGLE_EMAIL);
  if (!user) {
    throw new Error("E2E admin user is missing after registration.");
  }

  await attachGoogleAccount(user.id);
  await ensureSingleAdminWorkspace(user.id);
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/dashboard");

  return { userId: user.id };
}
