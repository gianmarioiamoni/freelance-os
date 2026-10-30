// tests/integration/viewer-portal-auth.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { prisma } from "@/infrastructure/prisma/client";

describe("Viewer Portal Auth", () => {
  beforeEach(async () => {
    await prisma.$executeRaw`
    TRUNCATE TABLE
      "AnomalyReport",
      "TimesheetViewerContract",
      "ViewerInviteToken",
      "TimesheetViewerAccess",
      "WorkspaceMember",
      "Workspace"
    RESTART IDENTITY CASCADE
  `;
  });

  afterEach(async () => {
    await prisma.$executeRaw`
    TRUNCATE TABLE
      "AnomalyReport",
      "TimesheetViewerContract",
      "ViewerInviteToken",
      "TimesheetViewerAccess",
      "WorkspaceMember",
      "Workspace"
    RESTART IDENTITY CASCADE
  `;
  });

  it("allows a user to be both freelance and viewer simultaneously", async () => {
    const userId = "user-multi-access";
    
    // Create workspace as freelance
    const workspace = await prisma.workspace.create({
      data: {
        name: "Freelance Workspace",
        timezone: "UTC",
        currency: "USD",
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: "OWNER",
      },
    });

    // Create viewer access in different workspace
    const clientWorkspace = await prisma.workspace.create({
      data: {
        name: "Client Workspace",
        timezone: "UTC",
        currency: "EUR",
      },
    });

    const viewerAccess = await prisma.timesheetViewerAccess.create({
      data: {
        workspaceId: clientWorkspace.id,
        userId,
        email: "viewer@example.com",
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });

    const repositories = createRepositories();

    // Verify freelance membership
    const freelanceMembership = await repositories.members.getMember(
      workspace.id,
      userId,
    );
    expect(freelanceMembership).not.toBeNull();
    expect(freelanceMembership?.role).toBe("OWNER");

    // Verify viewer access
    const viewerAccessRecord = await repositories.viewerAccess.getById(
      clientWorkspace.id,
      viewerAccess.id,
    );
    expect(viewerAccessRecord).not.toBeNull();
    expect(viewerAccessRecord?.status).toBe("ACTIVE");
    expect(viewerAccessRecord?.userId).toBe(userId);

    // Verify cross-listing
    const freelanceMemberships = await repositories.members.listForUser(userId);
    expect(freelanceMemberships).toHaveLength(1);

    const viewerAccesses = await repositories.viewerAccess.listForUser(userId, "ACTIVE");
    expect(viewerAccesses).toHaveLength(1);
  });

  it("prevents viewer access to freelance routes", async () => {
    const userId = "viewer-only-user";
    const clientWorkspace = await prisma.workspace.create({
      data: {
        name: "Client Workspace",
        timezone: "UTC",
        currency: "EUR",
      },
    });

    await prisma.timesheetViewerAccess.create({
      data: {
        workspaceId: clientWorkspace.id,
        userId,
        email: "viewer-only@example.com",
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });

    const repositories = createRepositories();

    // Viewer has no freelance membership
    const freelanceMemberships = await repositories.members.listForUser(userId);
    expect(freelanceMemberships).toHaveLength(0);

    // requireWorkspaceAccess would fail for any workspace
    const membership = await repositories.members.getMember(
      clientWorkspace.id,
      userId,
    );
    expect(membership).toBeNull();
  });

  it("revokes viewer access without affecting freelance membership", async () => {
    const userId = "user-both-access";
    
    const freelanceWorkspace = await prisma.workspace.create({
      data: {
        name: "Freelance Workspace",
        timezone: "UTC",
        currency: "USD",
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: freelanceWorkspace.id,
        userId,
        role: "OWNER",
      },
    });

    const clientWorkspace = await prisma.workspace.create({
      data: {
        name: "Client Workspace",
        timezone: "UTC",
        currency: "EUR",
      },
    });

    const viewerAccess = await prisma.timesheetViewerAccess.create({
      data: {
        workspaceId: clientWorkspace.id,
        userId,
        email: "both@example.com",
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });

    const repositories = createRepositories();

    // Revoke viewer access
    await repositories.viewerAccess.revoke(clientWorkspace.id, viewerAccess.id);

    // Freelance membership still exists
    const freelanceMembership = await repositories.members.getMember(
      freelanceWorkspace.id,
      userId,
    );
    expect(freelanceMembership).not.toBeNull();

    // Viewer access is revoked
    const revokedAccess = await repositories.viewerAccess.getById(
      clientWorkspace.id,
      viewerAccess.id,
    );
    expect(revokedAccess?.status).toBe("REVOKED");
  });
});
