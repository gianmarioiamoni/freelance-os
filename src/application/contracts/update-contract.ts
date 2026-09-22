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
import type {
  ClientRepository,
  ContractRepository,
  InvoiceRepository,
} from "@/domain/repositories";

export async function updateContract(
  context: WorkspaceContext,
  contractId: string,
  input: ContractUpdateInput,
  clients: ClientRepository,
  contracts: ContractRepository,
  invoices: InvoiceRepository,
): Promise<ContractRecord> {
  const validated = parseContractUpdateInput(input);
  const existing = await contracts.getContract(context.workspaceId, contractId);

  if (!existing) {
    throw new ContractNotFoundError();
  }

  const client = await clients.getClient(context.workspaceId, existing.clientId);

  if (!client) {
    throw new ClientNotFoundError();
  }

  if (validated.currency !== existing.currency) {
    await assertContractCurrencyMutable(context, existing.id, invoices);
  }

  await assertNoOverlappingContract(
    context.workspaceId,
    existing.clientId,
    validated.validFrom,
    validated.validTo,
    contracts,
    existing.id,
  );

  try {
    return await contracts.updateContract(
      context.workspaceId,
      contractId,
      validated,
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
}
