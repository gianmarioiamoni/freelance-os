// src/infrastructure/persistence/viewer-access-repository.ts
import type {
  AuthorizeContractInput,
  CreateViewerAccessInput,
  TimesheetViewerAccessRecord,
  TimesheetViewerContractRecord,
} from "@/domain/persistence-types";
import type { ViewerAccessRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import {
  mapViewerAccess,
  mapViewerContract,
} from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createViewerAccessRepository(
  db: PrismaExecutor,
): ViewerAccessRepository {
  return {
    create(workspaceId: string, input: CreateViewerAccessInput) {
      return withPersistenceErrors(async () =>
        mapViewerAccess(
          await db.timesheetViewerAccess.create({
            data: {
              workspaceId,
              userId: input.userId,
              email: input.email,
              status: input.status,
            },
          }),
        ),
      );
    },

    async getById(workspaceId: string, viewerAccessId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.timesheetViewerAccess.findFirst({
          where: { id: viewerAccessId, workspaceId },
        });
        return row ? mapViewerAccess(row) : null;
      });
    },

    async findByWorkspaceAndEmail(workspaceId: string, email: string) {
      return withPersistenceErrors(async () => {
        const row = await db.timesheetViewerAccess.findFirst({
          where: { workspaceId, email: email.toLowerCase() },
          orderBy: { createdAt: "desc" },
        });
        return row ? mapViewerAccess(row) : null;
      });
    },

    async getActiveAccess(workspaceId: string, userId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.timesheetViewerAccess.findFirst({
          where: {
            workspaceId,
            userId,
            status: "ACTIVE",
          },
        });
        return row ? mapViewerAccess(row) : null;
      });
    },

    async listActiveByUserId(userId: string) {
      return withPersistenceErrors(async () => {
        const rows = await db.timesheetViewerAccess.findMany({
          where: {
            userId,
            status: "ACTIVE",
          },
          orderBy: { activatedAt: "desc" },
        });
        return rows.map(mapViewerAccess);
      });
    },

    async listForUser(userId: string, status?: "PENDING" | "ACTIVE" | "REVOKED") {
      return withPersistenceErrors(async () => {
        const rows = await db.timesheetViewerAccess.findMany({
          where: {
            userId,
            ...(status ? { status } : {}),
          },
          orderBy: { activatedAt: "desc" },
        });
        return rows.map(mapViewerAccess);
      });
    },

    async listForWorkspace(
      workspaceId: string,
      status?: "PENDING" | "ACTIVE" | "REVOKED",
    ) {
      return withPersistenceErrors(async () => {
        const rows = await db.timesheetViewerAccess.findMany({
          where: {
            workspaceId,
            ...(status ? { status } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
        return rows.map(mapViewerAccess);
      });
    },

    async activate(
      workspaceId: string,
      viewerAccessId: string,
      userId: string,
      activatedAt: Date,
    ) {
      return withPersistenceErrors(async () =>
        mapViewerAccess(
          await db.timesheetViewerAccess.update({
            where: { id: viewerAccessId },
            data: {
              userId,
              status: "ACTIVE",
              activatedAt,
            },
          }),
        ),
      );
    },

    async revoke(workspaceId: string, viewerAccessId: string) {
      return withPersistenceErrors(async () =>
        mapViewerAccess(
          await db.timesheetViewerAccess.update({
            where: { id: viewerAccessId },
            data: {
              status: "REVOKED",
              revokedAt: new Date(),
            },
          }),
        ),
      );
    },

    async delete(workspaceId: string, viewerAccessId: string) {
      return withPersistenceErrors(async () => {
        await db.timesheetViewerAccess.delete({
          where: { id: viewerAccessId, workspaceId },
        });
      });
    },

    async authorizeContract(
      workspaceId: string,
      input: AuthorizeContractInput,
    ) {
      return withPersistenceErrors(async () =>
        mapViewerContract(
          await db.timesheetViewerContract.create({
            data: {
              workspaceId,
              viewerAccessId: input.viewerAccessId,
              contractId: input.contractId,
              displayLabel: input.displayLabel ?? null,
            },
          }),
        ),
      );
    },

    async listAuthorizedContracts(
      workspaceId: string,
      viewerAccessId: string,
    ) {
      return withPersistenceErrors(async () => {
        const rows = await db.timesheetViewerContract.findMany({
          where: { workspaceId, viewerAccessId },
          orderBy: { createdAt: "asc" },
        });
        return rows.map(mapViewerContract);
      });
    },

    async revokeContractAuthorization(
      workspaceId: string,
      viewerAccessId: string,
      contractId: string,
    ) {
      return withPersistenceErrors(async () => {
        await db.timesheetViewerContract.delete({
          where: {
            viewerAccessId_contractId: {
              viewerAccessId,
              contractId,
            },
            workspaceId,
          },
        });
      });
    },
  };
}
