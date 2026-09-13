// src/features/contracts/ContractClientField.tsx
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/ui/input";
import { CONTRACT_SELECT_CLASS_NAME } from "@/features/contracts/contract-form-controls";
import type { JSX } from "react";

type ContractClientFieldProps = {
  clientName?: string;
  lockedClient?: { id: string; companyName: string };
  clients: Array<{ id: string; companyName: string }>;
  clientId: string;
  error?: string;
  isPending: boolean;
};

export function ContractClientField({
  clientName,
  lockedClient,
  clients,
  clientId,
  error,
  isPending,
}: ContractClientFieldProps): JSX.Element {
  if (clientName) {
    return (
      <Field label="Client" htmlFor="clientName">
        <Input value={clientName} disabled readOnly />
      </Field>
    );
  }

  if (lockedClient) {
    return (
      <>
        <input type="hidden" name="clientId" value={lockedClient.id} />
        <Field label="Client" htmlFor="clientName" error={error}>
          <Input value={lockedClient.companyName} disabled readOnly />
        </Field>
      </>
    );
  }

  return (
    <Field label="Client" htmlFor="clientId" error={error}>
      <select
        name="clientId"
        required
        defaultValue={clientId}
        disabled={isPending}
        className={CONTRACT_SELECT_CLASS_NAME}
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
  );
}
