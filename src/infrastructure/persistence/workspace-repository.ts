// src/infrastructure/persistence/workspace-repository.ts
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  PutWorkspaceSettingsInput,
  UpdateWorkspaceInput,
} from "@/domain/persistence-types";
import type {
  WorkspaceMemberRepository,
  WorkspaceRepository,
  WorkspaceSettingsRepository,
} from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import {
  mapWorkspace,
  mapWorkspaceMember,
  mapWorkspaceSettings,
} from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createWorkspaceRepository(db: PrismaExecutor): WorkspaceRepository {
  return {
    createWorkspace(input: CreateWorkspaceInput) {
      return withPersistenceErrors(async () =>
        mapWorkspace(
          await db.workspace.create({
            data: {
              name: input.name,
              timezone: input.timezone,
              currency: input.currency,
            },
          }),
        ),
      );
    },

    async getWorkspaceById(workspaceId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.workspace.findUnique({
          where: { id: workspaceId },
        });
        return row ? mapWorkspace(row) : null;
      });
    },

    updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
      return withPersistenceErrors(async () => {
        const result = await db.workspace.updateMany({
          where: { id: workspaceId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
            ...(input.currency !== undefined ? { currency: input.currency } : {}),
          },
        });

        if (result.count === 0) {
          throw new RecordNotFoundError("Workspace", workspaceId);
        }

        const row = await db.workspace.findUnique({
          where: { id: workspaceId },
        });

        if (!row) {
          throw new RecordNotFoundError("Workspace", workspaceId);
        }

        return mapWorkspace(row);
      });
    },
  };
}

export function createWorkspaceMemberRepository(
  db: PrismaExecutor,
): WorkspaceMemberRepository {
  return {
    addMember(input: AddWorkspaceMemberInput) {
      return withPersistenceErrors(async () =>
        mapWorkspaceMember(
          await db.workspaceMember.create({
            data: {
              workspaceId: input.workspaceId,
              userId: input.userId,
              role: input.role,
            },
          }),
        ),
      );
    },

    async getMember(workspaceId: string, userId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId },
          },
        });
        return row ? mapWorkspaceMember(row) : null;
      });
    },

    listMembers(workspaceId: string) {
      return withPersistenceErrors(async () => {
        const rows = await db.workspaceMember.findMany({
          where: { workspaceId },
          orderBy: { createdAt: "asc" },
        });
        return rows.map(mapWorkspaceMember);
      });
    },
  };
}

export function createWorkspaceSettingsRepository(
  db: PrismaExecutor,
): WorkspaceSettingsRepository {
  return {
    async getSettings(workspaceId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.workspaceSettings.findUnique({
          where: { workspaceId },
        });
        return row ? mapWorkspaceSettings(row) : null;
      });
    },

    putSettings(workspaceId: string, input: PutWorkspaceSettingsInput) {
      return withPersistenceErrors(async () =>
        mapWorkspaceSettings(
          await db.workspaceSettings.upsert({
            where: { workspaceId },
            create: {
              workspaceId,
              timezone: input.timezone,
              currency: input.currency,
              contractWarningPercent: input.contractWarningPercent,
              monthlyCapacityWarningPercent: input.monthlyCapacityWarningPercent,
            },
            update: {
              timezone: input.timezone,
              currency: input.currency,
              contractWarningPercent: input.contractWarningPercent,
              monthlyCapacityWarningPercent: input.monthlyCapacityWarningPercent,
            },
          }),
        ),
      );
    },
  };
}
