// src/infrastructure/persistence/client-repository.ts
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type { ClientStatus, CreateClientInput } from "@/domain/persistence-types";
import type { ClientRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapClient } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createClientRepository(db: PrismaExecutor): ClientRepository {
  return {
    createClient(workspaceId: string, input: CreateClientInput) {
      return withPersistenceErrors(async () =>
        mapClient(
          await db.client.create({
            data: {
              workspaceId,
              companyName: input.companyName,
              vatNumber: input.vatNumber ?? null,
              taxCode: input.taxCode ?? null,
              address: input.address ?? null,
              contactName: input.contactName ?? null,
              email: input.email ?? null,
              phone: input.phone ?? null,
              notes: input.notes ?? null,
              status: input.status ?? "ACTIVE",
            },
          }),
        ),
      );
    },

    async getClient(workspaceId: string, clientId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.client.findFirst({
          where: { id: clientId, workspaceId },
        });
        return row ? mapClient(row) : null;
      });
    },

    listClients(workspaceId: string, status?: ClientStatus) {
      return withPersistenceErrors(async () => {
        const rows = await db.client.findMany({
          where: {
            workspaceId,
            ...(status ? { status } : {}),
          },
          orderBy: { companyName: "asc" },
        });
        return rows.map(mapClient);
      });
    },

    archiveClient(workspaceId: string, clientId: string) {
      return withPersistenceErrors(async () => {
        const result = await db.client.updateMany({
          where: { id: clientId, workspaceId },
          data: { status: "ARCHIVED" },
        });

        if (result.count === 0) {
          throw new RecordNotFoundError("Client", clientId);
        }

        const row = await db.client.findFirst({
          where: { id: clientId, workspaceId },
        });

        if (!row) {
          throw new RecordNotFoundError("Client", clientId);
        }

        return mapClient(row);
      });
    },
  };
}
