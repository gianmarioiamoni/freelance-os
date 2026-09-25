// src/features/reporting/report-filter-options.ts
import { formatValidityInterval } from "@/features/contracts/contract-display";

export type ReportFilterOption = {
  id: string;
  label: string;
};

export function toReportFilterOptions(
  clients: readonly { id: string; companyName: string }[],
  contracts: readonly {
    id: string;
    clientId: string;
    validFrom: Date;
    validTo: Date | null;
  }[],
): { clients: ReportFilterOption[]; contracts: ReportFilterOption[] } {
  const clientNameById = new Map(
    clients.map((client) => [client.id, client.companyName]),
  );

  return {
    clients: clients.map((client) => ({
      id: client.id,
      label: client.companyName,
    })),
    contracts: contracts.map((contract) => ({
      id: contract.id,
      label: `${clientNameById.get(contract.clientId) ?? "Client unavailable"} · ${formatValidityInterval(contract.validFrom, contract.validTo)}`,
    })),
  };
}
