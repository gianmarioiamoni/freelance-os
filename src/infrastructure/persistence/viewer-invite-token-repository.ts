// src/infrastructure/persistence/viewer-invite-token-repository.ts
import type {
  CreateInviteTokenInput,
} from "@/domain/persistence-types";
import type { ViewerInviteTokenRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapInviteToken } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createViewerInviteTokenRepository(
  db: PrismaExecutor,
): ViewerInviteTokenRepository {
  return {
    create(workspaceId: string, input: CreateInviteTokenInput) {
      return withPersistenceErrors(async () =>
        mapInviteToken(
          await db.viewerInviteToken.create({
            data: {
              workspaceId,
              viewerAccessId: input.viewerAccessId,
              tokenHash: input.tokenHash,
              expiresAt: input.expiresAt,
            },
          }),
        ),
      );
    },

    async findByTokenHashForUpdate(tokenHash: string) {
      return withPersistenceErrors(async () => {
        // Use raw SQL for SELECT FOR UPDATE lock
        const locked = await db.$queryRaw<
          Array<{ id: string; workspaceId: string }>
        >`
          SELECT id, "workspaceId" FROM "ViewerInviteToken"
          WHERE "tokenHash" = ${tokenHash}
          FOR UPDATE
        `;

        if (locked.length === 0) {
          return null;
        }

        const row = await db.viewerInviteToken.findUnique({
          where: { id: locked[0].id },
        });

        return row ? mapInviteToken(row) : null;
      });
    },

    async markAccepted(workspaceId: string, tokenId: string, acceptedAt: Date) {
      return withPersistenceErrors(async () =>
        mapInviteToken(
          await db.viewerInviteToken.update({
            where: { id: tokenId },
            data: { acceptedAt },
          }),
        ),
      );
    },

    async invalidateAllForViewerAccess(
      workspaceId: string,
      viewerAccessId: string,
    ) {
      await withPersistenceErrors(async () => {
        await db.viewerInviteToken.updateMany({
          where: {
            workspaceId,
            viewerAccessId,
            acceptedAt: null,
          },
          data: {
            acceptedAt: new Date(), // Mark as consumed to invalidate
          },
        });
      });
    },
  };
}
