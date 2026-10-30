// src/application/timesheet-viewer/invite-viewer.ts
import {
  parseInviteViewerInput,
  type InviteViewerInput,
} from "@/application/timesheet-viewer/viewer-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  TimesheetViewerAccessRecord,
  ViewerInviteTokenRecord,
} from "@/domain/persistence-types";
import type { PersistenceRepositories } from "@/domain/repositories";
import { createHash, randomBytes } from "crypto";

export type InviteViewerResult = {
  viewerAccess: TimesheetViewerAccessRecord;
  token: ViewerInviteTokenRecord;
  plainToken: string; // To be sent via email (NOT stored)
};

export async function inviteViewer(
  context: WorkspaceContext,
  input: InviteViewerInput,
  repositories: PersistenceRepositories,
): Promise<InviteViewerResult> {
  const validated = parseInviteViewerInput(input);

  // Generate cryptographically random token (32 bytes = 256 bits)
  const plainToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(plainToken).digest("hex");

  const expiresAt = new Date(
    Date.now() + validated.tokenExpiryHours * 60 * 60 * 1000,
  );

  const viewerAccess = await repositories.viewerAccess.create(
    context.workspaceId,
    {
      userId: null,
      email: validated.email,
      status: "PENDING",
    },
  );

  const token = await repositories.viewerTokens.create(context.workspaceId, {
    viewerAccessId: viewerAccess.id,
    tokenHash,
    expiresAt,
  });

  // TODO: Integration point for email service
  // await emailService.sendViewerInvite({
  //   to: validated.email,
  //   token: plainToken,
  //   workspaceName: context.workspaceName,
  //   expiresAt,
  // });

  return {
    viewerAccess,
    token,
    plainToken, // Caller must send via email and NOT persist this
  };
}
