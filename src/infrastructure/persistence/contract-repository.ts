// src/infrastructure/persistence/contract-repository.ts
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type {
  CreateContractInput,
  UpdateContractInput,
} from "@/domain/persistence-types";
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

    async lockContract(workspaceId: string, contractId: string) {
      return withPersistenceErrors(async () => {
        const locked = await db.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Contract"
          WHERE id = ${contractId}::uuid
            AND "workspaceId" = ${workspaceId}::uuid
          FOR UPDATE
        `;

        if (locked.length === 0) {
          return null;
        }

        const row = await db.contract.findFirst({
          where: { id: contractId, workspaceId },
        });
        return row ? mapContract(row) : null;
      });
    },

    listContracts(workspaceId: string) {
      return withPersistenceErrors(async () => {
        const rows = await db.contract.findMany({
          where: { workspaceId },
          orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }],
        });
        return rows.map(mapContract);
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

    updateContract(
      workspaceId: string,
      contractId: string,
      input: UpdateContractInput,
    ) {
      return withPersistenceErrors(async () => {
        const result = await db.contract.updateMany({
          where: { id: contractId, workspaceId },
          data: {
            validFrom: input.validFrom,
            validTo: input.validTo ?? null,
            billingModel: input.billingModel,
            rate: input.rate,
            currency: input.currency,
            monthlyContractedMinutes: input.monthlyContractedMinutes ?? null,
            paymentTermsDays: input.paymentTermsDays ?? null,
            paymentTermsNote: input.paymentTermsNote ?? null,
          },
        });

        if (result.count === 0) {
          throw new RecordNotFoundError("Contract", contractId);
        }

        const row = await db.contract.findFirst({
          where: { id: contractId, workspaceId },
        });

        if (!row) {
          throw new RecordNotFoundError("Contract", contractId);
        }

        return mapContract(row);
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
