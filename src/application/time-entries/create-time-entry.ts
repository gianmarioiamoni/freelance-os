// src/application/time-entries/create-time-entry.ts
import type { RecordTimeEntryInput, TimeEntryRecord } from "@/domain/persistence-types";
import type { ClientRepository, ContractRepository, TimeEntryRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { validateTimeEntryInput } from "@/application/time-entries/time-entry-input";
import { validateContractForTimeEntry } from "@/application/time-entries/contract-validation";

export type CreateTimeEntryInput = {
  clientId: string;
  contractId: string;
  workDate: Date;
  durationMinutes: number;
  description?: string | null;
  billable: boolean;
};

export async function createTimeEntry(
  context: WorkspaceContext,
  input: CreateTimeEntryInput,
  clients: ClientRepository,
  contracts: ContractRepository,
  timeEntries: TimeEntryRepository,
): Promise<TimeEntryRecord> {
  // Validate input
  const recordInput: RecordTimeEntryInput = {
    userId: context.userId,
    clientId: input.clientId,
    contractId: input.contractId,
    workDate: input.workDate,
    durationMinutes: input.durationMinutes,
    description: input.description,
    billable: input.billable,
  };

  validateTimeEntryInput(recordInput);

  const contract = await validateContractForTimeEntry(
    context,
    input.clientId,
    input.contractId,
    input.workDate,
    clients,
    contracts,
  );

  return await timeEntries.recordTimeEntry(context.workspaceId, {
    ...recordInput,
    snapshotBillingModel: contract.billingModel,
    snapshotRate: contract.rate,
    snapshotCurrency: contract.currency,
  });
}