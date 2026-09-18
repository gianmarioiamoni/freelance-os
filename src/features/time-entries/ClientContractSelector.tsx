// src/features/time-entries/ClientContractSelector.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { formatBillingModel } from "@/features/contracts/contract-display";
import type { ClientRecord, ContractRecord } from "@/domain/persistence-types";
import { useState, useMemo, type JSX } from "react";

type ClientContractSelectorProps = {
  clients: ClientRecord[];
  contracts: ContractRecord[];
  selectedClientId?: string;
  selectedContractId?: string;
  workDate?: string;
  clientError?: string;
  contractError?: string;
  disabled?: boolean;
  isEdit?: boolean; // When true, shows readonly display instead of selectors
  clientName?: string; // For readonly display
  contractDescription?: string; // For readonly display
};

const SELECT_CLASS_NAME = "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1";

export function ClientContractSelector({
  clients,
  contracts,
  selectedClientId = "",
  selectedContractId = "",
  workDate,
  clientError,
  contractError,
  disabled = false,
  isEdit = false,
  clientName,
  contractDescription,
}: ClientContractSelectorProps): JSX.Element {
  const [clientId, setClientId] = useState(selectedClientId);
  
  // Filter contracts for the selected client and work date
  const eligibleContracts = useMemo(() => {
    if (!clientId || !workDate) return [];
    
    const clientContracts = contracts.filter(contract => contract.clientId === clientId);
    
    // Filter by work date validity
    if (workDate) {
      const workDateTime = new Date(workDate + "T00:00:00.000Z");
      return clientContracts.filter(contract => {
        const validFrom = new Date(contract.validFrom);
        const validTo = contract.validTo ? new Date(contract.validTo) : null;
        
        return workDateTime >= validFrom && (!validTo || workDateTime < validTo);
      });
    }
    
    return clientContracts;
  }, [clientId, contracts, workDate]);

  if (isEdit) {
    return (
      <>
        <Field label="Client" htmlFor="client-readonly">
          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
            {clientName || "Unknown Client"}
          </div>
        </Field>
        <Field label="Contract" htmlFor="contract-readonly">
          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
            {contractDescription || "Unknown Contract"}
          </div>
        </Field>
      </>
    );
  }

  return (
    <>
      <Field label="Client" htmlFor="clientId" error={clientError}>
        <select
          id="clientId"
          name="clientId"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
          disabled={disabled}
          className={SELECT_CLASS_NAME}
        >
          <option value="" disabled>
            Select a client
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Contract" htmlFor="contractId" error={contractError}>
        <select
          id="contractId"
          name="contractId"
          defaultValue={selectedContractId}
          required
          disabled={disabled || !clientId}
          className={SELECT_CLASS_NAME}
        >
          <option value="" disabled>
            {!clientId ? "Select a client first" : "Select a contract"}
          </option>
          {eligibleContracts.map((contract) => {
            const rate = parseFloat(contract.rate.toString());
            const formattedRate = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: contract.currency,
            }).format(rate);
            
            return (
              <option key={contract.id} value={contract.id}>
                {formatBillingModel(contract.billingModel)} · {formattedRate} · {new Date(contract.validFrom).toLocaleDateString()} to {contract.validTo ? new Date(contract.validTo).toLocaleDateString() : "ongoing"}
              </option>
            );
          })}
        </select>
      </Field>
    </>
  );
}