// src/features/time-entries/attach-time-entry-details.ts
import type {
  ClientRecord,
  ContractRecord,
  TimeEntryRecord,
} from "@/domain/persistence-types";

export type TimeEntryWithDetails = TimeEntryRecord & {
  client: ClientRecord;
  contract: ContractRecord;
};

/**
 * Joins historical TimeEntry rows to workspace clients/contracts.
 * Archived clients remain visible; missing join targets are dropped (fail-closed).
 */
export function attachTimeEntryDetails(
  entries: TimeEntryRecord[],
  clients: ClientRecord[],
  contracts: ContractRecord[],
): TimeEntryWithDetails[] {
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const contractsById = new Map(
    contracts.map((contract) => [contract.id, contract]),
  );

  return entries.flatMap((entry) => {
    const client = clientsById.get(entry.clientId);
    const contract = contractsById.get(entry.contractId);
    if (!client || !contract) {
      return [];
    }
    return [{ ...entry, client, contract }];
  });
}

/**
 * Clients that may be selected when creating a new TimeEntry.
 */
export function clientsSelectableForCreate(
  clients: ClientRecord[],
): ClientRecord[] {
  return clients.filter((client) => client.status === "ACTIVE");
}
