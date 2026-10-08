// src/application/contracts/update-contract.ts
import { assertContractCurrencyMutable } from "@/application/contracts/assert-contract-currency-mutable";
import { assertNoOverlappingContract } from "@/application/contracts/assert-no-overlap";
import {
  parseContractUpdateInput,
  type ContractUpdateInput,
} from "@/application/contracts/contract-input";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import {
  ContractNotFoundError,
  OverlappingContractError,
} from "@/domain/contract-errors";
import {
  ConstraintViolationError,
  RecordNotFoundError,
} from "@/domain/persistence-errors";
import type { ContractRecord } from "@/domain/persistence-types";
import type { RunInTransaction } from "@/domain/repositories";

export async function updateContract(
  context: WorkspaceContext,
  contractId: string,
  input: ContractUpdateInput,
  runInTransaction: RunInTransaction,
): Promise<ContractRecord> {
  return runInTransaction(async (repositories) => {
    const existing = await repositories.contracts.lockContract(
      context.workspaceId,
      contractId,
    );

    if (!existing) {
      throw new ContractNotFoundError();
    }

    // Parse and validate input - commitment is recalculated from new input
    const validated = parseContractUpdateInput(input);

    const client = await repositories.clients.getClient(
      context.workspaceId,
      existing.clientId,
    );

    if (!client) {
      throw new ClientNotFoundError();
    }

    if (validated.currency !== existing.currency) {
      await assertContractCurrencyMutable(
        context,
        existing.id,
        repositories.invoices,
      );
    }

    await assertNoOverlappingContract(
      context.workspaceId,
      existing.clientId,
      validated.validFrom,
      validated.validTo,
      repositories.contracts,
      existing.id,
    );

    try {
      return await repositories.contracts.updateContract(
        context.workspaceId,
        contractId,
        {
          validFrom: validated.validFrom,
          validTo: validated.validTo,
          billingModel: validated.billingModel,
          rate: validated.rate,
          currency: validated.currency,
          commitmentMode: validated.commitmentMode,
          commitmentPercentage: validated.commitmentPercentage,
          allocatedMinutes: validated.allocatedMinutes,
          paymentTermsDays: validated.paymentTermsDays,
          paymentTermsNote: validated.paymentTermsNote,
        },
      );
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        throw new ContractNotFoundError();
      }

      if (error instanceof ConstraintViolationError) {
        throw new OverlappingContractError();
      }

      throw error;
    }
  });
}
