// src/application/timesheet-viewer/invite-viewer.ts
import {
  parseInviteViewerInput,
  type InviteViewerInput,
} from "@/application/timesheet-viewer/viewer-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  TimesheetViewerAccessRecord,
  TimesheetViewerContractRecord,
  ViewerInviteTokenRecord,
} from "@/domain/persistence-types";
import type { PersistenceRepositories } from "@/domain/repositories";
import { deliverProductionViewerInviteEmail } from "@/infrastructure/email/resend-viewer-invite";
import { createHash, randomBytes } from "crypto";

export type InviteViewerResult = {
  viewerAccess: TimesheetViewerAccessRecord;
  authorizedContracts: TimesheetViewerContractRecord[];
  token: ViewerInviteTokenRecord;
  plainToken: string; // To be sent via email (NOT stored)
  emailDelivered: "sent" | "skipped";
};

export async function inviteViewer(
  context: WorkspaceContext,
  input: InviteViewerInput,
  repositories: PersistenceRepositories,
): Promise<InviteViewerResult> {
  const validated = parseInviteViewerInput(input);

  // Verify all contracts exist
  for (const contractId of validated.contractIds) {
    const contract = await repositories.contracts.getContract(
      context.workspaceId,
      contractId,
    );
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }
  }

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

  // Authorize contracts atomically
  const authorizedContracts: TimesheetViewerContractRecord[] = [];
  for (const contractId of validated.contractIds) {
    const authorized = await repositories.viewerAccess.authorizeContract(
      context.workspaceId,
      {
        viewerAccessId: viewerAccess.id,
        contractId,
        displayLabel: null,
      },
    );
    authorizedContracts.push(authorized);
  }

  const token = await repositories.viewerTokens.create(context.workspaceId, {
    viewerAccessId: viewerAccess.id,
    tokenHash,
    expiresAt,
  });

  // Generate invitation URL
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/viewer-activate?token=${plainToken}`;

  // Send invitation email via Resend
  const emailDelivered = await deliverProductionViewerInviteEmail({
    email: validated.email,
    inviteUrl,
    workspaceName: undefined, // TODO: Add workspace name to context if needed
    expiresAt,
  });

  return {
    viewerAccess,
    authorizedContracts,
    token,
    plainToken, // Caller must send via email and NOT persist this
    emailDelivered,
  };
}
