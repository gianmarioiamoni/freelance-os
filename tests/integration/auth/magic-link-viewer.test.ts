// tests/integration/auth/magic-link-viewer.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "crypto";

import { getAuthSessionFromHeaders } from "@/infrastructure/auth/session";
import {
  clearCapturedMagicLinkEmails,
  getCapturedMagicLinkEmails,
} from "@/infrastructure/email/magic-link-capture";
import {
  auth,
  prisma,
  uniqueEmail,
} from "./helpers";

describe("magic link viewer authentication", () => {
  afterEach(() => {
    clearCapturedMagicLinkEmails();
  });

  it("sends magic link for viewer activation", async () => {
    const email = uniqueEmail("viewer-activate");
    const workspaceId = crypto.randomUUID();
    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(plainToken).digest("hex");

    // Create workspace
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: "Test Workspace",
        timezone: "UTC",
        currency: "USD",
      },
    });

    // Create viewer access PENDING
    const viewerAccess = await prisma.timesheetViewerAccess.create({
      data: {
        workspaceId,
        email: email.toLowerCase(),
        status: "PENDING",
        userId: null,
      },
    });

    // Create invite token
    await prisma.viewerInviteToken.create({
      data: {
        workspaceId,
        viewerAccessId: viewerAccess.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    // Request magic link
    const response = await fetch("http://localhost:3000/api/viewer-portal/request-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        viewerInviteToken: plainToken,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    const captured = getCapturedMagicLinkEmails();
    expect(captured).toHaveLength(1);
    expect(captured[0]?.recipientEmail).toBe(email.toLowerCase());
    expect(captured[0]?.metadata?.type).toBe("viewer-activation");
    expect(captured[0]?.url).toContain("/viewer-portal/magic-callback");
  });

  it("rejects magic link request with wrong email", async () => {
    const email = uniqueEmail("viewer-wrong");
    const wrongEmail = uniqueEmail("viewer-wrong-other");
    const workspaceId = crypto.randomUUID();
    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(plainToken).digest("hex");

    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: "Test Workspace",
        timezone: "UTC",
        currency: "USD",
      },
    });

    const viewerAccess = await prisma.timesheetViewerAccess.create({
      data: {
        workspaceId,
        email: email.toLowerCase(),
        status: "PENDING",
        userId: null,
      },
    });

    await prisma.viewerInviteToken.create({
      data: {
        workspaceId,
        viewerAccessId: viewerAccess.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const response = await fetch("http://localhost:3000/api/viewer-portal/request-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: wrongEmail,
        viewerInviteToken: plainToken,
      }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Email does not match");

    const captured = getCapturedMagicLinkEmails();
    expect(captured).toHaveLength(0);
  });

  it("sends magic link for viewer login", async () => {
    const email = uniqueEmail("viewer-login");

    const response = await fetch("http://localhost:3000/api/viewer-portal/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    const captured = getCapturedMagicLinkEmails();
    expect(captured).toHaveLength(1);
    expect(captured[0]?.recipientEmail).toBe(email.toLowerCase());
    expect(captured[0]?.metadata?.type).toBe("viewer-login");
    expect(captured[0]?.url).toContain("/viewer-access-selector");
  });
});
