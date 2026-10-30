// src/application/timesheet-viewer/activate-viewer.ts
import type {
  TimesheetViewerAccessRecord,
  ViewerInviteTokenRecord,
} from "@/domain/persistence-types";
import type { PersistenceRepositories } from "@/domain/repositories";
import {
  InvalidViewerStatusTransitionError,
  ViewerAccessNotFoundError,
  ViewerTokenAlreadyAcceptedError,
  ViewerTokenExpiredError,
  ViewerTokenNotFoundError,
} from "@/domain/viewer-errors";
import { createHash } from "crypto";

export type ActivateViewerInput = {
  plainToken: string;
  userId: string; // From authenticated session
};

export type ActivateViewerResult = {
  viewerAccess: TimesheetViewerAccessRecord;
  token: ViewerInviteTokenRecord;
};

export async function activateViewer(
  input: ActivateViewerInput,
  dependencies: {
    runInTransaction: <T>(
      work: (repositories: PersistenceRepositories) => Promise<T>,
    ) => Promise<T>;
  },
): Promise<ActivateViewerResult> {
  const tokenHash = createHash("sha256").update(input.plainToken).digest("hex");

  return dependencies.runInTransaction(async (repositories) => {
    // Lock token row for update
    const token =
      await repositories.viewerTokens.findByTokenHashForUpdate(tokenHash);

    if (!token) {
      throw new ViewerTokenNotFoundError();
    }

    if (token.acceptedAt !== null) {
      throw new ViewerTokenAlreadyAcceptedError();
    }

    const now = new Date();
    if (token.expiresAt < now) {
      throw new ViewerTokenExpiredError();
    }

    const viewerAccess = await repositories.viewerAccess.getById(
      token.workspaceId,
      token.viewerAccessId,
    );

    if (!viewerAccess) {
      throw new ViewerAccessNotFoundError();
    }

    if (viewerAccess.status !== "PENDING") {
      throw new InvalidViewerStatusTransitionError(
        viewerAccess.status,
        "ACTIVE",
      );
    }

    // Mark token as accepted
    const acceptedToken = await repositories.viewerTokens.markAccepted(
      token.workspaceId,
      token.id,
      now,
    );

    // Activate viewer access
    const activatedAccess = await repositories.viewerAccess.activate(
      token.workspaceId,
      token.viewerAccessId,
      input.userId,
      now,
    );

    return {
      viewerAccess: activatedAccess,
      token: acceptedToken,
    };
  });
}
