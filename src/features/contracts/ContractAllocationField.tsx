// src/features/contracts/ContractAllocationField.tsx
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/ui/input";
import type { JSX } from "react";

type ContractAllocationFieldProps = {
  value: string;
  error?: string;
  isPending: boolean;
};

export function ContractAllocationField({
  value,
  error,
  isPending,
}: ContractAllocationFieldProps): JSX.Element {
  return (
    <Field
      label="Allocated minutes"
      htmlFor="allocatedMinutes"
      hint="Optional total time budget for this contract, in minutes. Leave empty for no allocation. 0 is allowed."
      error={error}
    >
      <Input
        name="allocatedMinutes"
        type="text"
        inputMode="numeric"
        defaultValue={value}
        disabled={isPending}
      />
    </Field>
  );
}
