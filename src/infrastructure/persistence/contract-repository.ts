// src/infrastructure/persistence/contract-repository.ts
import type { CreateContractInput } from "@/domain/persistence-types";
import type { ContractRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapContract } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createContractRepository(db: PrismaExecutor): ContractRepository {
  return {
    createContract(workspaceId: string, input: CreateContractInput) {
      return withPersistenceErrors(async () =>
        mapContract(
          await db.contract.create({
            data: {
              workspaceId,
              clientId: input.clientId,
              validFrom: input.validFrom,
              validTo: input.validTo ?? null,
              billingModel: input.billingModel,
              rate: input.rate,
              currency: input.currency,
              monthlyContractedMinutes: input.monthlyContractedMinutes ?? null,
              paymentTermsDays: input.paymentTermsDays ?? null,
              paymentTermsNote: input.paymentTermsNote ?? null,
            },
          }),
        ),
      );
    },

    async getContract(workspaceId: string, contractId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.contract.findFirst({
          where: { id: contractId, workspaceId },
        });
        return row ? mapContract(row) : null;
      });
    },

    listContractsForClient(workspaceId: string, clientId: string) {
      return withPersistenceErrors(async () => {
        const rows = await db.contract.findMany({
          where: { workspaceId, clientId },
          orderBy: { validFrom: "asc" },
        });
        return rows.map(mapContract);
      });
    },

    async findContractCoveringDate(workspaceId: string, clientId: string, date: Date) {
      return withPersistenceErrors(async () => {
        const row = await db.contract.findFirst({
          where: {
            workspaceId,
            clientId,
            validFrom: { lte: date },
            OR: [{ validTo: null }, { validTo: { gt: date } }],
          },
        });
        return row ? mapContract(row) : null;
      });
    },
  };
}
